const express = require('express');
const session = require('express-session');
const useragent = require('express-useragent');
const app = express();
const path = require('node:path');
const fs = require('node:fs');
const stuffs = require('stuffs');
const bodyParser = require('body-parser');
const favicon = require('serve-favicon');
const config = require('./Core/Settings/config');
const customerSchema = require("./Database/Schemas/customerSchema");
const momenttz = require("moment-timezone");
const { CronJob } = require("cron");
require('./Database/connect');

const { Client, Partials } = require("discord.js");
const client = global.client = new Client({
    intents: [3276799],
    partials: [Partials.User, Partials.Channel]
});
client.login(config.bot.token);

const dailyCheck = new CronJob("0 0 * * *", async () => {

    try {

        if (momenttz.tz('Europe/Istanbul').date() == 1) {

            const allData = await customerSchema.find();
            await Promise.all(allData.map(async (data) => {

                if (data.RefInfo.Auths.length > 0) {

                    data.RefInfo.Auths.map(x => x.limit = 0);
                    data.markModified('RefInfo.Auths');
                    await data.save();

                };

            }));

        };

    } catch (err) {
        console.log(err)
    }

});
dailyCheck.start();

app.use("/assets", express.static(path.join(__dirname, '/assets')));
app.use(bodyParser.json(), bodyParser.urlencoded({ extended: true }), session({ secret: stuffs.randomString(24), resave: true, saveUninitialized: false, rolling: true, name: 'perla', cookie: { maxAge: 20 * 60000 } }), favicon(path.join(__dirname, 'assets/images/favicon.ico')), useragent.express());
app.set('view engine', 'ejs');
app.set("json spaces", 2);

const girisKontrol = (req, res, next) => {
    const url = req.url.split("?")[0];

    if (req.session?.giris && req.session?.admin) {
        return next();
    };

    if (!req.session?.giris && !["/giris", "/kayit", "/sifreunuttum", "/kurallar", "/dogrula", "/oauth/discord"].includes(url)) {
        return res.redirect('/giris');
    };

    if (req.session?.giris && ["/giris", "/kayit", "/sifreunuttum"].includes(url)) {
        return res.redirect('/anasayfa');
    };

    if (url.includes("admin")) {
        if (!req.session?.admin) return res.redirect("/anasayfa");
    };

    return next();
};

app.all("/:page", girisKontrol, async (req, res, next) => {

    try {

        const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip;

        const { page } = req.params;
        console.log(`Sayfa: ${req.method} ${req.url} - Auth: ${req?.session?.auth} - IP: ${ip}`);
        const file = path.join(__dirname, `./Pages/${page}.ejs`);
        const exists = fs.existsSync(file);

        if (!exists && !req.session?.admin) return res.redirect("/404");
        else if (!exists && req.session?.admin) return next();

        const mongoData = req?.session?.auth !== undefined ? await customerSchema.findOne({ Auth: req?.session?.auth }) : null;
        if (req?.session?.auth && !mongoData && page !== "cikis") return res.redirect("/cikis");

        if (!["giris", "kayit", "sifreunuttum", "kurallar", "cikis", "dogrula"].includes(page) && !mongoData) return res.redirect("/giris");

        if (fs.existsSync(`./Backend/${req.method}/${page}.js`)) {
            delete require.cache[require.resolve(`./Backend/${req.method}/${page}.js`)];
            const cmd = require(`./Backend/${req.method}/${page}.js`);

            return cmd.execute(req, res, mongoData, ip);
        } else if (req.method !== "GET" && fs.existsSync(`./Backend/GET/${page}.js`)) {
            delete require.cache[require.resolve(`./Backend/GET/${page}.js`)];
            const cmd = require(`./Backend/GET/${page}.js`);

            return cmd.execute(req, res, mongoData, ip);
        } else return res.render(file, { mongoData });

    } catch (err) {
        console.log(err);
        return res.redirect("/404");
    };

});

app.all("/response/:api", girisKontrol, async (req, res) => {

    try {

        const { api } = req.params;
        const file = `./Responses/${api.toUpperCase()}.json`;
        const exists = fs.existsSync(file);

        if (!exists) return res.redirect("/404");

        return res.json(JSON.parse(fs.readFileSync(file, "utf8")));

    } catch (err) {
        console.log(err);
        return res.redirect("/404");
    }

});

app.all("/admin/:page", girisKontrol, async (req, res) => {

    try {

        const ip = req.header['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip;

        const { page } = req.params;
        const file = path.join(__dirname, `/Pages/Admin/${page}.ejs`);
        const exists = fs.existsSync(file);

        if (!exists) return res.redirect("/404");

        const mongoData = req?.session?.auth !== undefined ? await customerSchema.findOne({ Auth: req?.session?.auth }) : null;
        if (req?.session?.auth && !mongoData) return res.redirect("/cikis");

        if (fs.existsSync(`./Backend/${req.method}/Admin/${page}.js`)) {
            delete require.cache[require.resolve(`./Backend/${req.method}/Admin/${page}.js`)];
            const cmd = require(`./Backend/${req.method}/Admin/${page}.js`);

            return cmd.execute(req, res, mongoData, ip);
        } else return res.render(file, { mongoData });

    } catch (err) {
        console.log(err);
        return res.redirect("/404");
    };

});

app.all("/oauth/:page", girisKontrol, async (req, res) => {

    try {

        const ip = req.header['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip;

        const { page } = req.params;
        console.log(`Sayfa: ${req.method} ${page} - Auth: ${req?.session?.auth} - IP: ${ip}`);

        const mongoData = await customerSchema.findOne({ Auth: req?.session?.auth });
        if (req?.session?.auth && !mongoData) return res.redirect("/cikis");

        if (fs.existsSync(`./Backend/${req.method}/OAuth/${page}.js`)) {
            delete require.cache[require.resolve(`./Backend/${req.method}/OAuth/${page}.js`)];
            const cmd = require(`./Backend/${req.method}/OAuth/${page}.js`);

            return cmd.execute(req, res, mongoData, ip);
        } else return res.redirect("/404");

    } catch (err) {
        console.log(err);
        return res.redirect("/404");
    };

});

app.all("*", (req, res) => res.redirect("/giris"));
app.listen(config.port, () => console.log("Server started!"));
