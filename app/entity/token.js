var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var userSchema = new Schema({
    slackId: String,
    uuid: String,
    expire: Number
});

var Token = mongoose.model("Token", userSchema);

module.exports = Token;