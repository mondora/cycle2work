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
mongoose.set('debug', true);


bot.startRTM(function (err, bot, payload) {
    if (err) {
        throw new Error('Could not connect to Slack');
    }
});

var calcolaDistance = function (activities) {
    var distance = 0;
    for (var j = 0; j < activities.length; j++) {
        distance += activities[j].distance;
    }
    return distance;
}

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
    cron.schedule('* * * 1 * *', function () {
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


controller.on('im_created', function (bot, message) {
    bot.startConversation(message, function (err, convo) {
        convo.say("Hello, I am the bot will help you to calculate the money bonus you will receive monthly from using bike to come to work");
        convo.say("I save data from Strava every week and monthly sum the total of km you run");
        convo.say("To have list of commands digit *help*");
    });
})

controller.hears(["prova", "^pattern$"], ["direct_message", "direct_mention", "mention", "ambient"], function (bot, message) {
    // do something to respond to message
    // all of the fields available in a normal Slack message object are available
    // https://api.slack.com/events/message
    Activity.findOne({}, function (err, activity) {
        console.log("start date: ", activity.startDate);
    });

    bot.reply(message, 'Ciao ' + message.user);
});

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

controller.hears("report2", ["direct_message"], function (bot, message) {
    var slackId = message.user;
    User.findOne({slackId: slackId}, function (err, user) {
        if (err) {
            console.log("error report 2: ", err);
            return;
        }
        downloadActivities(user);
    });
});

controller.hears("report", ["direct_message"], function (bot, message) {

    var slackId = message.user;
    User.findOne({slackId: slackId}, function (err, user) {

        if (err) {
            // TODO
            console.log(err);
            return;
        }
        if (!user || user.stravaAuthToken == null) {
            bot.reply(message, "Hello, you are not registered yet to service. To do it send a message with *login*");
        } else {
            Activity.findOne({user: user}).sort({downloadDate: -1}).limit(1).exec(function (err, activity) {
                if (err) {
                    //TODO
                    console.log(err);
                    return;
                }
                var athleteObj = {
                    access_token: user.stravaAuthToken
                };
                if (activity != null) {
                    console.log('trovata: ', activity);
                    console.log('downloadDate: ', activity.downloadDate);
                    athleteObj.after = activity.downloadDate;
                }


                strava.athlete.listActivities(athleteObj, function (err, data) {
                    if (!err) {
                        var activities = R.filter(activity => activity.commute == true, data);
                        // coordinate ufficio: 46.13, 9.55
                        console.log('Activities: ', activities);
                        console.log('Number: ', activities.length);
                        if (activities.length > 0) {
                            var distance = calcolaDistance(activities);
                            var activity = Activity({
                                user: user,
                                downloadDate: moment().unix(),
                                distance: distance,
                                activities: activities.length
                            });
                            console.log('Saving activity: ', activity);
                            activity.save(function (err) {
                                if (!err) {
                                    console.log('attività salvata: ', activity);
                                    distance = Math.round(distance);
                                    bot.reply(message, "Hello, you have run " + (distance / 1000) + " km");
                                }
                            });
                        } else {
                            bot.reply(message, "No activities since last report");
                        }
                    }
                });
            });
            /*

             strava.athlete.listActivities({'access_token': user.stravaAuthToken}, function (err, data) {
             var activities = R.filter(activity => activity.commute == true, data);
             console.log(activities);
             // R.forEach(a => console.log(moment(a.start_date).format('X')), asd);
             });
             */
        }
    });
});

var downloadActivities = function (user) {

    // cerco le attività per quell'utente sul db.
    // se non ci sono è il primo download, altrimenti prendo la data dell'ultima
    console.log('User: ', user);
    Activity.find({user: user}).sort({startDate: -1}).limit(1).exec(function (err, activity) {
        console.log('Activity:', activity);
        console.log('User: ', user);
        console.log('User2obj: ', user.toObject());
        activity = activity[0];
        if (err) {
            //TODO
            console.log(err);
            return;
        }
        var athleteObj = {
            access_token: user.stravaAuthToken
        };

        if (activity != null) {
            console.log('trovata: ', activity);
            console.log('downloadDate: ', activity.downloadDate);
            athleteObj.after = activity.downloadDate;
        }


        strava.athlete.listActivities(athleteObj, function (err, data) {
            if (err) {
                //TODO
                return;
            }

            var activities = [];

            for (var i = 0; i < data.length; i++) {
                var act = new Activity({
                    user: user.toObject(),
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
                    commute: data[i].commute,
                    startDate: data[i].start_date
                });

                activities.push(act.toObject());
            }

            if (activities.length == 0) {
                console.log('no new activities');
                return;
            }

            Activity.collection.insert(activities, function (err, res) {
                if (err) {
                    //TODO
                    console.log('error in bulk inser: ', err);
                    return;
                }
                console.log('Saved: ' + res.insertedCount + ' activities    ');
            });

        });


    });

};


controller.hears(["help", "^pattern$"], ["direct_message"], function (bot, message) {

    //bot.reply(message, "Hello, to login send a message with the word *login*");
    //bot.reply(message, "To save data of your trip, send a message with the word  *report*");
    bot.startConversation(message, function (err, convo) {
        convo.say("To login send a message with the word *login*");
        convo.say("To save data of your trip, send a message with the word  *report*");

    });
});

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
