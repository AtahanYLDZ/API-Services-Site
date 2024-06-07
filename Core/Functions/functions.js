const nodemailer = require("nodemailer");
const config = require("../Settings/config");
const jwt = require("jsonwebtoken");
const fs = require("node:fs");
const ejs = require("ejs");
const stuffs = require("stuffs");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const code = stuffs.randomString(16);

const sendMail = async (to, token, mongoData, name, site, extra) => {

    try {

        const mail = await nodemailer.createTransport(config.mail);
        const url = `https://${site}/${name}?token=${token}`;

        const html = ejs.render(fs.readFileSync(`./Pages/Mail/${name}.ejs`, "utf-8"), { url, mongoData, extra });

        const info = await mail.sendMail({
            from: 'Perla Servis',
            to,
            subject: 'Perla Servis Doğrulama Sistemi',
            html
        });

        return true;

    } catch (err) {
        console.log(err)
        return false;
    }

};

const genJwtToken = (data) => {

    try {

        const token = jwt.sign(data, code, { expiresIn: '5m' });
        return token;

    } catch (err) {
        console.log(err)
        return false;
    }

};

const verifyJwt = (token) => {

    try {

        const decoded = jwt.verify(token, code);
        if (!decoded) return false;

        if (decoded.exp <= Date.now() / 1000) return false;
        
        return decoded;

    } catch (err) {
        console.log(err)
        return false;
    }

};

let users = global.kriptousers = new Map();
const createTransaction = async (TRY, auth) => {

    try {

        const trx = await fetch(`https://api.coinpaprika.com/v1/coins/trx-tron/markets?quotes=TRY`);
        const trxJson = await trx.json();
        const trxPrice = trxJson[0].quotes.TRY.price;

        const price = parseFloat((TRY / trxPrice).toFixed(3));
        const kesinti = parseFloat((price * 0.02));
        const randomDecimal = parseFloat((Math.random() * 0.1).toFixed(3));
        const finalPrice = parseFloat((price - randomDecimal - kesinti).toFixed(3));

        const json = { price: finalPrice, timestamp: Date.now() - 5 * 60000, try: TRY };
        users.set(auth, json);
        return json;

    } catch (err) {
        console.log(err);
        return false;
    }

};

const checkTransaction = async (auth) => {

    try {

        const user = users.get(auth) || null;
        if (!user) return false;

        const response = await fetch(`https://apilist.tronscanapi.com/api/transaction?sort=-timestamp&limit=5&count=true&start=0&address=${config.kripto}&start_timestamp=${user.timestamp}`);
        const responseJson = await response.json();
        const transactions = responseJson.data;

        let foundTransaction = null;
        for (let i = -1; i <= 1; i++) {

            foundTransaction = transactions.find(transaction =>
                transaction.contractData.to_address === config.kripto &&
                parseFloat((transaction.contractData.amount / 1000000).toFixed(3)) === user.price + i &&
                transaction.result === "SUCCESS" &&
                transaction.confirmed === true &&
                transaction.tokenInfo.tokenName === "trx"
            );

            if (foundTransaction) break;

        };
        
        return foundTransaction;

    } catch (err) {
        console.log(err);
        return false;
    }

};

module.exports = {
    sendMail,
    genJwtToken,
    verifyJwt,
    createTransaction,
    checkTransaction
};