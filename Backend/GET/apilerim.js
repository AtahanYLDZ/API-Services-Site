const customerSchema = require("../../Database/Schemas/customerSchema");
const path = require('node:path');
const fs = require("node:fs");

module.exports = {
    name: "apilerim",
    async execute(req, res, mongoData, ip) {

        try {

            const liste = JSON.parse(fs.readFileSync("./Core/Settings/apiList.json", "utf8"));

            const apilerim = [];
            await Promise.all(mongoData.sorgular.map(async (sorgu) => {

                const api = liste.find(x => x.value === sorgu.name);
                if (!api) return;

                if (sorgu.totalLimit !== 1000) {

                    const sayi = (sorgu.totalLimit - 1000) / 1000;
                    const price = liste.find(x => x.value == sorgu.name)?.price;
                    if (!price) return;

                    const bol = mongoData.Auth == "sssss" ? 1 : 2;

                    const newPrice = Number(price) + (Number(price) / bol) * sayi;
                    api.price = newPrice;

                };

                apilerim.push({
                    name: api.name,
                    value: api.value,
                    price: api.price,
                    desc: api.description,
                    limit: sorgu.totalLimit,
                    active: sorgu?.admindondur ? "Pasif" : sorgu.active ? "Aktif" : "Pasif",
                    endDate: new Date(sorgu.endTimestamp).toLocaleDateString("tr-TR"),
                });

            }));

            apilerim.push({ name: "Toplam", price: apilerim.reduce((a, b) => Number(a) + Number(b.price), 0), desc: "Toplamda harcanan para.", active: "", endTimestamp: "" })

            return res.render(`../Pages/${this.name}.ejs`, { mongoData, apilerim });

        } catch (err) {
            console.log(err);
        }

    }
};