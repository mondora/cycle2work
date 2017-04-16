import R from "ramda";

var calculateDistance = (activities) => {
    return R.mapAccum((distance, activity) => [distance + activity.distance, activity], 0, activities)[0];
};

var calculateIncomingsByDistance = (distance) => {
    return ((distance * 0.20) / 1000).toFixed(2);
};

var calculateIncomingsFromActivities = (activities) => {
    return calculateIncomingsByDistance(calculateDistance(activities));
};

export default {
    calculateDistance,
    calculateIncomingsByDistance,
    calculateIncomingsFromActivities
};