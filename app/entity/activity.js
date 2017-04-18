import mongoose from "mongoose";
import moment from "moment";
import R from "ramda";
import log from "../log";

var Schema = mongoose.Schema;

var activitySchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: "User"},
    downloadDate: Number,
    distance: Number,
    name: String,
    stravaId: Number,
    type: String,
    movingTime: Number,
    elapsedTime: Number,
    locationStart: {type: {type: String, default: "Point"}, coordinates: [Number]},
    locationEnd: {type: {type: String, default: "Point"}, coordinates: [Number]},
    commute: Boolean,
    processed: {type: Boolean, default: false},
    startDate: Number,
    created_at: Date,
    updated_at: Date,
});
activitySchema.index({locationStart: "2dsphere"});
activitySchema.index({locationEnd: "2dsphere"});

activitySchema.statics.findCommutingActivities = function (user, startDate, endDate) {
    /*
     Query would return documents from the actitivites collection within the circle described by the center
     (office or user.location) with a radius of 1 kilometer.
     The equatorial radius of the Earth is approximately 3,963.2 miles or 6,378.1 kilometers
     */
    // TODO use env for radius and office location
    var radians = 1 / 6378.15214;
    var office = [46.1331794, 9.5507231];

    if (user === null) {
        throw new Error("User is null");
    }

    var query = {
        user: user,
        processed: false,
        startDate: {$gte: startDate, $lte: endDate},
        $or: [
            {
                $and: [
                    {
                        locationStart: {
                            $geoWithin: {
                                $centerSphere: [office, radians]
                            }
                        }
                    },
                    {
                        locationEnd: {
                            $geoWithin: {
                                $centerSphere: [user.location.coordinates, radians]
                            }
                        }
                    }
                ]
            },
            {
                $and: [
                    {
                        locationStart: {
                            $geoWithin: {
                                $centerSphere: [user.location.coordinates, radians]
                            }
                        }
                    },
                    {
                        locationEnd: {
                            $geoWithin: {
                                $centerSphere: [office, radians]
                            }
                        }
                    }
                ]
            },
            {
                commute: true
            }
        ]
    };

    return Activity.find(query)
        .then(activities => {
            return R.filter(activity => {
                var day = moment.unix(activity.startDate).format("E");
                return day !== "6" && day !== "7";
            }, activities);
        })
        .catch(err => {
            log.error(query, "Query error: " + err.message, "findCommutingActivities", "out");
            throw err;
        });
};

var Activity = mongoose.model("Activity", activitySchema);

module.exports = Activity;