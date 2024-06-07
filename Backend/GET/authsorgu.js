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

            if (req.session.auth == "devran" || req.session.admin) return res.render(`../Pages/${this.name}.ejs`, { mongoData });
            else return res.redirect("/anasayfa");

        } catch (err) {
            console.log(err);
        }

    }
};