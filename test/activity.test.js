import moment from "moment";
import should from "should";
import User from "../app/entity/user";
import Activity from "../app/entity/activity";
import ReportUtils from "../app/utils/reportUtils";

describe("Activity", () => {

    var currentMonth = moment(527027413000).utc();
    var start = currentMonth.startOf("month").unix();
    var end = currentMonth.endOf("month").unix();

    it("Should find six activities for user", done => {
        User.findBySlackId("123")
            .then(user => {
                return Activity.find({user: user});
            })
            .then(activities => {
                should.equal(activities.length, 6);
                done();
            })
            .catch(error => {
                done(error);
            });
    });

    it("Should find two commuting activities", done => {

        User.findBySlackId("123")
            .then(user => {
                return Activity.findCommutingActivities(user, start, end);
            })
            .then(activities => {
                should.equal(activities.length, 2);
                done();
            })
            .catch(error => {
                done(error);
            });
    });

    it("Should throw exception on query error", done => {
        User.findBySlackId("123")
            .then(user => {
                return Activity.findCommutingActivities(user, "notavaliddate", "anotherinvaliddate");
            })
            .then(() => {
                done(new Error("Should not be here"));
            })
            .catch(e => {
                should.exists(e);
                e.message.should.startWith("Cast to number failed");
                done();
            })
            .catch(e => {
                done(e);
            });
    });

    it("Should return empty array", done => {

        User.findBySlackId("456")
            .then(user => {
                should.equal(user.screenName, "mock");
                return Activity.findCommutingActivities(user, start, end);
            })
            .then(activities => {
                should.equal(activities.length, 0);
                done();
            })
            .catch(error => {
                done(error);
            });
    });

    it("Should calculate distance", done => {

        User.findBySlackId("123")
            .then(user => {
                should.equal(user.screenName, "mock");
                return Activity.findCommutingActivities(user, start, end);
            })
            .then(activities => {
                var distance = ReportUtils.calculateDistance(activities);
                should.equal(distance, 41063.8);
                done();
            })
            .catch(error => {
                done(error);
            });
    });

    it("Should calculate revenue", done => {

        User.findBySlackId("123")
            .then(user => {
                should.equal(user.screenName, "mock");
                return Activity.findCommutingActivities(user, start, end);
            })
            .then(activities => {
                var revenue = ReportUtils.calculateIncomingsFromActivities(activities);
                should.equal(revenue, "8.21");
                done();
            })
            .catch(error => {
                done(error);
            });
    });

    it("Should find only one activity flagged as commute", done => {
        var currentMonth = moment(1492218270000).utc();
        var start = currentMonth.startOf("month").unix();
        var end = currentMonth.endOf("month").unix();

        Activity.find({commute: true})
            .then(activities => {
                should.equal(activities.length, 2);
                return User.findBySlackId("123");
            })
            .then(user => {
                return Activity.findCommutingActivities(user, start, end);
            })
            .then(activities => {
                should.equal(activities.length, 1, "Weekend activity should not count");
                done();
            })
            .catch(error => {
                done(error);
            });
    });

});