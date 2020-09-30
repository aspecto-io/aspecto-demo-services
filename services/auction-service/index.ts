import init from "@aspecto/opentelemetry";
init({
    local: true,
    logger: console,
    aspectoAuth: '8b04271f-ca7c-470a-b0fd-b7fa4f012240'
})

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import axios from "axios";
import Redis from "ioredis";
import { SQS } from "aws-sdk";

let items: [];
const redis = getRedisConn();

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

app.get('/auctions/live', async (req, res) => {
    try {
        const mac = await redis.get('Mac');
        console.log('got item', mac);
        res.json({ item: JSON.stringify(mac) })
    } catch (e) {
        res.status(500).json({ error: e })
        console.error(`Failed to get live auction`, e)
    }
})

app.listen(8080);
console.log('Auction service is ready!');

function getRedisConn() {
    return new Redis(6379, "redis");
}

async function syncItems() {
    try {
        const allItems = await axios({
            url: `http://item:8080/items?token=123456`
        });

        items = allItems.data;

        items?.forEach((item: any) => {
            redis.set(item.name, JSON.stringify(item));
        })
    } catch (e) {
        console.error(`Error while syncing items ${e}`, e)
    }
}

(async () => {
    setTimeout(async () => {
        await syncItems();
    }, 5000)
})();

(async () => {
    try {
        const sqs = new SQS({
            endpoint: 'http://localhost:4566'
        });
        sqs.createQueue({ QueueName: 'items-changes-stream' });
    } catch (e) {
        console.error("While creating sqs" + e, e)
    }
})();
