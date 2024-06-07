const customerSchema = require("../../Database/Schemas/customerSchema");
const config = require("../../Core/Settings/config");
const path = require('node:path');
const { sendMail, genJwtToken } = require("../../Core/Functions/functions");
const { verify } = require("hcaptcha");

module.exports = {
    name: "kayit",
    async execute(req, res, v, ip) {

        try {

            const { auth, password, email, 'h-captcha-response': hCaptchaResponse, ref } = req.body;

            const verified = await verify(config.hcaptcha.secret, hCaptchaResponse);
            if (!verified.success) return res.render(`../Pages/${this.name}.ejs`, { mesaj: "Captcha yanlış." });

            if (auth.length < 3 || !/^[a-zA-Z]+$/.test(auth) || auth.toLowerCase() !== auth || email.toLowerCase() !== email || !email.includes("@")) return res.send("API mi çekcen sen agu bugu");

            const mongoData = await customerSchema.findOne({ Auth: auth }) || await customerSchema.findOne({ Email: email });
            if (mongoData) return res.render(`../Pages/${this.name}.ejs`, { mesaj: "Bu Auth veya E-Mail zaten kayıtlı." });

            const refData = await customerSchema.findOne({ Auth: ref });
            if (ref && ref !== auth && !refData) return res.render(`../Pages/${this.name}.ejs`, { mesaj: "Referans bulunamadı." });

            const json = { Auth: auth, type: "kayit", data: { email, Password: password, ref: ref } };
            //console.log(genJwtToken(json))
            const mail = await sendMail(email, genJwtToken(json), json, "kayit", req.headers.host);
            if (mail) {

                return res.render(`../Pages/${this.name}.ejs`, { mailverification: true });

            } else return res.render(`../Pages/${this.name}.ejs`, { success: false, mesaj: "Mail gönderilemedi." });

        } catch (err) {
            console.log(err);
        }

    }
};