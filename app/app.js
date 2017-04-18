var express = require("express");
var path = require("path");
// var favicon = require("serve-favicon");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var routes = require("./routes/index");
var Botkit = require("botkit");
var mongoose = require("mongoose");
import log from "./log";
import action from "./bot/action";
import Cron from "./cron";
import {LOG_DIR, LOG_LEVEL, SLACK_TOKEN, DB_URL} from "./config";

mongoose.Promise = global.Promise;
mongoose.connect(DB_URL);

var controller = Botkit.slackbot({
    logger: log.botkit
});

var bot = controller.spawn({
    token: SLACK_TOKEN
});
// mongoose.set("debug", true);

bot.startRTM(function (err, bot, payload) {
    if (err) {
        log.error(payload, "Could not connect to Slack: " + err.message, "startRTM", "");
        throw new Error("Could not connect to Slack");
    }
    log.info({}, "Connected to slack", "startRTM", "");
    // Start cron
    new Cron(bot);
});

// do something to respond to message
// all of the fields available in a normal Slack message object are available
// https://api.slack.com/events/message

// User has opened the conversation with bot for the first time
controller.on("im_created", function (bot, message) {
    action.imCreated(bot, message);
});

controller.hears("login", ["direct_message"], function (bot, message) {
    log.info(message, "Hear report", "hears", "report");
    action
        .login(bot, message)
        .catch(err => {
            log.error(err, "Login error: ", "hears", "login");
        });
});

controller.hears("report", ["direct_message"], function (bot, message) {
    log.info(message, "Hear report", "hears", "report");
    action
        .report(bot, message)
        .catch(err => {
            log.error(err, "Report error: ", "hears", "report");
        });
});

controller.hears("help", ["direct_message"], function (bot, message) {
    action.help(bot, message);
});

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

// uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, "public", "favicon.ico")));
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

app.use(require("express-bunyan-logger")({
    name: "express",
    obfuscate: ["body.token"],
    streams: [{
        path: `${LOG_DIR}/cycle2work-express.log`,
        type: "rotating-file",
        period: "1d",
        count: 7,
        level: LOG_LEVEL
    }]
}));

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
    app.use(function (err, req, res) {
        res.status(err.status || 500);
        res.render("error", {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res) {
    res.status(err.status || 500);
    res.render("error", {
        message: err.message,
        error: {}
    });
});


module.exports = app;
