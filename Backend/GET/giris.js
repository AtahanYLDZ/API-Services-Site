const customerSchema = require("../../Database/Schemas/customerSchema");

module.exports = {
    name: "Deneme/giris3",
    async execute(req, res, v, ip) {

        try {

            return res.render(`../Pages/${this.name}.ejs`);

        } catch (err) {
            console.log(err);
        }

    }
};