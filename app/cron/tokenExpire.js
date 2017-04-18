import cron from "node-cron";
import Token from "../entity/token";
import log from "../log";
import moment from "moment";


var tokenExpire = cron.schedule("0 2 * * *", function () {
    deleteExpired()
        .then(() => {
            log.info({}, "Token expire complete", "cron-token", "out");
        })
        .catch(err => {
            log.error({}, "Error in monthly report: " + err.message, "cron-token", "out");
        });
});

var deleteExpired = function () {
    var now = moment().unix();
    return Token.remove({expire: {$lte: now}})
        .then(tokens => {
            log.info({now: now}, "Deleted " + tokens.result.n + " expired token(s)", "deleteExpired", "out");
        })
        .catch(err => {
            throw err;
        });
};

module.exports = function TokenExpire () {
    return tokenExpire;
};