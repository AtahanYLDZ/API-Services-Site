const customerSchema = require("../../Database/Schemas/customerSchema");
const path = require('node:path');
const fs = require("node:fs");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

module.exports = {
    name: "ayarlar",
    async execute(req, res, mongoData) {

        try {

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

            } else if (!req.session?.factorData) req.session.factorData = { secret: mongoData.TwoFactor.secret, qrCode: null };

            return res.render(`../Pages/${this.name}.ejs`, { mongoData, factorData: req.session.factorData });

        } catch (err) {
            console.log(err);
        }

    }
};