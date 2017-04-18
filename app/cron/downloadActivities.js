import cron from "node-cron";
import User from "../entity/user";
import Activity from "../entity/activity";
import strava from "strava-v3";
import moment from "moment";
import log from "../log";
import action from "../bot/action";

var _bot;

var say = function (channel, text) {
    _bot.say({
        text: text,
        channel: channel
    });
};

var download = cron.schedule("0 1 * * *", function () {
    dailyDownload()
        .then(() => {
            log.info({}, "Daily download complete", "cron-download", "out");
        })
        .catch(err => {
            log.error({}, "Error downloading activities: " + err.message, "cron-download", "out");
        });
});

// Daily Download
var dailyDownload = function () {

    var _users;
    var i = 0;
    return User.find({stravaAuthToken: {$ne: null}})
        .then(users => {
            _users = users;
            log.info({}, "Found " + users.length + " users", "dailyDownload", "in");
        })
        .then(function loop () {
            if (i < _users.length) {
                return downloadActivities(_users[i])
                    .then(activities => {
                        if (activities.length > 0) {
                            var user = _users[i];
                            action.reportByUser(_users[i])
                                .then(message => {
                                    say(user.slackChannel, message);
                                })
                                .catch(err => {
                                    log.error({}, "Error sending dailyDownload message: " + err.message, "dailyDownload", "out");
                                });
                        }
                        i++;
                    })
                    .then(loop);
            }
        })
        .catch(err => {
            throw err;
        });
};

var downloadActivities = function (user) {
    log.info({}, "Downloading activities for user: " + user.screenName, "downloadActivities", "in");

    return Activity.find({user: user}).sort({startDate: -1}).limit(1).exec()
        .then(activities => {
            var query = {
                access_token: user.stravaAuthToken
            };

            if (activities !== null && activities.length > 0) {
                query.after = activities[0].downloadDate;
            }

            return new Promise((resolve, reject) => {
                strava.athlete.listActivities(query, function (err, data) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                });
            });
        })
        .then(data => {

            var activities = [];

            for (var i = 0; i < data.length; i++) {
                if ((data[i].start_latlng !== null) && (data[i].end_latlng !== null)) {
                    var act = new Activity({
                        user: user.toObject(),
                        downloadDate: moment().unix(),
                        distance: data[i].distance,
                        name: data[i].name,
                        stravaId: data[i].id,
                        type: data[i].type,
                        movingTime: data[i].moving_time,
                        elapsedTime: data[i].elapsed_time,
                        commute: data[i].commute,
                        locationStart: {
                            coordinates: [
                                data[i].start_latlng[0],
                                data[i].start_latlng[1]
                            ]
                        },
                        locationEnd: {
                            coordinates: [
                                data[i].end_latlng[0],
                                data[i].end_latlng[1]
                            ]
                        },
                        startDate: Date.parse(data[i].start_date) / 1000
                    });
                    activities.push(act.toObject());
                }
            }
            log.info({}, "Downloaded " + activities.length + " activities for user: " + user.screenName, "downloadActivities", "out");
            return Activity.insertMany(activities);
        })
        .catch(err => {
            log.error({}, "Error downloading activities: " + err.message, "downloadActivities", "out");
            throw err;
        });
};

module.exports = function Download (bot) {
    _bot = bot;
    return download;
};