const customerSchema = require("../../Database/Schemas/customerSchema");
const config = require("../../Core/Settings/config");
const path = require('node:path');
const fs = require("node:fs");
const { sendMail, genJwtToken } = require("../../Core/Functions/functions");
const { verify } = require("hcaptcha");
const speakeasy = require('speakeasy');

module.exports = {
    name: "sifreunuttum",
    async execute(req, res) {

        try {

            const { email, password, 'h-captcha-response': hCaptchaResponse, factor } = req.body;

            if (email && !password && !factor) {

                const verified = await verify(config.hcaptcha.secret, hCaptchaResponse);
                if (!verified.success) return res.render(`../Pages/${this.name}.ejs`, { success: false, mesaj: "Captcha yanlış." })

                const mongoData = await customerSchema.findOne({ Email: email });
                if (!mongoData) return res.render(`../Pages/${this.name}.ejs`, { success: false, mesaj: "Siteye kayıtlı böyle bir mail bulunamadı." })

                if (mongoData.TwoFactor.active) {

                    req.session.mailauth = mongoData.Auth;

                    return res.render(`../Pages/${this.name}.ejs`, { factor: true });

                };
    
                const json = { Auth: mongoData.Auth };
                const mail = await sendMail(mongoData.Email, genJwtToken(json), mongoData, "sifreunuttum", req.headers.host);
                if (mail) {

                    return res.render(`../Pages/${this.name}.ejs`, { success: true, mesaj: "Mail adresiniz bulundu bağlantı gönderildi." });

                } else return res.render(`../Pages/${this.name}.ejs`, { success: false, mesaj: "Mail gönderilemedi." });

            } else if (factor && !email && !password) {

                if (!req.session?.mailauth || req.session.mailauth === "expired") return res.render(`../Pages/${this.name}.ejs`, { success: false, mesaj: "Şifre sıfırlama bağlantısının süresi dolmuştur." });

                const mongoData = await customerSchema.findOne({ Auth: req.session.mailauth });
                if (!mongoData.TwoFactor.active) return res.render(`../Pages/${this.name}.ejs`);

                const verified = speakeasy.totp.verify({ secret: mongoData.TwoFactor.secret, encoding: 'base32', token: factor });
                if (!verified) return res.render(`../Pages/${this.name}.ejs`, { success: false, mesaj: "2FA kodu yanlış.", factor: true });

                const mail = await sendMail(mongoData.Email, genJwtToken(mongoData.Email), mongoData, "sifreunuttum", req.headers.host);
                if (mail) {

                    return res.render(`../Pages/${this.name}.ejs`, { success: true, mesaj: "Mail adresiniz bulundu bağlantı gönderildi." });

                } else return res.render(`../Pages/${this.name}.ejs`, { success: false, mesaj: "Mail gönderilemedi." });

            } else if (password && !email && !factor) {

                if (!req.session?.mailauth || req.session.mailauth === "expired") return res.render(`../Pages/${this.name}.ejs`, { success: false, mesaj: "Şifre sıfırlama bağlantısının süresi dolmuştur." });

                const mongoData = await customerSchema.findOne({ Auth: req.session.mailauth });
                if (!mongoData) return res.render(`../Pages/${this.name}.ejs`, { success: false, mesaj: "Siteye kayıtlı böyle bir kullanıcı bulunamadı." });

                if (mongoData.Password === password.trim()) return res.render(`../Pages/${this.name}.ejs`, { success: false, mesaj: "Yeni şifreniz eski şifreniz ile aynı olamaz." });

                req.session.mailauth = "expired";

                mongoData.Password = password.trim();
                mongoData.ChangedPassword = true;
                await mongoData.save();

                return res.render(`../Pages/${this.name}.ejs`, { success: true, mesaj: "Sifreniz başarıyla değiştirildi." });

            } else return res.render(`../Pages/${this.name}.ejs`);

        } catch (err) {
            console.log(err);
        }

    }
};