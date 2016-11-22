var express = require("express");
var path = require("path");
// var favicon = require("serve-favicon");
var logger = require("morgan");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");

var R = require("ramda");
var routes = require("./routes/index");
var Botkit = require("botkit");
var strava = require("strava-v3");
var mongoose = require("mongoose");
var User = require("./entity/user");
var Activity = require("./entity/activity");
var Report = require("./entity/report");
var Token = require("./entity/token");
var uuid = require("node-uuid");
var moment = require("moment");

require("./cron");

mongoose.connect(process.env.DB_URL);
mongoose.Promise = global.Promise;
var slackToken = process.env.SLACK_TOKEN;
var controller = Botkit.slackbot();
var bot = controller.spawn({
    token: slackToken
});
mongoose.set("debug", true);

bot.startRTM(function (err, bot, payload) {
    if (err) {
        throw new Error("Could not connect to Slack");
    }
});

// User has opened the conversation with bot for the first time
controller.on("im_created", function (bot, message) {
    bot.startConversation(message, function (err, convo) {
        convo.say("Hello, I am the bot will help you to calculate the money bonus you will receive monthly from using bike to come to work");
        convo.say("I save data from Strava every week and monthly sum the total of km you run");
        convo.say("To have list of commands digit *help*");
    });
});

controller.hears("login", ["direct_message"], function (bot, message) {

    // do something to respond to message
    // all of the fields available in a normal Slack message object are available
    // https://api.slack.com/events/message

    /*
     When a callback function:

     is passed, the operation will be executed immediately with the results passed to the callback.
     is not passed, an instance of Query is returned, which provides a special query builder interface.

     In mongoose 4, a Query has a .then() function, and thus can be used as a promise.
     */
    var slackId = message.user;
    var slackChannel = message.channel;
    var user = null;
    var url = null;

    User
        .findBySlackId(slackId)
        .then(usr => {
            if (usr && usr.stravaAuthToken != null) {
                console.log("user already exists and already have strava token");
                bot.reply(message, "Hello, you are already registered");
                throw new Error("User already registered");
            }

            user = usr;

            return Token({
                slackId: slackId,
                uuid: uuid.v4(),
                expire: moment().unix()
            }).save();

        })
        .then(token => {

            url = strava.oauth.getRequestAccessURL({scope: "view_private", state: token.uuid});

            if (user != null) {
                console.log("User exists, missing strava auth token");
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
            console.log(err);
        });

});

controller.hears("report", ["direct_message"], function (bot, message) {
    var slackId = message.user;

    var currentMonth = moment.utc();
    var start = currentMonth.startOf("month").unix();
    var end = currentMonth.endOf("month").unix();

    User.findBySlackId(slackId)
        .then(user => {
            console.log(user);
            if (!user || user.stravaAuthToken == null) {
                bot.reply(message, "Hello, you are not registered yet to service. To do it send a message with *login*");
                throw new Error("User not registered");
            }
            return Activity.findCommutingActivities(user, start, end);
        })
        .then(response => {
            var distance = calculateDistance(response);
            var gain = (distance * 0.20) / 1000;
            var say = "Since last report you have run " + Math.round(distance / 1000) + " km and earned " + gain + " €";
            bot.reply(message, say);
        })
        .catch(err => {
            console.log(err);
        });
});

controller.hears("help", ["direct_message"], function (bot, message) {
    bot.startConversation(message, function (err, convo) {
        convo.say("To login send a message with the word *login*");
        convo.say("To save data of your trip, send a message with the word  *report*");

    });
});

var calculateDistance = function (activities) {
    return R.mapAccum((distance, activity) => [distance + activity.distance, activity], 0, activities)[0];
};

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

// uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, "public", "favicon.ico")));
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(require("node-sass-middleware")({
    src: path.join(__dirname, "public"),
    dest: path.join(__dirname, "public"),
    indentedSyntax: true,
    sourceMap: true
}));
app.use(express.static(path.join(__dirname, "public")));

app.use("/", routes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error("Not Found");
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get("env") === "development") {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render("error", {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render("error", {
        message: err.message,
        error: {}
    });
});


module.exports = app;
