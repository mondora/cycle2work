var mongoose = require("mongoose");
mongoose.Promise = global.Promise;

var Mockgoose = require("mockgoose").Mockgoose;
var mockgoose = new Mockgoose(mongoose);

var Activity = require("../app/entity/activity");
var User = require("../app/entity/user");

/*
 * Creates and/or connects to a mongo test database in memory
 * @param {function} cb callback function
 * @returns {void}
 */
module.exports.createDB = (cb) => {
    mockgoose.prepareStorage().then(function () {
        mongoose.connect("mongodb://localhost/test", cb);
    });
};

module.exports.popluateDB = () => {

    // Drop collections first
    var u = new User({
        name: "Name",
        surname: "Surname",
        screenName: "mock",
        realName: "Mock Name",
        slackId: "123",
        slackChannel: "mockChannel",
        stravaAuthToken: "token1",
        location: {
            type: "Point",
            coordinates: [46.1616791, 9.58809150000002]
        }
    });
    u.save();

    var u2 = new User({
        name: "Name",
        surname: "Surname",
        screenName: "mock",
        realName: "Mock Name",
        slackId: "456",
        slackChannel: "mockChannel2",
        stravaAuthToken: "token2",
        location: {
            type: "Point",
            coordinates: [0, 0]
        }
    });
    u2.save();

    var u3 = new User({
        name: "Name",
        surname: "Surname",
        screenName: "mock",
        realName: "Mock Name",
        slackId: "789",
        slackChannel: "mockChannel3",
        stravaAuthToken: null,
        location: {
            type: "Point",
            coordinates: [0, 0]
        }
    });
    u3.save();

    var commute = new Activity({
        "user": u.toObject(),
        "downloadDate": 1492217401,
        "distance": 20209.1,
        "name": "Activity flagged as Commute on Sunday",
        "stravaId": 2000000,
        "type": "Run",
        "movingTime": 11779,
        "elapsedTime": 14332,
        "commute": true,
        "startDate": 1491723064,
        "processed": false,
        "locationEnd": {
            "coordinates": [
                46.145637,
                9.574138
            ],
            "type": "Point"
        },
        "locationStart": {
            "coordinates": [
                46.145504,
                9.574244
            ],
            "type": "Point"
        }
    });
    commute.save();

    var commute2 = new Activity({
        "user": u.toObject(),
        "downloadDate": 1492217401,
        "distance": 20209.1,
        "name": "Activity flagged as Commute",
        "stravaId": 2000001,
        "type": "Run",
        "movingTime": 11779,
        "elapsedTime": 14332,
        "commute": true,
        "startDate": 1491581842,
        "processed": false,
        "locationEnd": {
            "coordinates": [
                46.145637,
                9.574138
            ],
            "type": "Point"
        },
        "locationStart": {
            "coordinates": [
                46.145504,
                9.574244
            ],
            "type": "Point"
        }
    });

    commute2.save();

    var a1 = new Activity({
        "user": u.toObject(),
        "downloadDate": 1492127581,
        "distance": 10826.9,
        "name": "Activity 1",
        "stravaId": 1000000,
        "type": "Ride",
        "movingTime": 3481,
        "elapsedTime": 3691,
        "startDate": 527027400,
        "processed": false,
        "locationEnd": {
            "coordinates": [
                46.161357,
                9.587609
            ],
            "type": "Point"
        },
        "locationStart": {
            "coordinates": [
                46.133822,
                9.551958
            ],
            "type": "Point"
        }
    });
    a1.save();

    var a2 = new Activity({
        "user": u.toObject(),
        "downloadDate": 1492127581,
        "distance": 30236.9,
        "name": "Activity 2",
        "stravaId": 1000001,
        "type": "Ride",
        "movingTime": 3481,
        "elapsedTime": 3691,
        "startDate": 527200200,
        "processed": false,
        "locationEnd": {
            "coordinates": [
                46.161357,
                9.587609
            ],
            "type": "Point"
        },
        "locationStart": {
            "coordinates": [
                46.133822,
                9.551958
            ],
            "type": "Point"
        }
    });
    a2.save();

    var a3 = new Activity({
        "user": u.toObject(),
        "downloadDate": 1492127581,
        "distance": 3985.7,
        "name": "Activity 3",
        "stravaId": 1000002,
        "type": "Run",
        "movingTime": 1403,
        "elapsedTime": 1765,
        "startDate": 528508801,
        "processed": false,
        "locationEnd": {
            "coordinates": [
                44.068038,
                12.580393
            ],
            "type": "Point"
        },
        "locationStart": {
            "coordinates": [
                44.058259,
                12.59421
            ],
            "type": "Point"
        }
    });
    a3.save();

    var a4 = new Activity({
        "user": u.toObject(),
        "downloadDate": 1492127581,
        "distance": 10826.9,
        "name": "Activity 1",
        "stravaId": 1000000,
        "type": "Ride",
        "movingTime": 3481,
        "elapsedTime": 3691,
        "startDate": 526867201,
        "processed": false,
        "locationEnd": {
            "coordinates": [
                46.161357,
                9.587609
            ],
            "type": "Point"
        },
        "locationStart": {
            "coordinates": [
                46.133822,
                9.551958
            ],
            "type": "Point"
        }
    });
    a4.save();
};

/*
 * Disconnects from and destroys the mongo test database in memory
 * @returns {void}
 */
module.exports.destroyDB = () => {
    mongoose.disconnect();
};