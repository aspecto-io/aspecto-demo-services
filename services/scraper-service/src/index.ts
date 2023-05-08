// import { ProfilingIntegration } from "@sentry/profiling-node";
const Sentry = require("@sentry/node");
const {
  SentrySpanProcessor,
  SentryPropagator,
} = require("@sentry/opentelemetry-node");

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
import axios from "axios";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { SQS } from "aws-sdk";

var Rollbar = require('rollbar');
var rollbar = new Rollbar({
  accessToken: '7e69e2a251d8446f8fb774183ab1a288',
  captureUncaught: true,
  captureUnhandledRejections: true,
  payload: {
    code_version: '1.0.0',
  }
});

// how many wiki pages to return in each batch (api call)
const batchSize: number = +process.env.WIKI_SCRAPER_BATCH_SIZE || 3;

let newArticlesQueueUrl: string;
const sqs = new SQS({
  endpoint: "http://localstack:4566",
});

const createQueue = async (queueName: string): Promise<string> => {
  try {
    console.log("will create an sqs queue", { queueName });
    const newArticleQueueRes = await sqs
      .createQueue({
        QueueName: queueName,
      })
      .promise();
    console.log("queue is ready", {
      queueUrl: newArticleQueueRes.QueueUrl,
      queueName,
    });
    return newArticleQueueRes.QueueUrl;
  } catch (err) {
    console.error("failed to create sqs queue. exiting", { queueName });
    throw err;
  }
};

const initSqs = async () => {
  newArticlesQueueUrl = await createQueue("new-wiki-article");
};

const pollWikipediaArticles = async (searchTerm: string): Promise<number> => {
  console.log("sending search query to wikipedia", {
    searchTerm,
    batchSize,
  });
  const res = await axios.get("https://en.wikipedia.org/w/api.php", {
    params: {
      action: "query",
      list: "search",
      srsearch: searchTerm,
      srlimit: batchSize,
      srnamespace: 0, // search only articles
      format: "json",
      sroffset: 0,
    },
  });

  console.log("wikipedia returned result for search", {
    continueOffset: res.data?.continue?.sroffset,
    totalHits: res.data?.query?.searchinfo?.totalhits,
    currentBatchSize: res.data?.query?.search?.length,
  });

  await Promise.all(
    res.data.query.search.map((article: any) => {
      console.log("sending wikipedia article to SQS queue for processing", {
        title: article.title,
      });
      return sqs
        .sendMessage({
          QueueUrl: newArticlesQueueUrl,
          MessageBody: JSON.stringify({
            title: article.title,
            pageId: article.pageid,
          }),
        })
        .promise();
    })
  );

  const continueOffset = res.data.continue?.sroffset;
  return continueOffset;
};

const app = express();
app
  .use(cors())
  .use(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.query;
      if (!token) return res.sendStatus(401);
      const userResponse = await axios({
        url: `http://user-service:8080/user/token?token=${token}`,
      });
      if (!userResponse.data) return res.sendStatus(401);

      res.locals.user = userResponse.data;
      next();
    } catch (e) {
      console.error(e.message, e);
      res.sendStatus(500);
    }
  })
  .post("/:searchTerm", async (req: Request, res: Response) => {
    const searchTerm = req.params.searchTerm;
    try {
      await pollWikipediaArticles(searchTerm);
      const info = {
        searchTerm,
      };
      res.status(200).send(info);
    } catch (e) {
      console.error("failed to poll articles batch from wikipedia", e);
      res.sendStatus(500);
    }
  });

(async () => {
  try {
    await initSqs();
    app.listen(8080);
    console.log("wikipedia scraper started");
  } catch (e) {
    console.error("failed to init service", e);
  }
})();
