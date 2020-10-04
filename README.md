# Aspecto-Demo-Services

## How to run
```
ASPECTO_AUTH={YOUR_ASPECTO_TOKEN} ASPECTO_GITHASH=$(git rev-parse HEAD) docker-compose up
```

Docker compose will pull and build any missing images, run the services, and output logs to the console. Find in logs a message with link to live flows; It looks like this: (the link will show up for each service, you should click one, no matter which)

```
wikipedia-service_1  | ====================================================================================================================================
wikipedia-service_1  | |                                                                                                                                  |
wikipedia-service_1  | | 🕵️‍♀️ See the live tracing stream at https://app.aspecto.io/app/live-flows/sessions?instanceId=7a899937-1510-4a38-8cce-97fa48be6723 |
wikipedia-service_1  | |                                                                                                                                  |
wikipedia-service_1  | ====================================================================================================================================
```
Click the link, and it will take you to live-flows page in aspecto website, where you should see the live traces being created.