import log from "../log";
import Activity from "../entity/activity";
import User from "../entity/user";
import Token from "../entity/token";
import uuid from "node-uuid";
import strava from "strava-v3";
import moment from "moment";
import ReportUtils from "../utils/reportUtils";
import {TOKEN_EXPIRE_MINUTES} from "../config";

var getReportMessage = function (activities) {
    var distance = ReportUtils.calculateDistance(activities);
    var gain = ReportUtils.calculateIncomingsByDistance(distance);
    return "Since last report you have run " + Math.round(distance / 1000) + " km and earned " + gain + " €";
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
    var user = null;
    var url = null;

    User
        .findBySlackId(slackId)
        .then(usr => {

            if (usr && usr.stravaAuthToken !== null) {
                log.info(message, "User already registered", "login", "in");
                bot.reply(message, "Hello, you are already registered");
                throw new Error("User already registered");
            }

            user = usr;

            return Token({
                slackId: slackId,
                uuid: uuid.v4(),
                expire: moment().add(TOKEN_EXPIRE_MINUTES, "minutes").unix()
            }).save();

        })
        .then(token => {

            url = strava.oauth.getRequestAccessURL({scope: "view_private", state: token.uuid});

            if (user !== null) {
                log.info(message, "User already registered, missing strava auth token", "login", "out");
                return url;
            }

            bot.api.users.info({user: message.user}, (error, response) => {

                user = User({
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

                return user
                    .save();
            });
        })
        .then(() => {
            bot.reply(message, "Visit following url for complete registration: " + url);
        })
        .catch(err => {
            log.error({}, "Login error: " + err.message, "login", "out");
        });
}

function report (bot, message) {

    var currentMonth = moment.utc();
    var start = currentMonth.startOf("month").unix();
    var end = currentMonth.endOf("month").unix();

    User.findBySlackId(message.user)
        .then(user => {
            if (!user || user.stravaAuthToken === null) {
                bot.reply(message, "Hello, you are not registered yet to service. To do it send a message with *login*");
                throw new Error("User not registered");
            }
            return Activity.findCommutingActivities(user, start, end);
        })
        .then(activities => {
            var say = getReportMessage(activities);
            bot.reply(message, say);
        })
        .catch(err => {
            log.error({}, "Report error: " + err.message, "report", "out");
        });
}

function reportByUser (user) {

    var currentMonth = moment.utc();
    var start = currentMonth.startOf("month").unix();
    var end = currentMonth.endOf("month").unix();

    return Activity.findCommutingActivities(user, start, end)
        .then(activities => {
            return getReportMessage(activities);
        })
        .catch(err => {
            log.error({user: user}, "Report error: " + err.message, "reportBySlackId", "out");
        });
}

export default {
    help,
    imCreated,
    login,
    report,
    reportByUser
};