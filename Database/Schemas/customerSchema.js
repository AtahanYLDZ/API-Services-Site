const config = require("../../Core/Settings/config");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const axios = require("axios");
const fs = require("node:fs");
const stuffs = require("stuffs");
const mongoose = require("mongoose");
const moment = require("moment");
moment.locale("tr");

const customerSchema = new mongoose.Schema({

    Auth: { type: String, required: true },
    Email: { type: String, default: null },
    Password: { type: String, required: true },
    ChangedPassword: { type: Boolean, default: false },
    IP: { type: String, default: null },
    RegisterDate: { type: Number, default: null },
    TwoFactor: {
        active: { type: Boolean, default: false },
        secret: { type: String, default: null },
    },
    PaymentInfo: {
        Balance: { type: Number, default: 0 },
        History: { type: Array, default: [] },
        Total: { type: Number, default: 0 },
        PromoCodes: { type: Array, default: [] }
    },
    RefInfo: {
        Auth: { type: String, default: null },
        Balance: { type: Number, default: 0 },
        Auths: { type: Array, default: [] }
    },
    Discord: {
        ID: { type: String, default: null },
        AccessToken: { type: String, default: null },
        RefreshToken: { type: String, default: null },
        Booster: { type: Boolean, default: false },
        Black: { type: Boolean, default: false },
        AvatarURL: { type: String, default: null }
    },
    LastLogin: { type: Array, default: [] },
    sorgular: { type: Array, default: [] }

});

customerSchema.methods.ipDegistir = async function (ip) {

    try {

        if (ip === this.IP) return { success: false, message: "IP adresiniz zaten bu IP adresi." };

        const response = await axios.post(`https://api.cloudflare.com/client/v4/zones/${config.cloudflare.zoneId}/firewall/access_rules/rules`, {
            mode: 'whitelist',
            configuration: {
                target: 'ip',
                value: ip
            }
        }, {
            headers: {
                'Authorization': config.cloudflare.token,
                'Content-Type': 'application/json'
            }
        });

        const response2 = await axios.get(
            `https://api.cloudflare.com/client/v4/zones/${config.cloudflare.zoneId}/firewall/access_rules/rules`,
            {
                headers: {
                    'Authorization': config.cloudflare.token,
                    'Content-Type': 'application/json',
                },
            }
        );

        const ipRule = response2.data.result.find(rule => rule.configuration.target.includes("ip") && rule.configuration.value === this.IP);

        if (ipRule) await axios.delete(`https://api.cloudflare.com/client/v4/zones/${config.cloudflare.zoneId}/firewall/access_rules/rules/${ipRule.id}`, {
            headers: {
                'Authorization': config.cloudflare.token,
                'Content-Type': 'application/json'
            }
        });

        this.IP = ip;
        this.PaymentInfo.History.push({ price: 0, date: Date.now(), desc: "IP adresi değiştirme işlemi." });
        await this.save();

        return { success: true, message: "IP adresiniz başarıyla değiştirildi." };

    } catch (err) {
        console.log(err);
        return { success: false, message: "Cloudflare API ile IP adresi eklenemedi." };
    }

};

