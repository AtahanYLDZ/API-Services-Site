const customerSchema = require("../../Database/Schemas/customerSchema");
const path = require('node:path');
const fs = require("node:fs");

module.exports = {
    name: "magaza",
    async execute(req, res, mongoData, ip) {

        try {

            const promoCodes = mongoData.PaymentInfo.PromoCodes.filter(x => x.endDate > Date.now()).sort((a, b) => a.reduction - b.reduction);

            const apiList = JSON.parse(fs.readFileSync("./Core/Settings/apiList.json", "utf8"));
            let liste = apiList.filter(x => x.active && !mongoData.sorgular.some(item => item.name === x.value));
            let sorgular = apiList.filter(x => x.active && mongoData.sorgular.some(item => item.name === x.value));
            sorgular.map(x => x.owned = true);

            await Promise.all(mongoData.sorgular.map(async(sorgu) => {

                if (sorgu.totalLimit === 1000 || !sorgular.find(x => x.value == sorgu.name)) return;

                const price = Number(apiList.find(x => x.value == sorgu.name)?.price);
                if (!price) return;
                
                const api = sorgular.find(x => x.value == sorgu.name);
                if (sorgu.totalLimit > 1000) {
                    const sayi = Math.ceil((sorgu.totalLimit - 1000) / 1000);
                    const bol = mongoData.Auth === "sssss" ? 1 : 2;
                    api.price = price + (price / bol) * sayi;
                } else {
                    const faktor = sorgu.totalLimit / 1000;
                    api.price = price * faktor; 
                };

            }));

            if (promoCodes.length > 0) {

                await Promise.all(promoCodes.map(async(code) => {

                    if (code.limit !== "yok" && !Number(code?.limit) || code?.limit <= 0) return;

                    liste.map(x => x.price = x.price - (x.price * code.reduction / 100));

                }));

            };
            
            return res.render(`../Pages/${this.name}.ejs`, { mongoData, liste: liste.length > 0 ? liste.concat(sorgular) : sorgular });

        } catch (err) {
            console.log(err);
        }

    }
};