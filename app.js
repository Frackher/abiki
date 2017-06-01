var express = require("express");
var request = require("request");
var bodyParser = require("body-parser");
var xml2js = require('xml2js');
var fs = require('fs');

var app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.listen((process.env.PORT || 5000));

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
    console.log("I'm In !");
    // Get user's first name from the User Profile API
    // and include it in the greeting
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
  fs.readFile('./words/messages.xml', function(err,data){
    console.log("Error FS"+err);
    console.log("Data FS"+data);
    var parser = new xml2js.Parser();
    parser.parseString(data, function (err, result) {
        console.dir(result);
        console.log('Done');
    });
  });


  greeting = "Ahoy " + obj.first_name + " ! ";
  var message = greeting + "Bienvenue à l'agence Pirate !";
  sendMessage(senderId, {text: message});
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
