var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var R = require('ramda');
var routes = require('./routes/index');
var Botkit = require('botkit');
var strava = require('strava-v3');
var mongoose = require('mongoose');
var User = require('./entity/user');
var Activity = require('./entity/activity');
var Token = require('./entity/token');
var uuid = require('node-uuid');
var moment = require('moment');
var cron = require('node-cron');

mongoose.connect('mongodb://127.0.0.1:27017/stravabot');
mongoose.Promise = global.Promise;
var slackToken = process.env.SLACK_TOKEN;
var controller = Botkit.slackbot();
var bot = controller.spawn({
    token: slackToken
})
//mongoose.set('debug', true);


bot.startRTM(function (err, bot, payload) {
    if (err) {
        throw new Error('Could not connect to Slack');
    }
});

/*
 var monthlyQuery = function (users) {
 if (users.length == 0) {
 return;
 }

 Activity.find({user: users[0]})
 .where('downloadDate')
 .gt(moment().subtract(1, 'month').unix())
 .sort({downloadDate: -1})
 .exec()
 .then(function (activities) {
 console.log("length:" + activities.length);
 if (activities.length > 0) {
 var distance = calcolaDistance(activities);

 distance = Math.round(distance / 1000);
 var gain = distance * 0.20;
 say = 'This month you have run ' + distance + ' km and earned ' + gain + ' euro';
 } else {
 say = 'This month you have not run any trip';
 }
 bot.startPrivateConversation({user: users[0].slackId}, function (err, convo) {
 if (err) {
 console.log("Error: " + err);
 } else {
 convo.say(say);
 }
 });

 monthlyQuery(R.tail(users));
 })
 .catch(function (err) {
 console.log('oh nooooooo: ', err);
 })
 };

 var schedule = function () {
 cron.schedule('* * 1 * *', function () {
 console.log('running a task every month');
 User.find({}, function (err, users) {
 if (err) {
 console.log("error: " + err);
 }
 monthlyQuery(users);
 });
 });
 };
 //schedule();


 var findActivity = function (users) {
 if (users.length == 0) {
 return;
 }

 Activity.find({user: users[0]})
 .sort({downloadDate: -1})
 .limit(1)
 .exec()
 .then(function (activity) {
 var option = {
 access_token: users[0].stravaAuthToken
 };
 if (activity.length > 0) {
 option.after = ((moment().subtract(7, 'days').unix() < activity[0].downloadDate)) ? activity[0].downloadDate : (moment().subtract(7, 'days').unix());
 } else {
 option.after = moment().subtract(7, 'days').unix();
 }
 return new Promise(
 function (resolve, reject) {
 console.log('chiamo strava');
 strava.athlete.listActivities(option, function (err, data) {
 if (err) {
 console.log('strava err: ', err);
 reject(err);
 } else {
 console.log('resolve promise');
 resolve(data);
 }
 });
 });
 })
 .then(function (data) {
 console.log("ciao dalla promise");
 var activities = R.filter(activity => activity.commute == true, data);
 console.log('Activities: ', activities);
 console.log('Number: ', activities.length);
 if (activities.length > 0) {
 var distance = calcolaDistance(activities);
 var activity = Activity({
 user: users[0],
 downloadDate: moment().unix(),
 distance: distance,
 activities: activities.length
 });
 return new Promise(
 function (resolve, reject) {
 console.log('salvo attività');
 activity.save(function (err, activitySaved) {
 if (err) {
 console.log('Error in save activity', err);
 reject(err);
 } else {
 console.log('resolve saving promise');
 resolve(activitySaved);
 }
 });
 });
 }


 }).then(function (activitySaved) {
 console.log("activity saved :", activitySaved);
 findActivity(R.tail(users));
 }).catch(function (err) {
 console.log('oh nooooooo: ', err);
 })
 };

 var recursive = function () {
 console.log("It has been one week!");

 User.find({}, function (err, users) {
 if (err) {
 console.log("error: " + err);
 }
 findActivity(users);
 });

 setTimeout(recursive, 604800);
 }
 //recursive();

 */

// # Weekly Download
cron.schedule('* * * * 0', function () {
    console.log('Task: downloadWeekly');
    User.find({}, function (err, users) {
        if (err) {
            console.log("error: " + err);
        }
        console.log('Found ' + users.length + ' users');
        downloadActivities(users);
    });
});


