import init from "@aspecto/opentelemetry";
init({
  local: true,
  logger: console,
});
import axios from "axios";
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

// set the search term which is going to be scraped from wikipedia
// the default (if not set as env variable) is to search articles
// with the value 'javascript' in the title.
const searchTerm: string = process.env.WIKI_SEARCH_TERM || "title:javascript";

// how many wiki pages to return in each batch (api call)
const batchSize: number = +process.env.WIKI_SCRAPER_BATCH_SIZE || 5;

// how many milliseconds to wait between each batch query on wikipedia api.
const waitBetweenBatches: number =
  +process.env.WIKI_SCRAPER_WAIT_BETWEEN_BATCHES_MS || 60000;

const pollWikipediaArticles = async (offset: number): Promise<number> => {
  try {
    const res = await axios.get("http://en.wikipedia.org/w/api.php", {
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
    setTimeout( () => pollWikipediaArticles(continueOffset), waitBetweenBatches);
    return continueOffset;

  } catch (e) {
    console.log("failed to fetch wikipedia articles", e);
    setTimeout( () => pollWikipediaArticles(offset), waitBetweenBatches);
  }
};

(async () => {
  try {
    await initSqs();
    pollWikipediaArticles(0);
    console.log("wikipedia scraper started");
  } catch(e) {
    console.log('failed to init service', e);
  }
})();
