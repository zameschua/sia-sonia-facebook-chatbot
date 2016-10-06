const http = require('http');
// const https = require('https');
const Bot = require('messenger-bot');
const request = require('request');
const MongoClient = require('mongodb').MongoClient;
const bodyParser = require('body-parser');
const limdu = require('limdu');
const assert = require('assert');
const express = require('express');
const fs = require('fs');
const _ = require("underscore");


/*
 * Machine learning stuffs here!
 */

// First, define our base classifier type (a multi-label classifier based on winnow):
var TextClassifier = limdu.classifiers.multilabel.BinaryRelevance.bind(0, {
	binaryClassifierType: limdu.classifiers.Winnow.bind(0, {retrain_count: 10})
});

// Now define our feature extractor - a function that takes a sample and adds features to a given features set:
var WordExtractor = function(input, features) {
	input.split(" ").forEach(function(word) {
		features[word]=1;
	});
};

// Initialize a classifier with the base classifier type and the feature extractor:
var intentClassifier = new limdu.classifiers.EnhancedClassifier({
	classifierType: TextClassifier,
	normalizer: limdu.features.LowerCaseNormalizer,
	featureExtractor: WordExtractor
});


// Train and test:
intentClassifier.trainBatch([
	{input: "Help i'm lost", output: "need_directions"},
	{input: "I'm lost", output: "need_directions"},
	{input: "Help me, i'm lost", output: "need_directions"},
	{input: "I don't know where to go", output: "need_directions"},
	{input: "Hey i'm lost", output: "need_directions"},
	{input: "Can i have directions", output: "need_directions"},
	{input: "I'm not sure where to go", output: "need_directions"},
	{input: "I'm unsure where to go", output: "need_directions"},

	{input: "I'm checking my flight", output: "check_flight"},
	{input: "I need to check about my flight", output: "check_flight"},
	{input: "Do you think you can help me check my flight?", output: "check_flight"},
	{input: "What's my flight", output: "check_flight"},
	{input: "Can you help me check flight details?", output: "check_flight"},
	{input: "Can i check my flight details?", output: "check_flight"},
	{input: "Can i check my flight details", output: "check_flight"},
	{input: "Can i check my flight timing?", output: "check_flight"},
	{input: "Can i check my flight timing", output: "check_flight"},
	{input: "Can i check my boarding gate?", output: "check_flight"},
	{input: "Can i check my boarding gate", output: "check_flight"},
	{input: "Can i check my boarding time?", output: "check_flight"},
	{input: "Can i check my boarding time", output: "check_flight"},

	{input: "Do you think you can remind me of my flight?", output: "remind_me"},
	{input: "Could you remind me of my flight?", output: "remind_me"},
	{input: "Could you remind me later?", output: "remind_me"},
	{input: "Can you remind me later?", output: "remind_me"},
	{input: "Could you notify me later?", output: "remind_me"},
	{input: "Could you notify me of my flight later?", output: "remind_me"},
	{input: "Can you notify me of my flight later?", output: "remind_me"},
	{input: "Please remind me", output: "remind_me"},
	{input: "Do remind me later!", output: "remind_me"},
	{input: "Do notify me later!", output: "remind_me"},

	{input: "Can i check the weather for my flight?", output: "check_weather"},
	{input: "What's the weather like?", output: "check_weather"},
	{input: "Do you think i could check the weather for my flight?", output: "check_weather"},
	{input: "Can i check the weather?", output: "check_weather"},
	{input: "Hey what's the weather like?", output: "check_weather"},
	{input: "What's the weather at", output: "check_weather"},
	{input: "What's the weather like later?", output: "check_weather"},

	{input: "No", output: "negative_response"},
	{input: "Dude", output: "negative_response"},
	{input: "Go to hell", output: "negative_response"},
	{input: "Screw off", output: "negative_response"},
	{input: "How about no", output: "negative_response"},

	{input: "Thanks so much!", output: "positive_response"},
	{input: "Thanks for the help!", output: "positive_response"},
	{input: "Appreciate it!", output: "positive_response"},
	{input: "Thank you", output: "positive_response"},

	{input: "Hey there", output: "greetings"},
	{input: "Hi", output: "greetings"},
	{input: "Nice to meet you", output: "greetings"},
	{input: "I need help", output: "greetings"},
	{input: "Hello", output: "greetings"},
]);


