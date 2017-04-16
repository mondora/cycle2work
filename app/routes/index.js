var express = require("express");
var router = express.Router();
var strava = require("strava-v3");
var moment = require("moment");
var User = require("../entity/user");
var Token = require("../entity/token");
import log from "../log";

/* GET home page. */
router.get("/", function (req, res, next) {
    res.render("index", {title: "Express"});
});

router.post("/confirm", function (req, res, next) {

    // TODO migliorare validazione
    if (!req.body || !req.body.lat || !req.body.lng || !req.body.token) {
        res.send({error: "an error occurred"});
        return;
    }

    var lat = req.body.lat;
    var lng = req.body.lng;

    Token.findOne({uuid: req.body.token}, function (err, token) {

        if (err) {
            res.send({error: "an error occurred"});
            return;
        }
        if ((token === null) || (token.expire < moment().unix())) {
            res.send({error: "token expired"});
            return;
        }

        User.findOne({slackId: token.slackId}, function (err, user) {
            if (err || !user) {
                log.error(req, "Error retrieving user", "/confirm", "out");
            }

            user.location.coordinates = [lat, lng];

            user.save(function (err) {
                if (err) {
                    log.error({}, "Error saving user: " + err.message);
                }
                token.remove();
                res.send({error: null, message: ""});
            });
        });
        // recuperare l"utente
        // aggiornare coordinate
        // salvare utente
        // cancellare token
    });
});

router.get("/confirm", function (req, res, next) {
    var code = req.query.code;
    var userUuid = req.query.state;

    Token.findOne({uuid: userUuid}, function (err, token) {
        if (err || !token || token.expire < moment().unix()) {
            // TODO mostrare una pagina di errore
            res.render("error", {message: "token expired", error: {status: 500, stack: ""}});
            return;
        }

        User.findOne({slackId: token.slackId}, function (err, user) {
            if (err || !user) {
                // TODO
            }


            strava.oauth.getToken(code, function (err, payload) {

                if (err) {
                    res.render("confirm", {access_token: "Si è verificato un errore, riprova"});
                }

                user.stravaAuthToken = payload.access_token;


                user.save(function (err) {
                    if (err) {
                        res.render("confirm", {uuid: null});
                    }
                    res.render("confirm", {uuid: token.uuid});
                });

            });

        });

    });


});

module.exports = router;
