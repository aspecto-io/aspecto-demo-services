import init from "@aspecto/opentelemetry";
init({
  aspectoAuth:
    process.env.ASPECTO_AUTH ?? "e97d7a26-db48-4afd-bba2-be4d453047eb",
  local: true,
  logger: console,
});
import axios from "axios";
import express from "express";
import cors from "cors";
import { SQS } from "aws-sdk";

// how many wiki pages to return in each batch (api call)
const batchSize: number = +process.env.WIKI_SCRAPER_BATCH_SIZE || 3;

let newArticlesQueueUrl;
const sqs = new SQS({
  endpoint: "http://localstack:4566",
});

const createQueue = async (queueName): Promise<string> => {
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
    res.data.query.search.map((article) => {
      console.log('sending wikipedia article to SQS queue for processing', {title: article.title});
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
app.use(cors());
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
      res.sendStatus(401);
    }
  } catch (e) {
    console.error(e.message, e);
    res.sendStatus(500);
  }
});

const pollRouter = express.Router();

pollRouter.post("/:searchTerm", async (req, res) => {
  const searchTerm = req.params.searchTerm;
  try {
    await pollWikipediaArticles(searchTerm);
    const info = {
      searchTerm,
    };
    res.status(200).send(info);
  } catch (e) {
    console.error("failed to poll articles batch from wikipedia", e);
    res.status(500);
  }
});

app.use("/poll", pollRouter);

(async () => {
  try {
    await initSqs();
    app.listen(8080);
    console.log("wikipedia scraper started");
  } catch (e) {
    console.error("failed to init service", e);
  }
})();
