import log from "../log";
import Activity from "../entity/activity";
import User from "../entity/user";
import Token from "../entity/token";
import uuid from "uuid";
import moment from "moment";
import ReportUtils from "../utils/reportUtils";
import {TOKEN_EXPIRE_MINUTES} from "../config";
var strava = require("strava-v3");

var getReportMessage = function (activities) {
    var distance = ReportUtils.calculateDistance(activities);
    var gain = ReportUtils.calculateIncomingsByDistance(distance);
    return "Since your last report you have run " + Math.round(distance / 1000) + " km and earned " + gain + " €";
};

var reply = function (say, message, bot) {
    bot.reply(message, say);
};

var getUserInfo = function (bot, user) {
    return new Promise((resolve, reject) => {
        bot.api.users.info({user: user}, (error, response) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
};

function help (bot, message) {
    bot.startConversation(message, function (err, convo) {
        convo.say("To login send a message with the word *login*");
        convo.say("To save data of your trip, send a message with the word  *report*");
    });
}

function imCreated (bot, message) {
    bot.startConversation(message, function (err, convo) {
        convo.say("Hello, I am the bot will help you to calculate the money bonus you will receive monthly from using bike to come to work");
        convo.say("I save data from Strava every day and monthly sum the total of km you run");
        convo.say("To have list of commands digit *help*");
    });
}

function login (bot, message) {

    log.info(message, "Login request by user: " + message.user, "login", "in");

    var slackId = message.user;
    var slackChannel = message.channel;
    var _user = null;
    var url = null;

    return User
        .findBySlackId(slackId)
        .then(user => {

            if (user && user.stravaAuthToken !== null) {
                log.info(message, "User already registered", "login", "in");
                reply("Hello, you are already registered", message, bot);
                throw new Error("User already registered");
            }

            _user = user;

            return Token({
                slackId: slackId,
                uuid: uuid.v4(),
                expire: moment().add(TOKEN_EXPIRE_MINUTES, "minutes").unix()
            }).save();

        })
        .then(token => {

            url = strava.oauth.getRequestAccessURL({scope: "view_private", state: token.uuid});

            if (_user !== null) {
                log.info(message, "User already registered, missing strava auth token", "login", "out");
                return url;
            } else {
                return getUserInfo(bot, message.user)
                    .then(response => {
                        _user = new User({
                            name: response.user.profile.first_name,
                            surname: response.user.profile.last_name,
                            screenName: response.user.name,
                            realName: response.user.real_name,
                            slackId: slackId,
                            slackChannel: slackChannel,
                            location: {
                                type: "Point",
                                coordinates: [0, 0]
                            }
                        });

                        return _user.save();
                    });
            }
        })
        .then(() => {
            reply("Visit following url for complete registration: " + url, message, bot);
            return _user;
        })
        .catch(err => {
            log.error({}, "Login error: " + err.message, "login", "out");
            throw err;
        });
}

function report (bot, message) {

    var currentMonth = moment.utc();
    var start = currentMonth.startOf("month").unix();
    var end = currentMonth.endOf("month").unix();

    return User.findBySlackId(message.user)
        .then(user => {
            if (user === null || user.stravaAuthToken === null) {
                reply("Hello, you are not registered yet to service. To do it send a message with *login*", message, bot);
                throw new Error("User not registered");
            }
            return Activity.findCommutingActivities(user, start, end);
        })
        .then(activities => {
            var response = getReportMessage(activities);
            reply(response, message, bot);
            return response;
        })
        .catch(err => {
            log.error({}, "Report error: " + err.message, "report", "out");
            throw err;
        });
}

function reportByUser (user) {

    var currentMonth = moment.utc();
    var start = currentMonth.startOf("month").unix();
    var end = currentMonth.endOf("month").unix();

    return Activity.findCommutingActivities(user, start, end)
        .then(activities => {
            return getReportMessage(activities);
        });
}

export default {
    help,
    imCreated,
    login,
    report,
    reportByUser
};