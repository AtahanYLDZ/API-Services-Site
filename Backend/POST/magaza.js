const customerSchema = require("../../Database/Schemas/customerSchema");
const path = require('node:path');
const fs = require("node:fs");

module.exports = {
    name: "magaza",
    async execute(req, res, mongoData) {

        try {

            const { api, apiUzat } = req.body;

            const liste = JSON.parse(fs.readFileSync("./Core/Settings/apiList.json", "utf8"));

            await Promise.all(mongoData.sorgular.map(async(sorgu) => {

                if (sorgu.totalLimit === 1000) return;

                const price = Number(liste.find(x => x.value == sorgu.name)?.price);
                if (!price) return;
                
                const api = liste.find(x => x.value == sorgu.name);
                if (sorgu.totalLimit > 1000) {
                    const sayi = Math.ceil((sorgu.totalLimit - 1000) / 1000);
                    const bol = mongoData.Auth === "sssss" ? 1 : 2;
                    api.price = price + (price / bol) * sayi;
                } else {
                    const faktor = sorgu.totalLimit / 1000;
                    api.price = price * faktor; 
                };

            }));
            
            const promoCodes = mongoData.PaymentInfo.PromoCodes.filter(x => x.endDate > Date.now()).sort((a, b) => a.reduction - b.reduction);

            if (api && !apiUzat) {

                if (promoCodes.length > 0) {

                    await Promise.all(promoCodes.map(async(code) => {
    
                        if (code.limit !== "yok" && !Number(code?.limit) || code?.limit <= 0) return;
    
                        liste.map(x => x.price = x.price - (x.price * code.reduction / 100));
    
                    }));
    
                };
    
                const apiData = liste.find(x => x.active && x.value === api);
                if (!apiData) return res.json({ success: false, message: "API bulunamadı." });
    
                const result = await mongoData.buyApi(apiData);
                
                return res.json(result);

            } else if (!api && apiUzat) {

                const apiData = liste.find(x => x.active && x.value === apiUzat);
                if (!apiData) return res.json({ success: false, message: "API bulunamadı." });
    
                const result = await mongoData.extendApi(apiData);
                
                return res.json(result);

            }

        } catch (err) {
            console.log(err);
        }

    }
};