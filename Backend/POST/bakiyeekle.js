const customerSchema = require("../../Database/Schemas/customerSchema");
const config = require("../../Core/Settings/config");
const { createTransaction, checkTransaction } = require("../../Core/Functions/functions");
const QRCode = require("qrcode");

module.exports = {
    name: "bakiyeekle",
    async execute(req, res, mongoData) {

        try {

            const { amount, accept } = req.body;

            if (amount && !accept) {

                if (!Number(amount) || Number(amount) < 0) return res.render(`../Pages/${this.name}.ejs`, { mongoData, success: false, mesaj: "Geçersiz miktar." });
                if (Number(amount) < 50) return res.render(`../Pages/${this.name}.ejs`, { mongoData, success: false, mesaj: "Minimum 50₺ yüklenebilir." });
                if (Number(amount) > 10000) return res.render(`../Pages/${this.name}.ejs`, { mongoData, success: false, mesaj: "Maksimum 10.000₺ yüklenebilir." });

                if (global.kriptousers.get(req.session.auth)?.active) return res.render(`../Pages/${this.name}.ejs`, { mongoData, success: false, mesaj: "Zaten bir ödeme işleminiz var." });
                const yeniOdeme = await createTransaction(Number(amount), req.session.auth);

                const qrCode = await QRCode.toDataURL(config.kripto, { errorCorrectionLevel: 'H' });

                return res.render(`../Pages/${this.name}.ejs`, { mongoData, payment: { price: yeniOdeme.price, adres: config.kripto, try: yeniOdeme.try, qrCode } });

            } else if (amount && accept) {

                if (!global.kriptousers.get(req.session.auth)) return res.render(`../Pages/${this.name}.ejs`, { mongoData, success: false, mesaj: "Ödeme işleminiz yok." });
                if (global.kriptousers.get(req.session.auth)?.active) return res.render(`../Pages/${this.name}.ejs`, { mongoData, success: false, mesaj: "Zaten bir ödeme işleminiz var." });

                let veri = global.kriptousers.get(req.session.auth);
                console.log(veri)
                veri.active = true;

                let elapsedTime = 0;
                const intervalId = setInterval(async () => {
                    elapsedTime += 20;
                    const transaction = await checkTransaction(req.session.auth);
                    if (elapsedTime >= 300) { 
                        global.kriptousers.delete(req.session.auth);
                        return clearInterval(intervalId);
                    } 
                    if (transaction) {
                        await mongoData.buyBalance(global.kriptousers.get(req.session.auth).try, transaction);
                        global.kriptousers.delete(req.session.auth);
                        return clearInterval(intervalId);
                    }
                }, 20000);

            } else return res.render(`../Pages/${this.name}.ejs`, { mongoData });

            return res.render(`../Pages/${this.name}.ejs`, { mongoData, success: true, mesaj: "Ödemeniz başarıyla alındı en geç 2 dakika içersinde hesabınıza yansıyacaktır." });

        } catch (err) {
            console.log(err);
        }

    }
};