/** Start Import */
const functions = require("firebase-functions");
const express = require("express");
const { WebhookClient } = require("dialogflow-fulfillment");
const app = express();
// The Firebase Admin SDK to access Firestore.
const admin = require("firebase-admin");
admin.initializeApp();
/** End Import */


/** Simple GET to indicate the server is running */
app.get("/", (req, res) => {
  console.log("Connection!");
  res.send("online");
});

/** POST request for dialogflow */
app.post("/dialogflow", express.json(), (req, res) => {
  console.log("POST for dialogflow");
  const tag = req.body.queryResult.intent.displayName;

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
    // get the session name to return to
    let sessionName = req.body.queryResult.outputContexts[0].name;
    sessionName = sessionName.split('/').slice(0, -1).join('/');
    // current list of offers 
    const currentOffers = req.body.queryResult.parameters.offers;
    // previous list of offers stored in the context list
    const prevOffers = req.body.queryResult.parameters.prev;
    // default response
    let response = "Thank you for your offer. ";
    // default average
    let average = 0;
    let tooLow = false;
    let tooHigh = false;

    for (var num of currentOffers) {
      // check if number if legal
      if (num < 7000) {
        tooLow = true;
      } else if (num > 20000) {
        tooHigh = true;
      } else {
        prevOffers.push(num);
      }
    }
    // calculate the average
    let sum = 0
    for (var num of prevOffers) {
      sum += num;
    }
    average = sum / prevOffers.length;

    // illegal response
    if (tooLow) {
      response += "Please note that the lowest offer we accept is 7000. Any offer lower than 7000 will be omitted. ";
    }
    if (tooHigh) {
      response += "Please note that the higheset offer we accepst is 20000. Any offer higher than 20000 will be omitted. ";
    }

    // if user input illegal number, does not calculate the response
    if (average != 0) {
      response = response + "Here is the average of all your current offers: " + average;
    }

    // add the response to the session and return as params
    agent.add(response);
    agent.setContext({
      name: sessionName + '/prev_offer_numbers',
      lifespan: 25,
      parameters: { offerNums: prevOffers }
    });
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
