var Report = require("./report");
var Download = require("./downloadActivities");
var TokenExpire = require("./tokenExpire");
module.exports = function Cron (bot) {
    return {
        report: new Report(bot),
        download: new Download(bot),
        tokenExpire: new TokenExpire()
    };
};