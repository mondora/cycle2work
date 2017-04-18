import cron from "node-cron";
import User from "../entity/user";
import Activity from "../entity/activity";
import Report from "../entity/report";
import R from "ramda";
import ReportUtils from "../utils/reportUtils";
import log from "../log";

var moment = require("moment");
var _bot;

// Monthly Report
var report = cron.schedule("0 1 1 * *", function () {
    monthlyReport()
        .then(() => {
            log.info({}, "Monthly report complete", "cron-report", "out");
        })
        .catch(err => {
            log.error({}, "Error in monthly report: " + err.message, "cron-report", "out");
        });
});

var monthlyReport = function () {
    var currentMonth = moment.utc().add("-1", "month");
    var start = currentMonth.startOf("month").unix();
    var end = currentMonth.endOf("month").unix();

    var _users;
    var i = 0;
    return User.find({stravaAuthToken: {$ne: null}})
        .then(users => {
            _users = users;
            log.info({}, "Found " + users.length + " users", "monthlyReport", "in");
        })
        .then(function loop () {
            if (i < _users.length) {
                return saveReport(_users[i], start, end).then(i++).then(loop);
            }
        })
        .catch(err => {
            throw err;
        });
};

var say = function (channel, text) {
    _bot.say({
        text: text,
        channel: channel
    });
};

var saveReport = function (user, startDate, endDate) {
    var _activities;
    var _report;

    return Report
        .find({user: user.toObject(), start: startDate, end: endDate})
        .then(report => {
            if (report.length > 0) {
                throw new Error("Duplicate Report");
            }
            return Activity.findCommutingActivities(user, startDate, endDate);
        })
        .then(activities => {
            _activities = activities;
            var distance = ReportUtils.calculateDistance(activities);
            var report = Report({
                user: user.toObject(),
                start: startDate,
                end: endDate,
                distance: distance
            });
            return report.save();
        })
        .then(report => {
            _report = report;
            var ids = R.map(a => a._id, _activities);
            return Activity.update({"_id": {$in: ids}}, {$set: {processed: true}}, {multi: true});
        })
        .then(() => {
            var gain = ReportUtils.calculateIncomingsByDistance(_report.distance);
            say(user.slackChannel, "Monthly report (" + moment.unix(startDate).utc().format("DD/MM/YYYY") + " - " + moment.unix(endDate).utc().format("DD/MM/YYYY") + "): " + (_report.distance / 1000).toFixed(2) + "km, " + gain + "€");
            return;
        })
        .catch(e => {
            throw e;
        });
};

module.exports = function Report (bot) {
    _bot = bot;
    return report;
};