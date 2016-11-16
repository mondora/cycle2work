var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
    name: String,
    surname: String,
    slackId: String,
    stravaAuthToken: String,
    location: {type: {type: String, default: 'Point'}, coordinates: [Number]},
    created_at: Date,
    updated_at: Date
});
userSchema.index({location: '2dsphere'});
var User = mongoose.model('User', userSchema);

module.exports = User;