// Here's how to use our test data
// intentClassifier.classify("I want an apple and a banana") // ['apl','bnn']

/*
 * END machine learning stuffs here!
 */

var url = 'mongodb://localhost:27017/sia';
MongoClient.connect(url, function(err, db) {
	assert.equal(null, err);
	console.log("Connected correctly to server.");
	db.close();
});


var bot = new Bot({
  token: 'EAAaKuvOeZCMsBABaAi3Qd1X4ddP9TQ4L0WLNgG9q2VZAtolXR9MqmgRE6uiIpT11wKCgPqWJ2GXUW8BfIXA50MDdjWzi8L5jgTEr57Vx50IAZCZAFpxMy4GEK1QigvkLrUP157xeAlyKLMQDsBOD1WcuR917vBoxCGZBCnOjYLQZDZD',
  verify: 'sia-app-challenge-bot'
});

bot.on('error', (err) => {
  console.log(err.message)
});


bot.on('message', (payload, reply) => {
	var fbid = payload.sender.id;
	var userQuery = payload.message.text;
	var queryType = intentClassifier.classify(userQuery); // E.g. ['need_directions','check_flight']

	bot.getProfile(fbid, (err, profile) => {
		if (err) throw err;

		// Connecting to DB
		MongoClient.connect(url, function(err, db) {
			assert.equal(null, err);

			// Checking to see if user exists
			queryUserDocument(fbid, db, function(err, user){
				if (err == null) {
					if (user.length > 0){
						// This means a user is found

						// This will assume user is typing in a flight ID, because he typed something alphanumeric
						if (/((^[0-9]+[a-z]+)|(^[a-z]+[0-9]+))+[0-9a-z]+$/i.test(userQuery)){
							var params = {
								"userID": fbid,
								"directions": 0,
								"checkFlight": 0,
								"flightID": userQuery
							};
							updateUserDocument(fbid, params, db, function(err, result){
								if (!err){
									reply({text: "Ok we've noted your flight number! How can i help you?"}, function(err, info){});
								}
								db.close();
							});
						} else {
							// We will parse the user's message to see what type of query he has made
							sendReply(user, fbid, queryType, reply);
							db.close();
						}
					} else {
						insertUserDocument(fbid, db, function(err, result){
							reply({text: "It seems like you're a first time user, we've registered an account for you!"}, function(err, info){
								askForFlightNumber(reply);
							});
						});
					}
				} else {
					// TODO must check to see if user has sent a registration number instead
					defaultReply(reply);
					db.close();
				}
			});
		});

	});

});

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));

var server = http.createServer(app).listen(8080);
console.log('Echo bot server running at port 8080.');


app.get('/', (req, res) => {
	return bot._verify(req, res)
});

app.post('/', (req, res) => {
	bot._handleMessage(req.body)
	res.end(JSON.stringify({status: 'ok'}))
});

app.get('/test', (req, res)=> {

	// the same kind of magic happens here!
	var userQuery = "Hi I'm lost";
	if (req.query.message != undefined){
		userQuery = req.query.message;
	}

	var queryType = intentClassifier.classify(userQuery); // E.g. ['need_directions','check_flight']

	for (var i = 0; i < queryType.length; i++){
		if (queryType[i] == "need_directions"){
			console.log("holy shit, need_directions work");
			res.send("holy shit, need_directions work");
		} else if (queryType[i] == "check_flight"){
			console.log("holy shit, check_flight work");
			res.send("holy shit, check_flight work");
		}
	}

});





