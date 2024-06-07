const customerSchema = require("../../Database/Schemas/customerSchema");
const path = require('node:path');
const fs = require("node:fs");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

module.exports = {
    name: "ayarlar",
    async execute(req, res, mongoData) {

        try {

            const { email, ip, oldPassword, newPassword, rnewPassword, redeemCode, code, secret } = req.body;

            if (oldPassword && newPassword && rnewPassword) {

                if (oldPassword !== mongoData.Password) return res.render(`../Pages/${this.name}.ejs`, { mongoData, mesaj: { success: false, message: "Eski şifrenizi yanlış girdiniz." }, factorData: req.session.factorData });
                if (oldPassword === newPassword) return res.render(`../Pages/${this.name}.ejs`, { mongoData, mesaj: { success: false, message: "Yeni şifreniz eskisiyle aynı olamaz." }, factorData: req.session.factorData });
                if (newPassword !== rnewPassword) return res.render(`../Pages/${this.name}.ejs`, { mongoData, mesaj: { success: false, message: "Yeni şifreniz tekrarıyla aynı değil." }, factorData: req.session.factorData });
                if (newPassword.length < 8 || newPassword.length > 20) return res.render(`../Pages/${this.name}.ejs`, { mongoData, mesaj: { success: false, message: "Yeni şifreniz en az 8 ve 20 arasında karakter olmalıdır." }, factorData: req.session.factorData });

                await customerSchema.findOneAndUpdate({ Auth: req.session.auth }, { Password: newPassword, factorData: req.session.factorData });
                
            } else if (email || ip) {

                //if (mongoData.Email !== email || email.length < 30) await customerSchema.findOneAndUpdate({ Auth: req.session.auth }, { Email: email });
                if (mongoData.IP !== ip) {
                    //if (req.session.auth == "asunex") return res.render(`../Pages/${this.name}.ejs`, { mongoData, mesaj: { success: false, message: `IP degisemezsin.` }, factorData: req.session.factorData });

                    const cooldown = req.session?.ipCl;
                    if (cooldown) return res.render(`../Pages/${this.name}.ejs`, { mongoData, mesaj: { success: false, message: `${new Date(cooldown).toLocaleString("TR")} Zamanına kadar cooldown var.` }, factorData: req.session.factorData }); 
    
                    const result = await mongoData.ipDegistir(ip);
                    if (!result.success) return res.render(`../Pages/${this.name}.ejs`, { mongoData, mesaj: result, factorData: req.session.factorData });
                    else {

                        req.session.ipCl = Date.now() + 20 * 60000;
                        setTimeout(async() => {

                            delete req.session.ipCl;
                            await req.session.save();

                        }, 20 * 60000);

                    };
    
                };

            } else if (redeemCode) {

                const result = await mongoData.redeemCode(redeemCode);

                return res.render(`../Pages/${this.name}.ejs`, { mongoData, mesaj: result, factorData: req.session.factorData })

            } else if (secret && code) {

                if (mongoData.TwoFactor.active) return res.send(`API mi çekmeye çalisiyon sen agu bugu`);

                const verified = speakeasy.totp.verify({ secret, encoding: 'base32', token: code });
                if (verified) {

                    mongoData.TwoFactor.active = true;
                    mongoData.TwoFactor.secret = secret;
                    await mongoData.save();

                } else {

                    return res.render(`../Pages/${this.name}.ejs`, { mongoData, mesaj: { success: false, message: `2FA Kodunuzu yanlış girdiniz.` }, factorData: req.session.factorData })

                };
                
            } else if (!secret && code) {

                if (!mongoData.TwoFactor.active) return res.send(`API mi çekmeye çalisiyon sen agu bugu`);

                const verified = speakeasy.totp.verify({ secret: mongoData.TwoFactor.secret, encoding: 'base32', token: code });
                if (verified) {

                    mongoData.TwoFactor.active = false;
                    mongoData.TwoFactor.secret = null;
                    await mongoData.save();

                    delete req.session.factorData;
                    await req.session.save();

                } else {

                    return res.render(`../Pages/${this.name}.ejs`, { mongoData, mesaj: { success: false, message: `2FA Kodunuzu yanlış girdiniz.` }, factorData: req.session.factorData })

                };

            };

            if (!mongoData.TwoFactor.active) {

                const secret = speakeasy.generateSecret({ length: 20 });
                const otpAuthUrl = speakeasy.otpauthURL({
                    secret: secret.ascii,
                    label: `${mongoData.Auth} - Perla API Servisi`,
                    algorithm: 'sha1',
                    window: 1,
                });

                const qrCode = await QRCode.toDataURL(otpAuthUrl);

                if (!req.session?.factorData) req.session.factorData = { secret: secret.base32, qrCode };

            };

            return res.render(`../Pages/${this.name}.ejs`, { mongoData, mesaj: { success: true, message: "Ayarlarınız başarıyla güncellendi." }, factorData: req.session.factorData });

        } catch (err) {
            console.log(err);
        }

    }
};