import init from "@aspecto/opentelemetry";
init({
  local: true,
  logger: console,
});
import axios from "axios";
import express from "express";
import { SQS } from "aws-sdk";

let queueUrl;
const sqs = new SQS({
  endpoint: "http://localstack:4566",
  region: "us-east-1", // the default region for localstack
});

const initSqs = async () => {
  const res = await sqs.createQueue({
    QueueName: 'new-wiki-article'
  }).promise();
  queueUrl = res.QueueUrl;
  console.log("sqs send queue ready", { queueUrl });
}

// how many wiki pages to return in each batch (api call)
const batchSize: number = +process.env.WIKI_SCRAPER_BATCH_SIZE || 4;

const pollWikipediaArticles = async (offset: number, searchTerm: string): Promise<number> => {
  const res = await axios.get("https://en.wikipedia.org/w/api.php", {
    params: {
      action: "query",
      list: "search",
      srsearch: searchTerm,
      srlimit: batchSize,
      srnamespace: 0, // search only articles
      format: "json",
      sroffset: offset,
    },
  });

  await Promise.all(res.data.query.search.map(article =>
    sqs.sendMessage({
      QueueUrl: queueUrl,
      MessageBody: article.title
    }).promise()
  ));

  const continueOffset = res.data.continue?.sroffset;
  return continueOffset;
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

const continueOffsetBySearchTerm: Record<string, number> = {};

const pollRouter = express.Router();

pollRouter.get("/:searchTerm", async (req, res) => {
  const searchTerm = req.params.searchTerm;
  try {
    if(!(searchTerm in continueOffsetBySearchTerm)) {
      console.log(`request to poll search term ${searchTerm} for the first time. setting continue offset to 0`);
      continueOffsetBySearchTerm[searchTerm] = 0;
    }
    const continueOffset = continueOffsetBySearchTerm[searchTerm];
    const newContinueOffset = await pollWikipediaArticles(continueOffset, searchTerm);
    continueOffsetBySearchTerm[searchTerm] = newContinueOffset;

    res.status(200).send({
      totalArticlesRead: newContinueOffset,
      batchArticlesRead: newContinueOffset - continueOffset
    });
  } catch (e) {
    console.log("failed to get poll article from wikipedia", e);
    res.status(500);
  }
});

app.use("/poll", pollRouter);

(async () => {
  try {
    await initSqs();
    app.listen(8080);
    console.log("wikipedia scraper started");
  } catch(e) {
    console.log('failed to init service', e);
  }
})();
