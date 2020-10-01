import init from "@aspecto/opentelemetry";
init({
    local: true,
    logger: console,
})

import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import axios from "axios";

let itemModel: mongoose.Model<mongoose.Document, any>;

const app = express();
app.use(bodyParser.json());
app.use(cors({}))
app.use(async (req, res, next) => {
    try {
        const { token } = req.query;
        if (token) {
            const userResponse = await axios({
                url: `http://user:8080/user/token?token=${token}`
            });
            if (userResponse.data) {
                res.locals.user = userResponse.data;
                next()
            } else {
                res.sendStatus(401);
            }
        } else {
            res.sendStatus(401);
        }
    } catch (e) {
        console.error(e.message, e);
        res.sendStatus(500);
    }
})

app.get('/items', async (req, res) => {
    try {

        if (itemModel) {
            const items = await itemModel.find();
            if (items) {
                res.json(items);
            } else {
                res.sendStatus(404);
            }
        } else {
            res.status(500).json({ message: "DB isn't ready yet" });
        }
    } catch (e) {
        res.status(500).json({ error: e })
        console.error(`Failed to login`, e)
    }
})

app.listen(8080);
console.log('Item service is ready!');

getDBModel().then((model) => {
    itemModel = model;
});

async function getDBModel() {
    const itemSchema = new mongoose.Schema({
        name: String,
        description: String,
        image: String,
        basePrice: Number,
    });

    const Item = mongoose.model('Items', itemSchema);

    await mongoose.connect('mongodb://db/aspecto-demo');

    if (await Item.count({}) === 0) {
        new Item({
            name: 'Mac',
            description: '2020 Mac Book Pro',
            basePrice: 999,
            image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcRxyjo7-YLKmIGNXsqHvmXni9IPSTVDSJh6trklH4ZuD49tVziwboPBW-IgXErNcgcvDKfGKi8&usqp=CAc'
        }).save();

        new Item({
            name: 'Boss',
            description: 'Noise cancellation headset',
            basePrice: 350,
            image: 'https://www.netoneto.co.il/images/itempics/qc352_17042019131030_large.jpg'
        }).save();

        new Item({
            name: 'Nespresso',
            description: 'Really good Nespresso',
            basePrice: 500,
            image: 'https://www.lastprice.co.il/uploadimages/VERTU-BK1.jpg'
        }).save();
    }


    console.log('Mongo is ready!');

    return Item;
}
