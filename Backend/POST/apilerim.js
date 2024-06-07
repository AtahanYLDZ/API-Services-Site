const customerSchema = require("../../Database/Schemas/customerSchema");
const path = require('node:path');
const fs = require("node:fs");

module.exports = {
    name: "apilerim",
    async execute(req, res, mongoData) {

        try {

            const { api } = req.body;

            const result = await mongoData.durumDegis(api);
            return res.json(result);

        } catch (err) {
            console.log(err);
        }

    }
};