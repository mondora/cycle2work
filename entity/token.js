var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var userSchema = new Schema({
    slackId: String,
    uuid: String,
    expire: Date
});
// TODO manage expire date
var Token = mongoose.model("Token", userSchema);

module.exports = Token;