var fakeJson = {"code":200,"customers":[{"flightInfo":{"qrCodeBinary":"longassshithere","departureGate":"","departureAirport":"Singapore Changi","cabin":"Economy","eTicketNumber":"618241177233101","seatNumber":"047D","bookingReference":"248LJV","aircraftType":"Boeing 777-300ER","departureDate":"13 Jan","scheduledArrivalTime":"07:20AM","airlineUse":"001","departureTerminal":"T3","flightDeck":"","offPoint":"London","fullName":"TEST MR","boardPoint":"Singapore","isA380":false,"boardingDateTime":"12:15AM 13 Jan","membershipNo":"","boardPointCode":"SIN","flightNumber":"SQ306","boardingZone":
"5","scheduledDepartureTime":"01:15AM","offPointCode":"LHR","arrivalAirport":"London Heathrow","did":"2301D78000006503","loungeText":"","operatingAirline":"Singapore Airlines"},"uci":"2301D78000006CA2"}],"message":""}


/*
	    bot.sendMessage(payload.sender.id, reply, function(err, info){
	    	if (err){
	    		console.log(err);
	    	} else {
	    		console.log(info);
	    	}
	    })
var link = "https://graph.facebook.com/v2.6/me/messages?access_token=EAADNE5iTX2kBAMUkSZAOgh27tQPlElKHJcC2pMM5tsiTbnBfHyoV0yQqWEAo9mBj6VNS9ybFWs5CRq8MBu6SjAIIHYZCtabHGM7qpyHIQoZBT2FXBFKcLmV1qiT6HjyUpmEm6GCflaTbrfTE0DJFOPx1BLg57b6rgQXVDS7ZBQZDZD"
*/

var insertUserDocument = function(userID, db, callback) {
	db.collection('users').insertOne({
		"userID": userID, // This could be the FBID etc
		"directions": 1,
		"checkFlight": 0,
		"flightID": ""
	}, function(err, result) {
		assert.equal(err, null);
		console.log("Inserted a document into the users collection.");
		callback(err, result);
	});
};

var queryUserDocument = function(userID, db, callback){
	db.collection('users').find({
		"userID" : userID
	}).toArray(function(err, results){
		assert.equal(err, null);
		callback(err, results);
	});
};

var updateUserDocument = function(userID, data, db, callback){

	var toUpdate = {};
	if (data.directions != undefined)
		toUpdate.directions = data.directions;
	if (data.checkFlight != undefined)
		toUpdate.checkFlight = data.checkFlight;
	if (data.flightID != undefined)
		toUpdate.flightID = data.flightID;

	db.collection('users').update({
		"userID": userID, // This could be the FBID etc
	}, {$set: toUpdate}, function(err, result){
		callback(err, result);
	});
};

function sendReply(user, fbid, queryType, reply){

	if (queryType.length > 0){
		if (user[0].flightID == ""){
			askForFlightNumber(reply);
			return;
		}

		for (var i = 0; i < queryType.length; i++){
			if (queryType[i] == "need_directions"){
				sendDirections(reply);
			} else if (queryType[i] == "check_flight"){
				checkFlight(user[0].flightID, reply);
			} else if (queryType[i] == "remind_me"){
				remindMe(user[0].flightID, reply);
			} else if (queryType[i] == "check_weather"){
				checkWeather(user[0].flightID, reply);
			} else if (queryType[i] == "negative_response"){
				negativeResponse(reply);
			} else if (queryType[i] == "positive_response"){
				positiveResponse(reply);
			} else if (queryType[i] == "greetings"){
				greetingsResponse(reply);
			} else {
				defaultReply(reply);
			}
		}

	} else {
		// This means there wasn't any sensible analysis on the user's input
		defaultReply(reply);
	}

}


function sendDirections(reply){

	//In order for us to give you directions, we would need your flight ID
	var lat = 1.3644202;
	var long = 103.99153079999996;
	var mapJSON = {
		"attachment": {
			"type": "template",
			"payload": {
				"template_type": "generic",
				"elements": {
					"element": {
						"title": "Follow the map to get to Belt 16!", //Change to belt number??
						"image_url": "https:\/\/maps.googleapis.com\/maps\/api\/staticmap?size=764x400&center="+lat+","+long+"&zoom=15&markers="+lat+","+long,
						"item_url": "http:\/\/maps.apple.com\/maps?q="+lat+","+long+"&z=15"
					}
				}
			}
		}
	};

	reply(mapJSON, function(err, info) {
		if (err) {
			console.log(err);
		}
	})
}