customerSchema.methods.buyApi = async function (apiData) {

    try {

        if (this.PaymentInfo.Balance < Number(apiData.price)) return { success: false, message: "Bakiyeniz yetersiz." };
        if (!this.IP) return { success: false, message: "IP adresi belirtilmemiş." };

        const sorgu = this.sorgular.find(sorgu => apiData.value === sorgu.name);
        if (sorgu) return { success: false, message: "Zaten bu API'yi satın almışsınız." };

        const promoData = this.PaymentInfo.PromoCodes.find(x => x.type === "refindirim");
        if (promoData && promoData.endDate > Date.now() && promoData?.limit > 0) promoData.limit -= 1;

        this.PaymentInfo.Balance -= Number(apiData.price);
        this.PaymentInfo.History.push({ price: -Number(apiData.price), date: Date.now(), desc: `Mağaza'dan ${apiData.name.toLocaleUpperCase("TR")} API satın alımı.` });
        if (!this.sorgular.length > 0 && this.Discord.ID) {

            await fetch(`https://discord.com/api/guilds/${config.guildID}/members/${this.Discord.ID}/roles/${config.roleID}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bot ${config.bot.token}`
                }
            });

        };
        this.sorgular.push({ name: apiData.value, active: true, startTimestamp: Date.now(), endTimestamp: Date.now() + 30 * 24 * 60 * 60 * 1000, totalLimit: 1000, usedLimit: 0 });
        this.markModified('PaymentInfo');
        await this.save();

        if (this.RefInfo.Auth) {

            const refData = await mongoose.model("whitelist").findOne({ Auth: this.RefInfo.Auth });
            if (refData) {

                const authData = refData.RefInfo.Auths.find(x => x.auth === this.Auth);
                if (authData.limit > 0) {

                    authData.price += Number(apiData.price) * 0.15;
                    authData.limit -= 1;

                    refData.PaymentInfo.History.push({ price: Number(apiData.price) * 0.15, date: Date.now(), desc: `${apiData.name.toLocaleUpperCase("TR")} API satın alımı.`, type: "referans", auth: this.Auth });
                    refData.RefInfo.Balance += Number(apiData.price) * 0.15;
                    refData.PaymentInfo.Total += Number(apiData.price) * 0.15;
                    refData.markModified('RefInfo.Auths');
                    await refData.save();

                };

            };

        };

        return { success: true, message: `${apiData.name} API başarıyla satın alındı.` };

    } catch (err) {
        console.log(err);
        return { success: false, message: "API satın alınırken bir hata oluştu." };
    }

};

customerSchema.methods.extendApi = async function (apiData) {

    try {

        if (this.PaymentInfo.Balance < Number(apiData.price)) return { success: false, message: "Bakiyeniz yetersiz." };
        if (!this.IP) return { success: false, message: "IP adresi belirtilmemiş." };

        const sorgu = this.sorgular.find(sorgu => apiData.value === sorgu.name);
        if (!sorgu) return { success: false, message: "Bu API sizde yok." };

        sorgu.endTimestamp += (30 * 24 * 60 * 60 * 1000);
        this.PaymentInfo.Balance -= Number(apiData.price);
        this.PaymentInfo.History.push({ price: -Number(apiData.price), date: Date.now(), desc: `Mağaza'dan ${apiData.name.toLocaleUpperCase("TR")} API süre uzatımı.` });
        this.markModified('sorgular');
        await this.save();

        if (this.RefInfo.Auth) {

            const refData = await mongoose.model("whitelist").findOne({ Auth: this.RefInfo.Auth });
            if (refData) {

                const authData = refData.RefInfo.Auths.find(x => x.auth === this.Auth);
                if (authData.limit > 0) {

                    authData.price += Number(apiData.price) * 0.15;
                    authData.limit -= 1;

                    refData.PaymentInfo.History.push({ price: Number(apiData.price) * 0.15, date: Date.now(), desc: `${apiData.name.toLocaleUpperCase("TR")} API süre uzatımı.`, type: "referans", auth: this.Auth });
                    refData.RefInfo.Balance += Number(apiData.price) * 0.15;
                    refData.PaymentInfo.Total += Number(apiData.price) * 0.15;
                    refData.markModified('RefInfo.Auths');
                    await refData.save();

                };

            };

        };

        return { success: true, message: `${apiData.name} API başarıyla uzatıldı.` };

    } catch (err) {
        console.log(err);
        return { success: false, message: "API satın alınırken bir hata oluştu." };
    }

};

