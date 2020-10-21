import initAspecto from "@aspecto/opentelemetry";
initAspecto({
  aspectoAuth: process.env.ASPECTO_AUTH ?? 'e97d7a26-db48-4afd-bba2-be4d453047eb',
  local: true,
  logger: console,
  packageName: `wikipedia-service(${process.env.MODE.toLowerCase()})`,
});
import { SQS } from "aws-sdk";
import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import bodyParser from 'body-parser';
import axios from "axios";
import Redis from "ioredis";

let queueUrl;
const sqs = new SQS({
  endpoint: "http://localstack:4566",
});

const redis = new Redis("redis");

const articleSchema = new mongoose.Schema({
  title: { type: String },
  pageId: { type: Number },
  rating: { type: Number, required: false }
});
const ArticleModel = mongoose.model("Article", articleSchema);

const handleSqsBatch = async () => {
  const res = await sqs
    .receiveMessage({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 2,
      WaitTimeSeconds: 20,
    })
    .promise();

  if (!res.Messages) return;

  // process messages
  res.Messages.forEach((m) => {
    const {title, pageId} = JSON.parse(m.Body);
    console.log("processing new article from sqs", {title, pageId});
    const article = new ArticleModel({title, pageId});
    article.save();
  });

  await Promise.all(
    res.Messages.map((m) =>
      sqs
        .deleteMessage({
          QueueUrl: queueUrl,
          ReceiptHandle: m.ReceiptHandle,
        })
        .promise()
    )
  );
};

const sqsProcessingLoop = async () => {
  while (true) {
    try {
      await handleSqsBatch();
    } catch (e) {
      console.warn(
        "failed to process message from sqs, will try again soon",
        e
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 10 * 1000));
  }
};

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(async (req, res, next) => {
  try {
    const { token } = req.query;
    if (token) {
      const userResponse = await axios({
        url: `http://user:8080/user/token?token=${token}`,
      });
      if (userResponse.data) {
        res.locals.user = userResponse.data;
        next();
      } else {
        res.sendStatus(401);
      }
    } else {
      console.info(
        "token missing in query string for incoming http request",
        req.path
      );
      res.sendStatus(401);
    }
  } catch (e) {
    console.error(e.message, e);
    res.sendStatus(500);
  }
});

const articlesRouter = express.Router();

articlesRouter.get("/", async (req, res) => {
  try {
    console.log("querying db for all article ids");
    const allArticlesIds = await ArticleModel.aggregate([
      { $project: { id: 1, title: 1 } },
    ]);
    console.log(`Returning ids of all ${allArticlesIds.length} articles in db`);
    res.json(allArticlesIds);
  } catch (e) {
    console.error("Failed to get all article ids", e);
    res.status(500);
  }
});

articlesRouter.get("/:id", async (req, res) => {
  const articleId = req.params.id;
  try {
    console.log("get request for article", { articleId });
    const cachedValue = await redis.get(articleId);
    if (cachedValue) {
      console.log("returning article info from redis cache", { articleId });
      res.send(cachedValue);
      return;
    }

    console.log("article not found in cache, querying in mongodb", {
      articleId,
    });
    const article = await ArticleModel.findOne({ _id: articleId });
    if (!article) res.sendStatus(404);
    else {
      console.log("article found in mongodb. storing it in redis");
      redis.set(article._id, JSON.stringify(article));
      res.json(article);
    }
  } catch (e) {
    console.error("failed to get article", { articleId: articleId }, e);
    res.sendStatus(500);
  }
});

articlesRouter.post("/:id/rating", async (req, res) => {
  const articleId = req.params.id;
  try {
    const {rating} = req.body;
    console.log("post request to set rating on article", { articleId, rating });
    if(rating === undefined) {
      res.status(400).send("no rating is set in request body");
      return;
    }
    await ArticleModel.updateOne({ _id: articleId }, {rating});
    await redis.del(articleId);
    res.sendStatus(200);
  } catch(err) {
    console.error("failed to set rating for article", {articleId});
    res.sendStatus(500);
  }
});


app.use("/article", articlesRouter);

const initSqs = async () => {
  const queueName = "new-wiki-article";
  try {
    console.log('will try to create sqs queue', {queueName});
    const res = await sqs
      .createQueue({
        QueueName: queueName,
      })
      .promise();
    queueUrl = res.QueueUrl;
    console.log("sqs receive queue ready", { queueUrl });
  } catch (err) {
    console.error("failed to create sqs queue", { queueName });
    throw err;
  }
};

const connectToMongo = async () => {
  console.log('attempting to connect to mongodb');
  await mongoose.connect("mongodb://db/aspecto-demo");
  console.log('mongo db connected');
}

const initServer = async () => {
  await connectToMongo();
  app.listen(8080);
  console.log("wikipedia service started in mode server");
};

const initProcessor = async () => {
  await Promise.all([connectToMongo(), initSqs()]);
  console.log("wikipedia service started in mode processor");
  sqsProcessingLoop();
};

console.log(`service in mode ${process.env.MODE}`);

switch (process.env.MODE) {
  case "PROCESSOR":
    initProcessor();
    break;
  case "SERVER":
    initServer();
    break;
  default:
    console.error(
      'environment variable MODE should be set to either "PROCESSOR" or "SERVER"'
    );
}