function remindMe(flightID, reply){
	//TODO add make a request to find out about flight
	// var flightNum = userQuery.replace(/^\D+/g, '');


	reply({text:"Okay sure! Based on your flight ID of: " + flightID +  ", We will remind you 7 days, 3 days, 1 day, " +
	"and also 5 hours before your flight! (But for proof of concept, we shall remind you in 10 seconds! :)"}, function(err, info) {
		if (err) {
			console.log(err);
		}
	});
}

function checkWeather(flightID, reply){
	var flightAlpha = flightID.replace(/[0-9]/g, '');
	var flightNum = flightID.replace(/([a-zA-Z ])/g,'');

	// Make an immediate reply first so that user doesn't think its lagging!
	reply({text: "Searching your flight details for you! This may take some time, please be patient!"}, function(err, info){});

	// Make a request to find flight details, where we subsequently parse it for more details
	request({
		url: "https://flifo-qa.api.aero/flifo/v3/flight/sin/" + flightAlpha + "/" + flightNum + "/d",
		headers: {
			'X-apiKey': '2cfd0827f82ceaccae7882938b4b1627',
			'Accept': 'application/json'
		}
	}, function(requestErr, requestRes, requestBody){
		if (requestRes.success) {
			var responseText = "Based on your flight ID of: " + flightID + ", the weather at " + requestRes.flightRecord[0].city + " will be " + "rainy" + " at the time you touch down!";

			reply({text: responseText}, function(err, info) {
				if (err) {
					console.log(err);
				}
			});
		} else {
			reply({
				text: "It seems like you gave wrong flight details, because we can't find any flight data. :( Do let us know if you have a different Flight Number!"
			}, function (err, info) {
				if (err) {
					console.log(err);
				}
			});
		}
	});


}

function negativeResponse(reply){
	reply({text: "That doesn't help me do my job :("}, function(err, info) {
		if (err) {
			console.log(err);
		}
	});
}

function positiveResponse(reply){
	reply({text: "Great! It has been nice chatting! :)"}, function(err, info) {
		if (err) {
			console.log(err);
		}
	});
}

function greetingsResponse(reply){
	reply({text: "Hey there! How can i help? :)"}, function(err, info) {
		if (err) {
			console.log(err);
		}
	});
}

function checkFlight(flightID, reply){
	var flightAlpha = flightID.replace(/[0-9]/g, '');
	var flightNum = flightID.replace(/([a-zA-Z ])/g,'');

	console.log(flightAlpha, flightNum);

	// Make an immediate reply first so that user doesn't think its lagging!
	reply({text: "Searching your flight details for you! This may take some time, please be patient!"}, function(err, info){});

	// Make a request to find flight details, where we subsequently parse it for more details
	request({
		url: "https://flifo-qa.api.aero/flifo/v3/flight/sin/" + flightAlpha + "/" + flightNum + "/d",
		headers: {
			'X-apiKey': '2cfd0827f82ceaccae7882938b4b1627',
			'Accept': 'application/json'
		}
	}, function(requestErr, requestRes, requestBody){
		if (requestRes.success) {
			var responseText = "Here are your flight details for " + flightID + ":\nFlight Date - " + requestRes.flightDate + "\n Terminal Number - " + requestRes.flightRecord[0].terminal + "\n Flight Duration - " + requestRes.flightRecord[0].duration + "\n Headed For - " + requestRes.flightRecord[0].city;

			reply({
				text: responseText
			}, function (err, info) {
				if (err) {
					console.log(err);
				}
			});
		} else {
			reply({
				text: "It seems like you gave wrong flight details, because we can't find any flight data. :( Do let us know if you have a different Flight Number!"
			}, function (err, info) {
				if (err) {
					console.log(err);
				}
			});
		}
	});
}

function defaultReply(reply){
	reply({text:"Sorry i don't understand your query! :("}, function(err, info) {
		if (err) {
			console.log(err);
		}
	})
}

function askForFlightNumber(reply){
	reply({text:"Welcome! Do you think i could have your registration ID, so i can help you better?"}, function(err, info) {
		if (err) {
			console.log(err);
		}
	});
}