var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var reportSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: "User"},
    start: Number,
    end: Number,
    distance: Number
});

var Report = mongoose.model("Report", reportSchema);

module.exports = Report;