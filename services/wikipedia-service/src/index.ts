import initAspecto from "@aspecto/opentelemetry";
initAspecto({
  aspectoAuth:
    process.env.ASPECTO_AUTH ?? "331a7c4e-945a-4053-8f59-9964d555db9d",
  local: process.env.NODE_ENV !== "production",
  logger: console,
  packageName: `wikipedia-service(${process.env.MODE.toLowerCase()})`,
});
import { Consumer } from "sqs-consumer";
import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import axios from "axios";
import Redis from "ioredis";

const redis = new Redis("articles-cache");

const articleSchema = new mongoose.Schema({
  title: { type: String },
  pageId: { type: Number },
  rating: { type: Number, required: false }, 
});
const ArticleModel = mongoose.model("Article", articleSchema);

const getServiceUrl = (serviceName: string) => {
  const copilotServiceEndpoint = process.env.COPILOT_SERVICE_DISCOVERY_ENDPOINT;
  if (copilotServiceEndpoint) {
    return `://${serviceName}.${copilotServiceEndpoint}`;
  }
  return `://${serviceName}`;
};

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(async (req, res, next) => {
  try {
    const { token } = req.query;
    if (token) {
      const userResponse = await axios({
        url: `http${getServiceUrl(
          "user-service"
        )}:8080/user/token?token=${token}`,
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
    await redis.del(articleId);
    res.sendStatus(200);
  } catch (err) {
    console.error("failed to set rating for article", { articleId });
    res.sendStatus(500);
  }
});

app.use("/article", articlesRouter);

const connectToMongo = async () => {
  console.log("attempting to connect to mongodb");
  await mongoose.connect(`mongodb${getServiceUrl("db")}/aspecto-demo`, {
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
  await connectToMongo();
  console.log("wikipedia service started in mode processor");

  const sqsConsumer = Consumer.create({
    queueUrl:
      "https://sqs.eu-west-1.amazonaws.com/731241200085/demo-new-wiki-article",
    batchSize: 10,
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
