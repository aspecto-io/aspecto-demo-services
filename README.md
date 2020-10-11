# Aspecto-Demo-Services

## Architecture
This demo application is a micro-serivce system which scrape articles from wikipedia, ingest it, store it in database and expose it for users to interact.

It is composed of the following infra services:
- Users Service:
    * Register users to the system
    * Authenticate users on api calls
- Scraper:
    * Register new articles to scrape with http endpoint
    * Read batch query jobs from sqs queue, and write new jobs to the queue.
    * Access the wikipedia public api to search for articles with specific text, and push the result to simple pipeline sqs queue in batches for processing.
- Wikipedia Service:
    * In PROCESSING mode - fetch wikipedia article data from the pipeline, and store it in db.
    * In SERVER mode - expose http api for users to query and modified the articles data
- Mongo Database:
    * Storing users information for authentication
    * Storing specific wikipedia articles
- Redis Database:
    * Cache for fast retrieval of article data which was fetched lately
- AWS LocalStack:
    * sqs queue for transferring data between scraper and wikipedia service processor.

## How to Run
1. `git clone` the project locally
2. Copy your aspecto token from [aspecto website](https://app.aspecto.io/app/integration/api-key).
3. Run the following command in terminal, replace `YOUR_ASPECTO_TOKEN` with the token you copied.
```
ASPECTO_AUTH={YOUR_ASPECTO_TOKEN} ASPECTO_GITHASH=$(git rev-parse HEAD) docker-compose up
```
This command might take few minutes on first run.
Docker compose will pull and build any missing images, run the services, and output logs to the console. 

4. Search the logs for a message with link to live flows; There are multiple links, one for each service. You can click any of them. The links looks like this:

```
wikipedia-service_1  | ====================================================================================================================================
wikipedia-service_1  | |                                                                                                                                  |
wikipedia-service_1  | | 🕵️‍♀️ See the live tracing stream at https://app.aspecto.io/app/live-flows/sessions?instanceId=7a899937-1510-4a38-8cce-97fa48be6723 |
wikipedia-service_1  | |                                                                                                                                  |
wikipedia-service_1  | ====================================================================================================================================
```
5. Open postman and load the collection `aspecto-demo-services.postman_collection.json` in this repository directory, and send requests. Examine the live traces in aspecto website.

## Aspecto Live Flows
Once you start the system and let it run, you'll start to see traces being generated. 

Even without initiating any api call, you'll see traces that are continuously polling messages from SQS every 20 seconds (They will show up in the UI with "FLOW LENGTH" of 2 and "ENTRY POINT" of `SQS receiveMessage from "wiki-query-job"` and `SQS receiveMessage from "new-wiki-article"`). It is recommended to "Group" or "Exclude" them in the ui since they are not so interesting. Use the options on the right side of each line (`...`) to do that.
