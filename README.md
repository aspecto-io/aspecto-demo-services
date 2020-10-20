# Aspecto-Demo-Services

## Architecture
This demo application is a micro-serivce system which scrape articles from wikipedia, ingest it, store it in database and expose it for users to interact.

It is composed of the following infra services:
- Users Service:
    * Authenticate registered users
    * Register new users to the system
- Scraper:
    * Expose api to create new scraping jobs
    * Handle scraping jobs from sqs and write new jobs to that queue.
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
2. Open [Aspecto application](https://app.aspecto.io/) and login with email:
```
Email: wikipedia-demo@aspecto.io
Password: Aspecto123
```
3. Run the following command in terminal:
```
ASPECTO_GITHASH=$(git rev-parse HEAD) docker-compose up
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
5. Browse http://localhost:3000/ and play with the system. The demo email is: `aspecto-io/aspecto-demo-services` and demo password is: `Aspecto123`.

examine the live traces generated in aspecto website. You can also open postman, load the collection `aspecto-demo-services.postman_collection.json` from this repository main directory, and send requests.

## Aspecto Live Flows
Once you start the system and let it run, you'll start to see traces being generated. 

Even without initiating any api call, you'll see traces that are continuously polling messages from SQS every 20 seconds (They will show up in the UI with "FLOW LENGTH" of 2 and "ENTRY POINT" of `SQS receiveMessage from "wiki-query-job"` and `SQS receiveMessage from "new-wiki-article"`). It is recommended to "Group" or "Exclude" them in the ui since they are not so interesting. Use the options on the right side of each line (`...`) to do that.
