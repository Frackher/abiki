// Config Key placed at Heroku Dashboard!
// https://dashboard.heroku.com/apps/fast-temple-64164/settings

// Requirements
var express = require("express");
var request = require("request");
var bodyParser = require("body-parser");
var xml2js = require('xml2js');
var fs = require('fs');

var app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.listen((process.env.PORT || 5000));


//Read the XML files
var messages = "";
fs.readFile('./words/messages.xml', function(err,data){
  var parser = new xml2js.Parser();
  parser.parseString(data, function (err, result) {
    messages = result.text;
    console.dir(result);
    console.dir(messages);
    console.log('Name:'+messages.ai.name);
    console.log('Greet:'+messages.greetings);
  });
});

// Server index page
app.get("/", function (req, res) {
  res.send("We are online !");
});

// Facebook Webhook
// Used for verification
app.get("/webhook", function (req, res) {
  if (req.query["hub.verify_token"] === process.env.VERIFICATION_TOKEN) {
    console.log("Verified webhook");
    res.status(200).send(req.query["hub.challenge"]);
  } else {
    console.error("Verification failed. The tokens do not match.");
    res.sendStatus(403);
  }
});

// All callbacks for Messenger will be POST-ed here
app.post("/webhook", function (req, res) {
  // Make sure this is a page subscription
  if (req.body.object == "page") {
    // Iterate over each entry
    // There may be multiple entries if batched
    req.body.entry.forEach(function(entry) {
      // Iterate over each messaging event
      entry.messaging.forEach(function(event) {
        if (event.postback) {
          processPostback(event);
        }
      });
    });

    res.sendStatus(200);
  }
});

// Processing Postback answer
function processPostback(event) {
  var senderId = event.sender.id;
  var payload = event.postback.payload;

  if (payload === "Greeting") {
    // Get user's first name from the User Profile API and include it in the greeting
    getUserInfo(senderId, "first_name", welcome);
  }
}

// Ask user info
function getUserInfo(senderId, requestedFields, callback){
  request({
    url: "https://graph.facebook.com/v2.6/" + senderId,
    qs: {
      access_token: process.env.PAGE_ACCESS_TOKEN,
      fields: requestedFields
    },
    method: "GET"
    }, function(error, response, body){
      //manage answers
      if(error) {
        console.log("Error getting user info: "+ error);
      } else {
        var bodyObj = JSON.parse(body);
        callback(senderId, bodyObj);
      }
  });
}

// Will welcome people
function welcome(senderId, obj){
  //requestAPI('https://api.kiabi.com/v2/loyalties/500007716959', process.env.KEY_LOYALTY, true);

  greeting = "Ahoy " + obj.first_name + " ! ";
  randomize(messages.greetings);
  var message = greeting + "Bienvenue à l'agence Pirate ! je m'apelle "+messages.ai.name;
  sendMessage(senderId, {text: message});
}

function randomize(obj){
  console.log('Here :'+obj)
  for (var i in obj) {
    val = obj[i];
    console.log("ICI ! "+val);
  }
}

// Request API
function requestAPI(url, apikey, auth, callback){
  var headers = {'accept': 'application/json', 'x-apikey': apikey};
  if(auth)
    headers = {'accept': 'application/json', 'x-apikey': apikey, 'authorization': process.env.AUTHORIZATION};

  request({
    url : url,
    headers: headers,
    method: "GET"
  }, function(error, response, body){
    if(error){
      console.log("Error api "+error);
    } else {
      console.log("API GO : "+response+body);
    }
  });
}

// sends message to user
function sendMessage(recipientId, message) {
  request({
    url: "https://graph.facebook.com/v2.6/me/messages",
    qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
    method: "POST",
    json: {
      recipient: {id: recipientId},
      message: message,
    }
  }, function(error, response, body) {
    if (error) {
      console.log("Error sending message: " + response.error);
    }
  });
}
