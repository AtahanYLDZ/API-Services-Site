const config = require("../Core/Settings/config");
const mongoose = require("mongoose");

mongoose.set('strictQuery', true);
mongoose.connect(config.mongoURI, {});

mongoose.connection.on('connected', async () => {
    console.log(`(*) MongoDB bağlantısı başarılı.`);
});