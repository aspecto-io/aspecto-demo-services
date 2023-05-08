const Sentry = require("@sentry/node");
const {
  SentrySpanProcessor,
  SentryPropagator,
} = require("@sentry/opentelemetry-node");
// import { ProfilingIntegration } from "@sentry/profiling-node";

const opentelemetry = require("@opentelemetry/sdk-node");
const otelApi = require("@opentelemetry/api");
const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");
const {
  OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-grpc");

// Make sure to call `Sentry.init` BEFORE initializing the OpenTelemetry SDK
Sentry.init({
  dsn: "https://4d10ceef9ebb4b42a22a2a7cc4636448@o33832.ingest.sentry.io/74396",
  tracesSampleRate: 1.0,
  // set the instrumenter to use OpenTelemetry instead of Sentry
  instrumenter: "otel",
  // profilesSampleRate: 1.0, // Profiling sample rate is relative to tracesSampleRate
  // integrations: [
  //   // Add profiling integration to list of integrations
  //   new ProfilingIntegration(),
  // ],
  // ...
});

const sdk = new opentelemetry.NodeSDK({
  // Existing config
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [getNodeAutoInstrumentations()],

  // Sentry config
  spanProcessor: new SentrySpanProcessor(),
  textMapPropagator: new SentryPropagator(),
});

sdk.start();
import { SQS } from "aws-sdk";
import { Consumer } from "sqs-consumer";
import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import axios from "axios";
import Redis from "ioredis";

var Rollbar = require('rollbar');
var rollbar = new Rollbar({
  accessToken: '7e69e2a251d8446f8fb774183ab1a288',
  captureUncaught: true,
  captureUnhandledRejections: true,
  payload: {
    code_version: '1.0.0',
  }
});

const sqs = new SQS({
  endpoint: "http://localstack:4566",
});

const redis = new Redis("articles-cache");

const articleSchema = new mongoose.Schema({
  title: { type: String },
  pageId: { type: Number },
  rating: { type: Number, required: false },
});
const ArticleModel = mongoose.model("Article", articleSchema);

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(async (req, res, next) => {
  try {
    const { token } = req.query;
    if (token) {
      const userResponse = await axios({
        url: `http://user-service:8080/user/token?token=${token}`,
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
    const { rating } = req.body;
    console.log("post request to set rating on article", { articleId, rating });
    if (rating === undefined) {
      res.status(400).send("no rating is set in request body");
      return;
    }
    await ArticleModel.updateOne({ _id: articleId }, { rating });
    throw new Error("Failed to update item rating");

    await redis.del(articleId);
    res.sendStatus(200);
  } catch (err) {
    console.error("failed to set rating for article", { articleId });
    res.sendStatus(500);
    throw err;
  }
});

app.use("/article", articlesRouter);

const initSqs = async (): Promise<string> => {
  const queueName = "new-wiki-article";
  try {
    console.log("will try to create sqs queue", { queueName });
    const res = await sqs
      .createQueue({
        QueueName: queueName,
      })
      .promise();
    console.log("sqs receive queue ready", { queueUrl: res.QueueUrl });
    return res.QueueUrl;
  } catch (err) {
    console.error("failed to create sqs queue", { queueName });
    throw err;
  }
};

const connectToMongo = async () => {
  console.log("attempting to connect to mongodb");
  await mongoose.connect("mongodb://db/aspecto-demo", {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useFindAndModify: true,
  });
  console.log("mongo db connected");
};

const initServer = async () => {
  await connectToMongo();
  app.listen(8080);
  console.log("wikipedia service started in mode server");
};

const initProcessor = async () => {
  const [_, queueUrl] = await Promise.all([connectToMongo(), initSqs()]);
  console.log("wikipedia service started in mode processor");

  const sqsConsumer = Consumer.create({
    queueUrl,
    batchSize: 2,
    waitTimeSeconds: 20,
    pollingWaitTimeMs: 10000,
    handleMessage: async (message) => {
      const { title, pageId } = JSON.parse(message.Body);
      console.log("processing new article from sqs", { title, pageId });
      const article = new ArticleModel({ title, pageId });
      await article.save();
    },
  });
  sqsConsumer.on("error", (err) => console.error(err.message));
  sqsConsumer.on("processing_error", (err) => console.error(err.message));
  sqsConsumer.start();
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
