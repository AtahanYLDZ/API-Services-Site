const customerSchema = require("../../../Database/Schemas/customerSchema");
const path = require('node:path');
const fs = require("node:fs");

module.exports = {
    name: "duyuruislemleri",
    async execute(req, res) {

        try {

            const { data, id, duyuru } = req.body;

            const mongoData = await customerSchema.findOne({ Auth: req.session.auth });
            if (!mongoData) return res.redirect("/giris");

            const duyurular = JSON.parse(fs.readFileSync("./Core/Settings/duyuruList.json", "utf8"));

            if (duyuru) {

                const paylasan = ["servis","atahan","atahanyldz"].includes(mongoData.Auth) ? "AtahanYLDZ" : "Hoster";
                const newDuyuru = [...duyurular, { id: `#${duyurular.length + 1}`, author: paylasan, desc: duyuru, date: Date.now() }];
                fs.writeFileSync("./Core/Settings/duyuruList.json", JSON.stringify(newDuyuru, null, 2), "utf8");

                return res.render(`../Pages/Admin/${this.name}.ejs`, { mongoData, duyurular: newDuyuru });

            };
            if (data) {

                const newDuyuru = [];
                await Promise.all(data.map(async(x, i) => {
                    
                    const duyuru = duyurular.find(c => c.id === x.id);
                    if (!duyuru) return;

                    return newDuyuru.push({
                        id: duyuru.id,
                        author: duyuru.author,
                        desc: x.desc,
                        date: duyuru.date,
                    });

                }));

                fs.writeFileSync("./Core/Settings/duyuruList.json", JSON.stringify(newDuyuru, null, 2), "utf8");

            };
            if (id) {

                const newDuyuru = duyurular.filter(x => x.id !== id);
                fs.writeFileSync("./Core/Settings/duyuruList.json", JSON.stringify(newDuyuru, null, 2), "utf8");

            }

            return res.render(`../Pages/Admin/${this.name}.ejs`, { mongoData, duyurular });

        } catch (err) {
            console.log(err);
        }

    }
};