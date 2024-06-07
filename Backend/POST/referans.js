module.exports = {
    name: "referans",
    async execute(req, res, mongoData) {

        try {

            const { islem } = req.body;

            if (islem == "aktar") {

                if (mongoData.RefInfo.Balance <= 0) return res.json({ success: false, message: "Aktarılacak bakiye bulunamadı." });

                mongoData.PaymentInfo.Balance += mongoData.RefInfo.Balance;
                mongoData.PaymentInfo.History.push({ price: mongoData.RefInfo.Balance, date: Date.now(), desc: `Referans bakiye aktarımı.` });
                mongoData.RefInfo.Balance = 0;
                await mongoData.save();

                return res.json({ success: true, message: `Referans bakiyesi başarıyla aktarıldı.` });

            } else return res.render(`../Pages/${this.name}.ejs`, { mongoData });

        } catch (err) {
            console.log(err);
        }

    }
};