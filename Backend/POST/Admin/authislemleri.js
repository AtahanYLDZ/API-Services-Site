const customerSchema = require("../../../Database/Schemas/customerSchema");
const config = require("../../../Core/Settings/config");
const axios = require("axios");
const path = require('node:path');
const fs = require("node:fs");
const moment = require("moment");
moment.locale("tr");

module.exports = {
    name: "authislemleri",
    async execute(req, res) {

        try {

            const { auth, authname, authsil, email, ip, sifre, "2fa": factor, bakiye, api, tarihData, limitData, verilenData, apiDelete, refbakiye } = req.body;

            const mongoData = await customerSchema.findOne({ Auth: req.session.auth });
            if (!mongoData) return res.redirect("/giris");

            if (auth) {

                const authData = await customerSchema.findOne({ Auth: auth }) || await customerSchema.findOne({ Email: auth }) || await customerSchema.findOne({ IP: auth }) || await customerSchema.findOne({ "LastLogin.ip": auth });
                if (!authData) return res.render(`../Pages/Admin/${this.name}.ejs`, { mongoData, success: false, mesaj: "Geçersiz Auth." });

                const liste = JSON.parse(fs.readFileSync("./Core/Settings/apiList.json", "utf8"));
                const liste2 = JSON.parse(fs.readFileSync("./Core/Settings/apiList.json", "utf8")).filter(x => !authData.sorgular.some(item => item.name === x.value));

                const apilerim = [];
                await Promise.all(authData.sorgular.map(async (sorgu) => {
    
                    const api = liste.find(x => x.value === sorgu.name);
                    if (!api) return;

                    const price = Number(liste.find(x => x.value == sorgu.name)?.price);
                    if (sorgu.totalLimit > 1000) {
                        const sayi = Math.ceil((sorgu.totalLimit - 1000) / 1000);
                        const bol = mongoData.Auth === "sssss" ? 1 : 2;
                        api.price = price + (price / bol) * sayi;
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

                if (authsil == "true") {

                    const response2 = await axios.get(
                        `https://api.cloudflare.com/client/v4/zones/${config.cloudflare.zoneId}/firewall/access_rules/rules`,
                        {
                            headers: {
                                'Authorization': config.cloudflare.token,
                                'Content-Type': 'application/json',
                            },
                        }
                    );
            
                    const ipRule = response2.data.result.find(rule => rule.configuration.target.includes("ip") && rule.configuration.value === authData.IP);
            
                    if (ipRule) await axios.delete(`https://api.cloudflare.com/client/v4/zones/${config.cloudflare.zoneId}/firewall/access_rules/rules/${ipRule.id}`, {
                        headers: {
                            'Authorization': config.cloudflare.token,
                            'Content-Type': 'application/json'
                        }
                    });

                    await customerSchema.findOneAndDelete({ Auth: auth });
                    return res.render(`../Pages/Admin/${this.name}.ejs`, { mongoData, success: true, mesaj: "Auth başarıyla silindi." });
                };
    
                return res.render(`../Pages/Admin/${this.name}.ejs`, { mongoData, authData, apilerim, liste2, liste });

            } else {

                const authData = await customerSchema.findOne({ Auth: authname });
                if (!authData) return res.render(`../Pages/Admin/${this.name}.ejs`, { mongoData, success: false, mesaj: "Geçersiz Auth." });

                if (authname && authData.Auth !== authname) {

                    authData.Auth = authname;
                    authData.markModified('Auth');

                }
                if (email && authData.Email !== email) authData.Email = email;
                if (ip && authData.IP !== ip) await authData.ipDegistir(ip);
                if (sifre && authData.Password !== sifre) authData.Password = sifre;
                if (factor && authData.TwoFactor.active !== factor) authData.TwoFactor.active = factor;
                if (bakiye && authData.PaymentInfo.Balance !== Number(bakiye)) authData.PaymentInfo.Balance = Number(bakiye);
                if (refbakiye && authData.RefInfo.Balance !== Number(refbakiye)) authData.RefInfo.Balance = Number(refbakiye);
                if (api) {

                    const sorgu = authData.sorgular.find(x => x.name === api);

                    if (!sorgu?.admindondur) {

                        sorgu.admindondur = true;
                        sorgu.returnTimestamp = Date.now();
                        authData.markModified('sorgular');
            
                    } else if (sorgu?.admindondur) {
            
                        sorgu.admindondur = false;
                        let returnTime = Date.now() - sorgu.returnTimestamp;
                        sorgu.endTimestamp = sorgu.endTimestamp + returnTime;
                        authData.markModified('sorgular');
            
                    };

                };
                if (apiDelete) {

                    const sorgu = authData.sorgular.find(x => x.name === apiDelete);
                    const sorguIndex = authData.sorgular.findIndex(x => x.name === apiDelete);
                    if (sorgu) {
                        authData.sorgular.splice(sorguIndex, 1);
                        authData.markModified('sorgular');
                    };

                };
                if (tarihData && tarihData.length > 0) {

                    await Promise.all(tarihData.map(async (data) => {

                        const sorgu = authData.sorgular.find(x => x.name === data.id);
                        const sorguIndex = authData.sorgular.findIndex(x => x.name === data.id);

                        const timestamp = moment(data.value).valueOf();
                        if (sorgu.endTimestamp !== timestamp) {
                            authData.sorgular[sorguIndex].endTimestamp = timestamp;
                        };

                    }));

                    authData.markModified('sorgular');

                };
                if (limitData && limitData.length > 0) {

                    await Promise.all(limitData.map(async (data) => {

                        const sorgu = authData.sorgular.find(x => x.name === data.id);
                        const sorguIndex = authData.sorgular.findIndex(x => x.name === data.id);

                        const limit = Number(data.value);
                        if (sorgu.totalLimit !== limit) {
                            authData.sorgular[sorguIndex].totalLimit = limit;
                        };

                    }));

                    authData.markModified('sorgular');

                };
                if (verilenData && verilenData.length > 0) {

                    await Promise.all(verilenData.map(async (api) => {

                        const sorgu = authData.sorgular.find(x => x.name === api);
                        if (sorgu) return;

                        authData.sorgular.push({ name: api, active: true, totalLimit: 1000, usedLimit: 0, startTimestamp: Date.now(), endTimestamp: Date.now() + 30 * 24 * 60 * 60 * 1000, admindondur: false })

                    }));

                    authData.markModified('sorgular');

                };

                await authData.save();

                const liste = JSON.parse(fs.readFileSync("./Core/Settings/apiList.json", "utf8"));
                const liste2 = JSON.parse(fs.readFileSync("./Core/Settings/apiList.json", "utf8")).filter(x => !authData.sorgular.some(item => item.name === x.value));

                const apilerim = [];
                await Promise.all(authData.sorgular.map(async (sorgu) => {
    
                    const api = liste.find(x => x.value === sorgu.name);
                    if (!api) return;

                    const price = Number(liste.find(x => x.value == sorgu.name)?.price);
                    if (sorgu.totalLimit > 1000) {
                        const sayi = Math.ceil((sorgu.totalLimit - 1000) / 1000);
                        const bol = mongoData.Auth === "sssss" ? 1 : 2;
                        api.price = price + (price / bol) * sayi;
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

                return res.render(`../Pages/Admin/${this.name}.ejs`, { mongoData, apilerim, liste2, liste, authData, success: true, mesaj: "Auth başarıyla güncellendi." });

            };

        } catch (err) {
            console.log(err);
        }

    }
};