const customerSchema = require("../../Database/Schemas/customerSchema");
const path = require('node:path');
const fs = require("node:fs");

module.exports = {
    name: "anasayfa",
    async execute(req, res, mongoData) {

        try {

            if (mongoData && mongoData.Discord.ID) {

                const user = await global.client.users.fetch(mongoData.Discord.ID);
                const avatar = user.displayAvatarURL({ dynamic: true });

                if (mongoData.Discord.AvatarURL !== avatar) {

                    mongoData.Discord.AvatarURL = avatar;
                    mongoData.markModified("Discord.AvatarURL");
                    await mongoData.save();

                };

            };

            const uyelik = req.session?.admin ? "Yönetici" : ["devran"].includes(req.session.auth) ? "Destek Ekibi" : mongoData.sorgular.length > 0 ? "Müşteri" : "Üye";
            const toplammusteri = (await customerSchema.find()).filter(x => x.sorgular.length > 0).length;
            const history = mongoData.PaymentInfo.History.filter(x => x.type !== "referans").slice(-5).reverse();
            const songirisler = mongoData.LastLogin.slice(-5).reverse();
            const duyurular = JSON.parse(fs.readFileSync("./Core/Settings/duyuruList.json", "utf8")).slice(-5).reverse();

            return res.render(`../Pages/${this.name}.ejs`, {
                mongoData, uyelik: uyelik, toplamkullanici: await customerSchema.countDocuments(), toplammusteri, history, songirisler, duyurular
            });

        } catch (err) {
            console.log(err);
        }

    }
};