var cron = require("node-cron");
var User = require("../entity/user");
var Activity = require("../entity/activity");
var strava = require("strava-v3");
var moment = require("moment");
var R = require("ramda");

// Daily Download
var download = cron.schedule("0 1 * * *", function () {
    console.log("Task: download daily");
    User.find({stravaAuthToken: {$ne: null}})
        .then(users => {
            console.log("Found " + users.length + " users");
            downloadActivities(users);
        })
        .catch(err => {
            console.log("Error finding users");
            console.log(err);
        });
});

var downloadActivities = function (users) {

    if (users.length == 0) {
        console.log("No more users");
        return;
    }

    // cerco le attività per quell"utente sul db.
    // se non ci sono è il primo download, altrimenti prendo la data dell"ultima
    var currentUser = users[0];

    console.log("Downloading activities for user: ", currentUser.name);
    Activity.find({user: currentUser}).sort({startDate: -1}).limit(1).exec(function (err, activity) {
        activity = activity[0];
        if (err) {
            // TODO
            console.log(err);
            downloadActivities(R.tail(users));
            return;
        }
        var athleteObj = {
            access_token: currentUser.stravaAuthToken
        };

        if (activity != null) {
            console.log("trovata: ", activity);
            console.log("downloadDate: ", activity.downloadDate);
            athleteObj.after = activity.downloadDate;
        }


        strava.athlete.listActivities(athleteObj, function (err, data) {
            if (err) {
                // TODO
                downloadActivities(R.tail(users));
                return;
            }

            var activities = [];

            for (var i = 0; i < data.length; i++) {
                if ((data[i].start_latlng != null) && (data[i].end_latlng != null)) {
                    var act = new Activity({
                        user: currentUser.toObject(),
                        downloadDate: moment().unix(),
                        distance: data[i].distance,
                        name: data[i].name,
                        stravaId: data[i].id,
                        type: data[i].type,
                        movingTime: data[i].moving_time,
                        elapsedTime: data[i].elapsed_time,
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
            if (activities.length == 0) {
                console.log("no new activities");
                downloadActivities(R.tail(users));
                return;
            }

            Activity.collection.insert(activities, function (err, res) {
                if (err) {
                    // TODO
                    console.log("error in bulk insert: ", err);
                    return;
                }
                console.log("Saved: " + res.insertedCount + " activities    ");
                downloadActivities(R.tail(users));
            });

        });


    });

};

module.exports = download;