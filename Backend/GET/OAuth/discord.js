const customerSchema = require("../../../Database/Schemas/customerSchema");
const config = require("../../../Core/Settings/config");
const fs = require("node:fs");
const DiscordOAuth2 = require('discord-oauth2');
const blackGuilds = JSON.parse(fs.readFileSync("./Core/Settings/blackGuilds.json", "utf-8"));
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { genJwtToken } = require("../../../Core/Functions/functions");

module.exports = {
    name: "discord",
    async execute(req, res, mongoData, ip) {

        try {

            const callback = `${req.headers.host == "localhost" ? "http" : "https"}://${req.headers.host}/oauth/discord`;

            const oauth = new DiscordOAuth2({
                clientId: config.bot.clientID,
                clientSecret: config.bot.secret,
                redirectUri: callback
            });

            const { code } = req.query;

            if (!req.session?.auth) {

                if (!code) return res.redirect(`https://discord.com/oauth2/authorize?client_id=1234862586567196683&response_type=code&redirect_uri=${callback}&scope=identify+guilds`);

                const token = await oauth.tokenRequest({
                    code,
                    scope: "identify guilds",
                    grantType: "authorization_code",
                    clientId: config.bot.clientID,
                    clientSecret: config.bot.secret,
                });

                const user = await oauth.getUser(token.access_token);

                const data = await customerSchema.findOne({ "Discord.ID": user?.id });
                if (!user || !data) {

                    const json = { Auth: null, type: "discordgiris", data: { success: false, message: "Bu hesap kayıtlı değil." } };
                    const token = genJwtToken(json);
                    return res.redirect(`/dogrula?token=${token}`);

                };

                if (data.Discord.Black) {

                    const json = { Auth: user.id, type: "discordgiris", data: { success: false, message: "Bu hesap yasaklı." } };
                    const token = genJwtToken(json);
                    return res.redirect(`/dogrula?token=${token}`);

                };

                data.LastLogin.push({ platform: req.useragent.platform, os: req.useragent.os, ip: ip, date: Date.now(), useragent: req.useragent.source });
                data.markModified("LastLogin");
                await data.save();

                req.session.auth = data.Auth;
                req.session.giris = true;
                req.session.admin = config.owners.includes(data.Auth) ? true : false;
                req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000;
                await req.session.save();

            } else if (req.session?.auth) {

                if (mongoData.Discord.ID || mongoData.Discord.Black) return res.redirect("/404");
                if (!code) return res.redirect(`https://discord.com/oauth2/authorize?client_id=1234862586567196683&response_type=code&redirect_uri=${callback}&scope=identify+guilds+email`);

                const token = await oauth.tokenRequest({
                    code,
                    scope: "identify email guilds",
                    grantType: "authorization_code",
                    clientId: config.bot.clientID,
                    clientSecret: config.bot.secret,
                });
    
                const user = await oauth.getUser(token.access_token);
                if (!user || !user.verified) {

                    const json = { Auth: mongoData.Auth, type: "discordkayit", data: { success: false, message: "Hesabınız doğrulanmamış." } };
                    const token = genJwtToken(json);
                    return res.redirect(`/dogrula?token=${token}`);

                };

                const data = await customerSchema.findOne({ "Discord.ID": user.id });
                if (data) {

                    const json = { Auth: mongoData.Auth, type: "discordkayit", data: { success: false, message: `${user.username} Hesabı zaten farklı bir Auth'da kayıtlı.` } };
                    const token = genJwtToken(json);
                    return res.redirect(`/dogrula?token=${token}`);

                };

                const guildsData = await oauth.getUserGuilds(token.access_token);

                if (!guildsData.find(x => x.id === config.guildID)) {

                    const json = { Auth: mongoData.Auth, type: "discordkayit", data: { success: false, message: "Sunucumuza katılmadınız. discord.gg/perlaservis" } };
                    const token = genJwtToken(json);
                    return res.redirect(`/dogrula?token=${token}`);

                };

                let i = 0;
                const blackList = [];
                await Promise.all(guildsData.map(async (guild) => {
                    if (blackGuilds.includes(guild.id)) blackList.push(`${i + 1}. ${guild.name} (${s.desc}) ${guild?.vanityURLCode ? `- https://discord.gg/${guild.vanityURLCode}` : ""}`);
                    i++;
                }));

                if (blackList.length > 0) {

                    const json = { Auth: req.session.auth, type: "discordkayit", data: { success: false, message: "Karaliste'de bulunun sunuculara katılmışsınız." } };
                    const token = genJwtToken(json);

                    mongoData.Discord = {
                        ID: user.id,
                        Email: user.email,
                        AccessToken: token.access_token,
                        RefreshToken: token.refresh_token,
                        Booster: false,
                        Black: true
                    };
                    mongoData.markModified("Discord");
                    await mongoData.save();

                    return res.redirect(`/dogrula?token=${token}`);

                };

                if (mongoData.sorgular.length > 0) {

                    await fetch(`https://discord.com/api/guilds/${config.guildID}/members/${user.id}/roles/${config.roleID}`, {
                        method: 'PUT',
                        headers: {
                            Authorization: `Bot ${config.bot.token}`
                        }
                    });
    
                };

                mongoData.Discord = {
                    ID: user.id,
                    Email: user.email,
                    AccessToken: token.access_token,
                    RefreshToken: token.refresh_token,
                    Booster: false,
                    Black: false
                };
                mongoData.markModified("Discord");
                await mongoData.save();

                const json = { Auth: mongoData.Auth, type: "discordkayit", data: { success: true, message: "Hesabınız başarıyla kaydedildi." } };
                const tokenJwt = genJwtToken(json);
                return res.redirect(`/dogrula?token=${tokenJwt}`);

            };

            return res.redirect("/anasayfa");

        } catch (err) {
            console.log(err);
            return res.redirect("/404");
        }

    }
};