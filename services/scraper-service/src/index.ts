import init from "@aspecto/opentelemetry";
init({
  aspectoAuth:
    process.env.ASPECTO_AUTH ?? "331a7c4e-945a-4053-8f59-9964d555db9d",
  local: process.env.NODE_ENV !== "production",
  logger: console,
});
import axios from "axios";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { SQS } from "aws-sdk";

// how many wiki pages to return in each batch (api call)
const batchSize: number = +process.env.WIKI_SCRAPER_BATCH_SIZE || 3;

const newArticlesQueueUrl: string =
  "https://sqs.eu-west-1.amazonaws.com/731241200085/demo-new-wiki-article";
const sqs = new SQS();

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

const getServiceUrl = (serviceName: string) => {
  const copilotServiceEndpoint = process.env.COPILOT_SERVICE_DISCOVERY_ENDPOINT;
  if (copilotServiceEndpoint) {
    return `http://${serviceName}.${copilotServiceEndpoint}`;
  }
  return `http://${serviceName}`;
};

const middleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query;
    if (!token) return res.sendStatus(401);
    const userResponse = await axios({
      url: `${getServiceUrl("user-service")}:8080/user/token?token=${token}`,
    });
    if (!userResponse.data) return res.sendStatus(401);

    res.locals.user = userResponse.data;
    next();
  } catch (e) {
    console.error(e.message, e);
    res.sendStatus(500);
  }
};

const app = express();
app.use(cors());
app.get("/", (_req, res) => {
  res.send("ok");
});
app.post("/:searchTerm", middleware, async (req: Request, res: Response) => {
  const searchTerm = req.params.searchTerm;
  try {
    await pollWikipediaArticles(searchTerm);
    const info = {
      searchTerm,
    };
    res.status(200).send(info);
  } catch (e) {
    console.error("failed to poll articles batch from wikipedia", e);
    res.status(500).send(e);
  }
});

(() => {
  try {
    app.listen(8080);
    console.log("wikipedia scraper started");
  } catch (e) {
    console.error("failed to init service", e);
  }
})();
