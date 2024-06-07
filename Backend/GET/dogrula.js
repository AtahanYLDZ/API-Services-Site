const customerSchema = require("../../Database/Schemas/customerSchema");
const { verifyJwt } = require("../../Core/Functions/functions");

module.exports = {
    name: "dogrula",
    async execute(req, res, v, ip) {

        try {

            const { token } = req.query;
            if (!token) return res.redirect("/anasayfa");

            const decoded = verifyJwt(token);
            console.log(decoded)
            if (!decoded) return res.render(`../Pages/${this.name}.ejs`, { success: false, message: "Linkinizin süresi sona ermiştir." });

            const { Auth, type, data } = decoded;

            if (type === "giris") {

                const mongoData = await customerSchema.findOne({ Auth });
                if (!mongoData) return res.render(`../Pages/${this.name}.ejs`, { success: false, message: "Siteye kayıtlı böyle bir hesap bulunamadı." });

                /*mongoData.LastLogin.push(data);
                mongoData.markModified("LastLogin");
                await mongoData.save();*/

                return res.render(`../Pages/${this.name}.ejs`, { success: true, message: "Giriş başarıyla doğrulandı." });

            } else if (type === "kayit") {

                let mongoData = await customerSchema.findOne({ Auth }) || await customerSchema.findOne({ Email: data.email });
                if (mongoData) return res.render(`../Pages/${this.name}.ejs`, { success: false, message: "Böyle bir hesap zaten mevcut." });

                if (!mongoData) mongoData = await customerSchema.create({ Auth, Email: data.email, Password: data.Password, ChangedPassword: true, LastLogin: [{ platform: req.useragent.platform, os: req.useragent.os, ip, date: Date.now(), useragent: req.useragent.source }] })
    
                if (data?.ref) {
    
                    const refData = await customerSchema.findOne({ Auth: data.ref });
                    if (data.ref == mongoData.Auth || !refData) return res.render(`../Pages/${this.name}.ejs`, { mesaj: "Referans bulunamadı." });
    
                    mongoData.PaymentInfo.PromoCodes.push({ code: `referans-${data.ref}`, type: "indirim", reduction: 25, limit: 3, endDate: (30 * 24 * 60 * 60 * 1000) + Date.now() });
                    mongoData.RefInfo.Auth = data.ref;
                    await mongoData.save();
    
                    refData.RefInfo.Auths.push({ auth: Auth, date: Date.now(), price: 0, limit: 5 });
                    refData.markModified("RefInfo.Auths");
                    await refData.save();
    
                };

                return res.render(`../Pages/${this.name}.ejs`, { success: true, message: "Hesabınız başarıyla oluşturuldu." });

            };

            return res.render(`../Pages/${this.name}.ejs`, data);

        } catch (err) {
            console.log(err);
            return res.redirect("/404");
        }

    }
};