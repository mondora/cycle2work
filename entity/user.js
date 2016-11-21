var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var userSchema = new Schema({
    name: String,
    surname: String,
    screenName: String,
    realName: String,
    slackId: String,
    slackChannel: String,
    stravaAuthToken: String,
    location: {type: {type: String, default: "Point"}, coordinates: [Number]},
    created_at: Date,
    updated_at: Date
});
userSchema.index({location: "2dsphere"});

userSchema.statics.findBySlackId = function (slackId) {
    return User.findOne({slackId: slackId});
}

var User = mongoose.model("User", userSchema);

module.exports = User;