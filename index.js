const http = require('http');
const Bot = require('messenger-bot');
const request = require('request');
const MongoClient = require('mongodb').MongoClient;
var limdu = require('limdu');
const assert = require('assert');

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

	{input: "Hi i'm checking my flight", output: "check_flight"},
	{input: "Hi i need to check about my flight", output: "check_flight"},
	{input: "Hi do you think you can help me check my flight?", output: "check_flight"},
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

	// umm add flight details
	// flight diming
	// flight timing
	// boarding gate
	// boarding time
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
  token: 'EAAaKuvOeZCMsBAAWz7G9Ovrt4uDS6P62itRhbCmGtQtmJIFW0bgZAk0eim9hWO8eZAbhNQV4wTZAAxtI8ZCYkBUW9XVvZClw2UpD1J6wVmNgZBnp0IZAQfKGGWgLTqDUfZCxTjqSabrFHPVyDCAmy4A9zQ3b8KYruhEGfAtxDk7rruwZDZD',
  verify: 'sia-app-challenge-bot'
});


var tempDB = {
	1292592927427179: {name: "Zames", flight: "SQKII10"}
};

bot.on('error', (err) => {
  console.log(err.message)
});


bot.on('message', (payload, reply) => {
	var fbid = payload.sender.id;
	var userQuery = payload.message.text;
	var queryType = intentClassifier.classify(userQuery) // E.g. ['need_directions','check_flight']

	for (var i = 0; i < queryType.length; i++){
		if (queryType[i] == "need_directions"){
			reply("holy shit, need_directions work",function(err, info){
				console.log("holy shit, need_directions work");
			});

		} else if (queryType[i] == "check_flight"){
			reply("holy shit, check_flight work",function(err, info){
				console.log("holy shit, check_flight work");
			});
		}
	}


	bot.getProfile(fbid, (err, profile) => {
		if (err) throw err;
	    if (fbid in tempDB) {
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
	    	
	    } else {
	    	var dbData = {
	    		fbid: {
	    			name: profile.first_name,
	    			flight: "SQKII10", //CHECK IF MESSAGE IS FLIGHT NUMBER
	    		}
	    	};

			MongoClient.connect(url, function(err, db) {
				assert.equal(null, err);

				insertFlightDocument(db, function(){
					console.log("Successfully saved data to db.");
				});
				db.close();
			});

	    	//Put data into database
	    	//Give flight info
	    	//Stack the alert messages into queue
	    	console.log(profile);
	    }
	})







//    var text = payload.message.text;

//    console.log(payload);



//    reply({ text }, (err) => {
//      if (err) throw err

//      console.log(`Echoed back to ${profile.first_name}               ${profile.last_name}: ${text}`)
//    })
	console.log(tempDB);
})

http.createServer(bot.middleware()).listen(8080)
console.log('Echo bot server running at port 8080.')





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

var insertFlightDocument = function(db, callback) {
	db.collection('flights').insertOne( {
		"address" : {
			"street" : "2 Avenue",
			"zipcode" : "10075",
			"building" : "1480",
			"coord" : [ -73.9557413, 40.7720266 ]
		},
		"flightID" : "41704620"
	}, function(err, result) {
		assert.equal(err, null);
		console.log("Inserted a document into the restaurants collection.");
		callback();
	});
};