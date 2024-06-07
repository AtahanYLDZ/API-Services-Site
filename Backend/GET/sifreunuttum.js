const customerSchema = require("../../Database/Schemas/customerSchema");
const path = require('node:path');
const fs = require("node:fs");
const { verifyJwt } = require("../../Core/Functions/functions");

module.exports = {
    name: "sifreunuttum",
    async execute(req, res) {

        try {

            const { token } = req.query;
            if (!token) return res.render(`../Pages/${this.name}.ejs`);

            const decoded = verifyJwt(token);
            if (!decoded || req.session?.mailauth === "expired") return res.render(`../Pages/${this.name}.ejs`, { success: false, mesaj: "Linkinizin suresi sona ermistir." });

            const { Auth } = decoded;

            req.session.mailauth = Auth;

            return res.render(`../Pages/${this.name}.ejs`, { sifredegis: true });

        } catch (err) {
            console.log(err);
        }

    }
};