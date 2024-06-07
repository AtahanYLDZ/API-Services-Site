const customerSchema = require("../../Database/Schemas/customerSchema");
const config = require("../../Core/Settings/config");
const axios = require("axios");
const path = require('node:path');
const fs = require("node:fs");
const moment = require("moment");
moment.locale("tr");

module.exports = {
    name: "authsorgu",
    async execute(req, res, mongoData, ip) {

        try {

            if (req.session.auth !== "devran" && !req.session.admin) return res.redirect("/anasayfa");

            const { auth } = req.body;
            console.log(auth)

            if (auth) {

                const authData = await customerSchema.findOne({ Auth: auth }) || await customerSchema.findOne({ Email: auth }) || await customerSchema.findOne({ IP: auth }) || await customerSchema.findOne({ "LastLogin.ip": auth });
                if (!authData) return res.render(`../Pages/${this.name}.ejs`, { mongoData, success: false, mesaj: "Geçersiz Auth." });

                const liste = JSON.parse(fs.readFileSync("./Core/Settings/apiList.json", "utf8"));
                const liste2 = JSON.parse(fs.readFileSync("./Core/Settings/apiList.json", "utf8")).filter(x => x.active && !authData.sorgular.some(item => item.name === x.value));

                const apilerim = [];
                await Promise.all(authData.sorgular.map(async (sorgu) => {
    
                    const api = liste.find(x => x.value === sorgu.name);
                    if (!api) return;

                    const price = Number(liste.find(x => x.value == sorgu.name)?.price);
                    if (sorgu.totalLimit > 1000) {
                        const sayi = Math.ceil((sorgu.totalLimit - 1000) / 1000);
                        api.price = price + (price / 2) * sayi;
                    } else {
                        const faktor = sorgu.totalLimit / 1000;
                        api.price = price * faktor; 
                    };
    
                    apilerim.push({
                        name: api.name,
                        value: api.value,
                        price: api.price,
                        desc: api.description,
                        limit: sorgu.totalLimit,
                        active: sorgu?.active ? "Aktif" : "Pasif",
                        adactive: sorgu?.admindondur ? "Pasif" : "Aktif",
                        endDate: moment(sorgu.endTimestamp).format("YYYY-MM-DD"),
                    });
    
                }));
    
                apilerim.push({ name: "Toplam", price: apilerim.reduce((a, b) => Number(a) + Number(b.price), 0), desc: "Toplamda harcanan para.", active: "", endTimestamp: "" })
    
                return res.render(`../Pages/${this.name}.ejs`, { mongoData, authData, apilerim, liste2, liste });

            };

        } catch (err) {
            console.log(err);
        }

    }
};