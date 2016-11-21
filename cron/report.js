var cron = require("node-cron");
var User = require("../entity/user");
var Activity = require("../entity/activity");
var Report = require("../entity/report");
var R = require("ramda");
var moment = require("moment");

// Monthly Report
var report = cron.schedule("0 1 1 * *", function () {
    // monthlyReport();
    var currentMonth = moment.utc().add("-1", "month");
    var start = currentMonth.startOf("month").unix();
    var end = currentMonth.endOf("month").unix();

    User.find({stravaAuthToken: {$ne: null}})
        .then(users => {
            for (var i = 0; i < users.length; i++) {
                saveReport(users[i], start, end);
            }
        }).catch(err => {
            console.log(err);
        });
});

var updateProcessed = function (activities) {
    // TODO fixme
    /*
    if (activities.length == 0) {
        console.log("no more activities");
        return;
    }
    var activity = activities[0];
    Activity.update({stravaId: activity.stravaId}, {processed: true}, function (err, num, status) {
        if (err) {
            console.log("errore in update processed", err);
            return;
        }
        console.log("updated record");
        updateProcessed(R.tail(activities));
    });
    */
};

var saveReport = function (user, startDate, endDate) {
    // TODO fixme
/*
    Activity.findCommutingActivities(user, startDate, endDate)
        .then(activities => {

            if (activities.length == 0) {
                bot.say({
                    text: "Nessuna attività per questo mese",
                    channel: user.slackChannel
                });
                return;
            }

            var distance = calculateDistance(activities);
            var report = Report({
                user: user,
                start: startDate,
                end: endDate,
                distance: distance
            });
            report.save(function (err) {
                if (err) {
                    console.log("Error in saving report", err);
                    return;
                }
                updateProcessed(activities);
                var gain = Math.round((distance * 0.20) / 1000);
                bot.say({
                    text: "Report mensile: " + Math.round(distance / 1000) + "km, " + gain + "€",
                    channel: user.slackChannel
                });
            });
        })
        .catch(e => {
            // TODO manage errors
            console.log("error in saveReport");
            console.log(e);
        });
        */

};

module.exports = report;