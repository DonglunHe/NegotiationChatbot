const functions = require("firebase-functions");
const express = require("express");
const { WebhookClient } = require("dialogflow-fulfillment");
const app = express();
// The Firebase Admin SDK to access Firestore.
const admin = require("firebase-admin");
admin.initializeApp();

const sessionIds = {};


/** Simple GET to indicate the server is running */
app.get("/", (req, res) => {
  console.log("Connection!");
  res.send("online");
});

app.get("/hello", (req, res) => {
  res.send("hello");
});

/** POST request for dialogflow */
app.post("/dialogflow", express.json(), (req, res) => {
  console.log("POST for dialogflow");
  const tag = req.body.queryResult.intent.displayName;
  const offerNum = req.body.queryResult.parameters.offerNumber;
  const sessionId = req.body.session;

  /** welcome */
  function welcome() {
    agent.add("Welcome to the negotiation chatbot. Please input your offer.");
  }
  /** fallback */
  function fallback() {
    agent.add("Sorry I don not quite understand. Can you input your offer?");
  }
  /** offer */
  function offer() {
    let response = "Thank you for your offer. ";
    let average = 0;
    let tooLow = false;
    let tooHigh = false;
    for (const offer of offerNum) {
      if (offer < 7000) {
        tooLow = true;
      } else if (offer > 20000) {
        tooHigh = true;
      } else {
        let sum = 0;
        if (sessionIds[sessionId]) {
          sessionIds[sessionId].push(offer);
          for (let i = 0; i < sessionIds[sessionId].length; i++) {
            sum += sessionIds[sessionId][i];
          }
          average = sum / sessionIds[sessionId].length;
        } else {
          sessionIds[sessionId] = [offer];
          average = offer;
        }
      }
    }
    if (tooLow) {
      response += "Please note that the lowest offer we accept is 7000. Any offer lower than 7000 will be omitted. ";
    }
    if (tooHigh) {
      response += "Please note that the higheset offer we accepst is 20000. Any offer higher than 20000 will be omitted. ";
    }
    if (average != 0) {
      response = response + "Here is the average of all your current offers: " + average;
    }
    agent.add(response);
  }

  const intentMap = new Map();
  if (tag == "Default Welcome Intent") {
    intentMap.set("Default Welcome Intent", welcome);
  }
  if (tag == "Default Fallback Intent") {
    intentMap.set("Default Fallback Intent", fallback);
  }
  if (tag == "Offer Intent") {
    intentMap.set("Offer Intent", offer);
  }

  const agent = new WebhookClient({ request: req, response: res });
  agent.handleRequest(intentMap);
});

app.listen(process.env.PORT || 8080);
exports.app = functions.https.onRequest(app);
// module.exports = app;
