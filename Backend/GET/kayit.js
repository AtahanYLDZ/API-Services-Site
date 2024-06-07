const customerSchema = require("../../Database/Schemas/customerSchema");
const path = require('node:path');
const { verifyJwt } = require("../../Core/Functions/functions");

module.exports = {
    name: "kayit",
    async execute(req, res, v, ip) {

        try {

            const { token, ref } = req.query;
            if (!token && !ref) return res.redirect("/giris")//res.render(`../Pages/${this.name}.ejs`);

            if (ref) {

                if (!await customerSchema.findOne({ Auth: ref })) return res.redirect("/giris");
                return res.render(`../Pages/${this.name}.ejs`, { ref });

            };

            const data = verifyJwt(token);
            if (!data) return res.render(`../Pages/${this.name}.ejs`, { mesaj: "Linkin süresi doldu." });

            return res.redirect(`/dogrula?token=${token}`);

        } catch (err) {
            console.log(err);
        }

    }
};