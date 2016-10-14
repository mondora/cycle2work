var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var activitySchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: 'User'},
    downloadDate: Number,
    distance: Number,
    name: String,
    stravaId: Number,
    type: String,
    movingTime: Number,
    elapsedTime: Number,
    locationStart: {type: {type: String}, coordinates: [Number]},
    locationEnd: {type: {type: String}, coordinates: [Number]},
    commute: Boolean,
    processed: {type: Boolean, default: false},
    startDate: Date,
    created_at: Date,
    updated_at: Date,
});

var Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;