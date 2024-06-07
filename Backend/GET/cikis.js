const customerSchema = require("../../Database/Schemas/customerSchema");

module.exports = {
    name: "cikis",
    async execute(req, res) {

        try {

            await req.session.destroy();              

            return res.redirect("/giris");

        } catch (err) {
            console.log(err);
        }

    }
};