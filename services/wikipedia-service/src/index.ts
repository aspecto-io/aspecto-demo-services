import initAspecto from "@aspecto/opentelemetry";
initAspecto({
  local: true,
  logger: console,
});
import { SQS } from "aws-sdk";
import mongoose from "mongoose";
import express from "express";
import axios from "axios";
import Redis from "ioredis";

let queueUrl;
const sqs = new SQS({
  endpoint: "http://localstack:4566",
  region: "us-east-1", // the default region for localstack
});

const redis = new Redis("redis");

const articleSchema = new mongoose.Schema({
  title: { type: String },
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
    console.log(m.Body);
    const article = new ArticleModel({
      title: m.Body,
    });
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
      console.log(
        "failed to process message from sqs, will try again in 2 seconds",
        e
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
};

const app = express();
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
    const allArticles = await ArticleModel.find({});
    res.json(allArticles);
  } catch (e) {
    console.log("failed to get all articles", e);
    res.status(500);
  }
});

articlesRouter.get("/:id", async (req, res) => {
  const articleId = req.params.id;
  try {
    const cachedValue = await redis.get(articleId);
    if (cachedValue) {
      res.send(cachedValue);
      return;
    }

    const article = await ArticleModel.findOne({ _id: articleId });
    if (!article) res.sendStatus(404);
    else {
      redis.set(article._id, JSON.stringify(article));
      res.json(article);
    }
  } catch (e) {
    console.log("failed to get article", { articleId: articleId }, e);
    res.sendStatus(500);
  }
});

app.use("/articles", articlesRouter);

const initSqs = async () => {
  const res = await sqs
    .createQueue({
      QueueName: "new-wiki-article",
    })
    .promise();
  queueUrl = res.QueueUrl;
  console.log("sqs receive queue ready", { queueUrl });
};

const initService = async () => {
  await Promise.all([mongoose.connect("mongodb://db/aspecto-demo"), initSqs()]);
  app.listen(8080);
  console.log("wikipedia service started");
  sqsProcessingLoop();
};
initService();

