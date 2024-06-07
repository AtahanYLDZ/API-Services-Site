const customerSchema = require("../../../Database/Schemas/customerSchema");
const path = require('node:path');
const fs = require("node:fs");

module.exports = {
    name: "authislemleri",
    async execute(req, res) {

        try {

            const mongoData = await customerSchema.findOne({ Auth: req.session.auth });
            if (!mongoData) return res.redirect("/giris");

            return res.render(`../Pages/Admin/${this.name}.ejs`, { mongoData });

        } catch (err) {
            console.log(err);
        }

    }
};

async function toplamAylikKazanç() {

    try {

        let allData = await customerSchema.find();
        allData = allData.filter(x => x.sorgular.length > 0 && !["hoster","berkeroot","esto","perla","servis","cabbarxd","atahanyldz","atilla"].includes(x.Auth))

        let totalPrice = 0;
        const APIList = JSON.parse(fs.readFileSync("./Core/Settings/apiList.json"));

        await Promise.all(allData.map(async (data) => {

            let sorgular = data.sorgular

            await Promise.all(sorgular.map(async (sorgu) => {

                let api = APIList.find(x => x.value === sorgu.name)
                if(!api) return;

                if (sorgu.totalLimit !== 1000) {

                    const sayi = (sorgu.totalLimit - 1000) / 1000;
                    const price = APIList.find(x => x.value == sorgu.name)?.price;
                    if (!price) return;

                    const newPrice = Number(price) + (Number(price) / 2) * sayi;
                    api.price = newPrice;

                };

                totalPrice = totalPrice + Number(api.price)

            }))

        }))

        return `${totalPrice.toLocaleString("tr-TR")} ₺`;

    } catch (err) {
        console.log(err);
        return 0;
    }

}