controller.on('im_created', function (bot, message) {
    bot.startConversation(message, function (err, convo) {
        convo.say("Hello, I am the bot will help you to calculate the money bonus you will receive monthly from using bike to come to work");
        convo.say("I save data from Strava every week and monthly sum the total of km you run");
        convo.say("To have list of commands digit *help*");
    });
})


controller.hears("login", ["direct_message"], function (bot, message) {
    // do something to respond to message
    // all of the fields available in a normal Slack message object are available
    // https://api.slack.com/events/message
    //console.log("message: ", message);


// TODO: use promise http://mongoosejs.com/docs/queries.html
    /*
     When a callback function:

     is passed, the operation will be executed immediately with the results passed to the callback.
     is not passed, an instance of Query is returned, which provides a special query builder interface.

     In mongoose 4, a Query has a .then() function, and thus can be used as a promise.
     */
    var slackId = message.user;

    User.findOne({slackId: slackId}, function (err, user) {
        if (err) {
            //TODO
            console.log(err);
            bot.reply(message, "TODO: messaggio di errore...riprova più tardi");
            return;
        }

        console.log('user:', user);

        if (user && user.stravaAuthToken != null) {
            console.log('user already exists and already have strava token');
            bot.reply(message, "Hello, you are already registered");
            return;
        }

        if (!user) {
            console.log('creating a new user');
            // creo l'oggetto user

            var token = new Token();
            token.slackId = slackId;
            var tempUuid = uuid.v4();
            token.uuid = tempUuid;

            token.save(function (err) {
                if (err) {
                    //TODO
                    console.log('error: ', err);
                }

                user = User({
                    name: 'TBD',
                    surname: 'TBD',
                    slackId: slackId,
                    location: {
                        type: "Point",
                        coordinates: [0, 0]
                    }
                });

                var url = strava.oauth.getRequestAccessURL({scope: "view_private", state: tempUuid});

                user.save(function (err) {
                    if (err) {
                        console.log(err);
                        throw err;
                    }
                    bot.reply(message, "Visita il link per completare la registrazione: " + url);
                });

            });


        }


    });
});

controller.hears("report", ["direct_message"], function (bot, message) {
    var slackId = message.user;
    User.findOne({slackId: slackId}, function (err, user) {
        if (err) {
            console.log("error report: ", err);
            bot.reply(message, "Oooops, something goes wrong. Try again later!");
            return;
        }
        if (!user || user.stravaAuthToken == null) {
            bot.reply(message, "Hello, you are not registered yet to service. To do it send a message with *login*");
        } else {
            // TODO deve rispondere con i km fatti dall'ultimo report, leggendo dal db
        }
    });
});

controller.hears(["help", "^pattern$"], ["direct_message"], function (bot, message) {

    //bot.reply(message, "Hello, to login send a message with the word *login*");
    //bot.reply(message, "To save data of your trip, send a message with the word  *report*");
    bot.startConversation(message, function (err, convo) {
        convo.say("To login send a message with the word *login*");
        convo.say("To save data of your trip, send a message with the word  *report*");

    });
});

controller.hears("test", ["direct_message"], function (bot, message) {

    //var slackId = message.user;
    var slackId = "U0HJXGK8A";

    User.findOne({slackId: slackId}, function (err, user) {
        if (err) {
            //TODO
            console.log(err);
            bot.reply(message, "TODO: messaggio di errore...riprova più tardi");
            return;
        }
        calcActivities(user)
            .then(function (response) {
                var distance = response[0];
                console.log("distance: ", distance);
                distance = Math.round(distance / 1000);
                var gain = distance * 0.20;
                var say = 'Since last report you have run ' + distance + ' km and earned ' + gain + ' euro';
                bot.reply(message, say);
            })
            .catch(err=> {
                //TODO
                console.log(err);
            });
    });
});

