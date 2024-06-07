const customerSchema = require("../../Database/Schemas/customerSchema");
const config = require("../../Core/Settings/config");
const path = require('node:path');
const speakeasy = require('speakeasy');
const { verify } = require("hcaptcha");
const { sendMail, genJwtToken } = require("../../Core/Functions/functions");

module.exports = {
    name: "giris",
    async execute(req, res, v, ip) {

        try {

            const { auth, password, factor, 'h-captcha-response': hCaptchaResponse, hatirlat } = req.body;

            if (!factor && auth && password) {

                const verified = await verify(config.hcaptcha.secret, hCaptchaResponse);
                if (!verified.success) return res.render(`../Pages/${this.name}.ejs`, { mesaj: "Captcha yanlış." })

                const mongoData = await customerSchema.findOne({ Auth: auth, Password: password }) || await customerSchema.findOne({ Email: auth, Password: password });
                if (!mongoData) return res.render(`../Pages/${this.name}.ejs`, { mesaj: "Auth veya Şifre yanlış." });

                req.session.auth = mongoData.Auth;
                req.session.giris = mongoData.TwoFactor.active ? false : true;//mongoData.TwoFactor.active || mongoData?.Email && !mongoData.LastLogin.find(x => x.ip === ip) ? false : true;

                if (hatirlat) req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000;
                if (req.session.giris) {

                    req.session.admin = config.owners.includes(mongoData.Auth) ? true : false;

                    mongoData.LastLogin.push({ platform: req.useragent.platform, os: req.useragent.os, ip: ip, date: Date.now(), useragent: req.useragent.source });
                    await mongoData.save();

                } else if (!req.session.giris) {

                    if (mongoData.TwoFactor.active) return res.render(`../Pages/${this.name}.ejs`, { factor: true });

                    const json = { Auth: auth, type: "giris", data: { platform: req.useragent.platform, os: req.useragent.os, ip: ip, date: Date.now(), useragent: req.useragent.source } };
                    const mail = await sendMail(mongoData.Email, genJwtToken(json), json, "dogrula", req.headers.host, { ip, location: `${req.headers['cf-ipcity']}, ${req.headers['cf-ipcountry']}` });
                    if (mail) {
        
                        return res.render(`../Pages/${this.name}.ejs`, { mesaj: "Yeni giriş konumu algılandı, lütfen e-postanızı kontrol edin." });
        
                    } else return res.render(`../Pages/${this.name}.ejs`, { mesaj: "Mail gönderilemedi." });

                };

            } else if (factor && !auth && req.session?.auth) {

                const mongoData = await customerSchema.findOne({ Auth: req.session.auth });
                if (!mongoData) return res.render(`../Pages/${this.name}.ejs`, { mesaj: "Auth veya Şifre yanlış." });

                const verified = speakeasy.totp.verify({ secret: mongoData.TwoFactor.secret, encoding: 'base32', token: factor });
                req.session.giris = verified;
                req.session.admin = config.owners.includes(mongoData.Auth) ? true : false;

                if (req.session.giris) mongoData.LastLogin.push({ platform: req.useragent.platform, os: req.useragent.os, ip: ip, date: Date.now(), useragent: req.useragent.source });
                if (!req.session.giris) return res.render(`../Pages/${this.name}.ejs`, { mesaj: "2FA kodu yanlış.", factor: true });

                await mongoData.save();

            } else return res.render(`../Pages/${this.name}.ejs`);

            return res.redirect("/anasayfa");

        } catch (err) {
            console.log(err);
        }

    }
};