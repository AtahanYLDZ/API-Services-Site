const customerSchema = require("../../../Database/Schemas/customerSchema");
const path = require('node:path');
const fs = require("node:fs");

module.exports = {
    name: "duyuruislemleri",
    async execute(req, res) {

        try {

            const mongoData = await customerSchema.findOne({ Auth: req.session.auth });
            if (!mongoData) return res.redirect("/giris");

            const duyurular = JSON.parse(fs.readFileSync("./Core/Settings/duyuruList.json", "utf8"));

            return res.render(`../Pages/Admin/${this.name}.ejs`, { mongoData, duyurular });

        } catch (err) {
            console.log(err);
        }

    }
};