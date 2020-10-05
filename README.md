# Aspecto-Demo-Services

## How to run
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