var calcActivities = function (user) {
    var office = {$geometry: {type: "Point", coordinates: [46.13, 9.55]}, $maxDistance: 1000}
    var home = {$geometry: {type: "Point", coordinates: user.location.coordinates}, $maxDistance: 1000};


    var queryStartHome = {
        $and: [
            {user: user, processed: false},
            {locationStart: {$near: home}}
        ]
    };
    var queryEndOffice = {
        $and: [
            {user: user, processed: false},
            {locationEnd: {$near: office}}
        ]
    };
    var queryStartOffice = {
        $and: [
            {user: user, processed: false},
            {locationStart: {$near: office}}
        ]
    };
    var queryEndHome = {
        $and: [
            {user: user, processed: false},
            {locationEnd: {$near: home}}
        ]
    };

    var findActivities = function (query) {
        return Activity.find(query, function (err, activities) {
            if (err) {
                console.log("Error in query activities: ", err);
                throw err;
                return;
            }
            if (activities.length == 0) {
                console.log("No activities to be processed");
            }
            //console.log('activities: ', activities);
            return activities;
        }).exec();
    }

    return Promise
        .all([
            findActivities(queryStartHome),
            findActivities(queryEndOffice),
            findActivities(queryStartOffice),
            findActivities(queryEndHome)])
        .then(data => {
            //console.log(data);
            var activitiesHomeToOffice = R.intersectionWith(R.eqBy(R.prop('stravaId')), data[0], data[1]);
            var activitiesOfficeToHome = R.intersectionWith(R.eqBy(R.prop('stravaId')), data[2], data[3]);
            var totActivities = activitiesHomeToOffice.concat(activitiesOfficeToHome);

            return R.mapAccum((distance, activity) => {
                return [distance + activity.distance, activity]
            }, 0, R.filter(activity=> {
                var day = moment(activity.startDate).format('E')
                return day != 6 && day != 7;
            }, totActivities));

            /*
             var distance = calcolaDistance(totActivities);
             var calcolaDistance = function (activities) {
             var distance = 0;
             for (var j = 0; j < activities.length; j++) {
             distance += activities[j].distance;
             }
             return distance;
             }
             */


            var unionActivities = R.unionWith(R.eqBy(R.prop('stravaId')), data[0], data[1]);
            unionActivities = R.unionWith(R.eqBy(R.prop('stravaId')), unionActivities, data[2]);
            unionActivities = R.unionWith(R.eqBy(R.prop('stravaId')), unionActivities, data[3]);
            updateProcessed(unionActivities);

            return distance;

        })
        .catch(err => {
            console.log("Promise.all si è rotta");
            console.log(err);
        });

}

var updateProcessed = function (activities) {
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
}

var formulaDistance = function (lon1, lat1, lon2, lat2) {
    var R = 6371e3; // metres
    var φ1 = lat1.toRadians();
    var φ2 = lat2.toRadians();
    var Δφ = (lat2 - lat1).toRadians();
    var Δλ = (lon2 - lon1).toRadians();

    var a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    var d = R * c;

    return d;
}

var downloadActivities = function (users) {

    if (users.length == 0) {
        console.log('No more users');
        return;
    }

    // cerco le attività per quell'utente sul db.
    // se non ci sono è il primo download, altrimenti prendo la data dell'ultima
    var currentUser = users[0];

    console.log('Downloading activities for user: ', currentUser.id);
    Activity.find({user: currentUser}).sort({startDate: -1}).limit(1).exec(function (err, activity) {
        activity = activity[0];
        if (err) {
            //TODO
            console.log(err);
            downloadActivities(R.tail(users));
            return;
        }
        var athleteObj = {
            access_token: currentUser.stravaAuthToken
        };

        if (activity != null) {
            console.log('trovata: ', activity);
            console.log('downloadDate: ', activity.downloadDate);
            athleteObj.after = activity.downloadDate;
        }


        strava.athlete.listActivities(athleteObj, function (err, data) {
            if (err) {
                //TODO
                downloadActivities(R.tail(users));
                return;
            }

            var activities = [];

            for (var i = 0; i < data.length; i++) {
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
                        coordinates: data[i].start_latlng
                    },
                    locationEnd: {
                        coordinates: data[i].end_latlng
                    },
                    startDate: data[i].start_date
                });
                act.locationStart.coordinates[0] = data[i].start_latlng[0];
                act.locationStart.coordinates[1] = data[i].start_latlng[1];
                act.locationEnd.coordinates[0] = data[i].end_latlng[0];
                act.locationEnd.coordinates[1] = data[i].end_latlng[1];
                activities.push(act.toObject());
            }

            if (activities.length == 0) {
                console.log('no new activities');
                downloadActivities(R.tail(users));
                return;
            }

            Activity.collection.insert(activities, function (err, res) {
                if (err) {
                    //TODO
                    console.log('error in bulk insert: ', err);
                    return;
                }
                console.log('Saved: ' + res.insertedCount + ' activities    ');
                downloadActivities(R.tail(users));
            });

        });


    });

};

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(require('node-sass-middleware')({
    src: path.join(__dirname, 'public'),
    dest: path.join(__dirname, 'public'),
    indentedSyntax: true,
    sourceMap: true
}));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
//app.use('/users', users);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
