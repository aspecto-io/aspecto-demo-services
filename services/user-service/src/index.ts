import init from "@aspecto/opentelemetry";
init({
  otCollectorEndpoint: "http://test-Publi-RDISWA51NUHK-1284109068.eu-west-1.elb.amazonaws.com/v1/trace",
  aspectoAuth:
    process.env.ASPECTO_AUTH ?? "331a7c4e-945a-4053-8f59-9964d555db9d",
  local: process.env.NODE_ENV !== "production",
  logger: console,
});

import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
let userModel: mongoose.Model<mongoose.Document, any>;

const app = express();
app.use(bodyParser.json());
app.use(cors({}));

app.post("/user/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const { fail } = req.query;
    console.log("trying to login user", { username, password });
    if (fail) {
      throw new Error(`Can't process your request`);
    } else {
      if (userModel) {
        const user = await userModel.findOne({ username, password });
        if (user) {
          res.json(user);
        } else {
          res.sendStatus(404);
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

  const getServiceUrl = (serviceName: string) => {
    const copilotServiceEndpoint = process.env.COPILOT_SERVICE_DISCOVERY_ENDPOINT;
    if (copilotServiceEndpoint) {
      return `mongodb://${serviceName}.${copilotServiceEndpoint}`;
    }
    return `mongodb://${serviceName}`;
  };
  await mongoose.connect(`${getServiceUrl("db")}/aspecto-demo`, {
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