customerSchema.methods.durumDegis = async function (apiName) {

    try {

        const sorgu = this.sorgular.find(sorgu => apiName === sorgu.name);
        if (!sorgu) return { success: false, message: "API bulunamadı." };
        if (sorgu?.admindondur === true) return { success: false, message: "Admin tarafından dondurulmuş dokunulamaz." };

        const message = sorgu.active ? "API başarıyla donduruldu." : "API başarıyla aktif edildi.";

        if (sorgu.active) {

            sorgu.active = false;
            sorgu.returnTimestamp = Date.now();

        } else {

            sorgu.active = true
            let returnTime = Date.now() - sorgu.returnTimestamp
            sorgu.endTimestamp = sorgu.endTimestamp + returnTime

        }

        this.markModified('sorgular');
        await this.save();

        return { success: true, message: `${sorgu.name} ${message}` };

    } catch (err) {
        console.log(err);
        return { success: false, message: "Bir hata oluştu." };
    }

};

customerSchema.methods.buyBalance = async function (amount, transaction) {

    try {

        if (!Number(amount) || Number(amount) < 0) return { success: false, message: "Geçersiz miktar." };
        if (this.PaymentInfo.History.find(x => x.hash === transaction.hash)) return { success: false, message: "Bu işlem daha önce yapılmış." };

        this.PaymentInfo.Balance += Number(amount);
        this.PaymentInfo.Total += Number(amount);
        this.PaymentInfo.History.push({ price: Number(amount), date: Date.now(), desc: "Kripto ile bakiye yükleme.", type: "kripto", hash: transaction.hash });
        this.markModified('PaymentInfo');
        await this.save();

        return { success: true, message: "Bakiye başarıyla yüklendi." };

    } catch (err) {
        console.log(err);
        return { success: false, message: "Bakiye yüklenirken bir hata oluştu." };
    }

};

customerSchema.methods.redeemCode = async function (code) {

    try {

        const promoCodes = JSON.parse(fs.readFileSync("./Core/Settings/promoList.json", "utf-8"));
        const kod = promoCodes.find(x => x.code == code);

        if (!kod) return { success: false, message: "Kod geçersiz veya kotası doldu." };
        if (this.PaymentInfo.PromoCodes.find(x => x.code == code)) return { success: false, message: "Bu kod zaten kullanılmış." };

        if (kod.type == "bakiye") {

            if (!kod.price || !kod.limit) return { success: false, message: "Kod bilgileri eksik." };

            this.PaymentInfo.Balance += kod.price;
            this.PaymentInfo.Total += kod.price;
            this.PaymentInfo.History.push({ price: Number(kod.price), date: Date.now(), desc: `Promosyon kodu kullanımı.` });
            this.PaymentInfo.PromoCodes.push({ code: kod.code, price: kod.price, type: kod.type });
            await this.save();

            const promoIndex = promoCodes.findIndex(x => x.code == code);
            kod.limit == 1 ? promoCodes.splice(promoIndex, 1) : kod.limit -= 1;
            fs.writeFileSync("./Core/Settings/promoList.json", JSON.stringify(promoCodes, null, 2));

        } else if (kod.type == "indirim") {

            if (!kod.duration || !kod.reduction || !kod.limit || !kod.uselimit) return { success: false, message: "Kod bilgileri eksik." };

            this.PaymentInfo.PromoCodes.push({ code: kod.code, reduction: kod.reduction, type: kod.type, limit: kod.uselimit, endDate: (kod.duration * 24 * 60 * 60 * 1000) + Date.now() });
            await this.save();

            const promoIndex = promoCodes.findIndex(x => x.code == code);
            kod.limit == 1 ? promoCodes.splice(promoIndex, 1) : kod.limit -= 1;
            fs.writeFileSync("./Core/Settings/promoList.json", JSON.stringify(promoCodes, null, 2));

        }

        return { success: true, message: "Kod başarıyla kullanıldı." };

    } catch (err) {
        console.log(err);
        return { success: false, message: "Kod kullanılırken bir hata oluştu." };
    }

};

module.exports = mongoose.model("whitelist", customerSchema);