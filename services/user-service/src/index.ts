import init from "@aspecto/opentelemetry";
init({
  aspectoAuth:
    process.env.ASPECTO_AUTH ?? "e97d7a26-db48-4afd-bba2-be4d453047eb",
  local: process.env.NODE_ENV !== "production",
  logger: console,
  otCollectorEndpoint: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
  customZipkinEndpoint: process.env.OTEL_EXPORTER_ZIPKIN_ENDPOINT,  
});

import { trace , context} from '@opentelemetry/api';

import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

var Rollbar = require('rollbar');
var rollbar = new Rollbar({
  accessToken: '7e69e2a251d8446f8fb774183ab1a288',
  captureUncaught: true,
  captureUnhandledRejections: true,
  payload: {
    code_version: '1.0.0',
  }
});

let userModel: mongoose.Model<mongoose.Document, any>;


const app = express();
app.use(bodyParser.json());
app.use(cors({}));

app.post("/user/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const { fail } = req.query;
    console.log("trying to login user", { username, password });
    // throw new Error(`Can't process your request`);

    if (fail) {
      throw new Error(`Can't process your request`);
    } else {
      if (userModel) {
        const user = await userModel.findOne({ username, password });
        if (user) {
          res.json(user);
        } else {
          res.sendStatus(404);
          const activeSpan = trace.getSpanContext(context.active());
          const traceId = activeSpan?.traceId;
          rollbar.error('user not found',{traceId} )
          console.error('user not found',{traceId} )
        }
      } else {
        res.status(500).json({ message: "DB isn't ready yet" });
      }
    }
  } catch (e) {
    res.status(500).json({ error: e });
    console.error(`Failed to login`, e);
  }
});

app.get("/user/token", async (req, res) => {
  try {
    const { token } = req.query;
    console.log(`Trying to auth ${token}`);
    if (!token) {
      throw new Error(
        `Can't process your request, missing 'token' query param`
      );
    } else {
      if (userModel) {
        const user = await userModel.findOne({ token });
        if (user) {
          console.log(`Found user for token ${token}`);
          res.json(user);
        } else {
          console.log(`Failed to find user for token ${token}`);
          res.sendStatus(404);
        }
      } else {
        res.status(500).json({ message: "DB isn't ready yet" });
      }
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
    console.error(`Failed to login`, e);
  }
});

app.listen(8080);
console.log("User service is ready!");

getDBModel().then((model) => {
  userModel = model;
});

async function getDBModel() {
  const demoUserEmail = "wikipedia-demo@aspecto.io";
  const usersSchema = new mongoose.Schema({
    username: String,
    password: String,
    token: String,
  });

  const User = mongoose.model("Users", usersSchema);

  await mongoose.connect("mongodb://db/aspecto-demo", {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useFindAndModify: true,
  });

  const demoUser = await User.findOne({ username: demoUserEmail });
  if (!demoUser) {
    await new User({
      username: demoUserEmail,
      password: "Aspecto123",
      token: 123456,
    }).save();
  }

  console.log("Mongo is ready!");
  return User;
}
