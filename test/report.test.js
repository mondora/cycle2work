import moment from "moment";
import should from "should";
import User from "../app/entity/user";
import Report from "../app/entity/report";
import Activity from "../app/entity/activity";
import rewire from "rewire";

var report = rewire("../app/cron/report");

describe("Report", () => {

    it("Should save report for previous month", done => {
        var currentMonth = moment(531100799000).utc().add("-1", "month");
        var start = currentMonth.startOf("month").unix();
        var end = currentMonth.endOf("month").unix();

        report.__set__("say", function (channel, text) {
            should.exists(channel);
            should.exists(text);
            should.equal(text, "Monthly report (01/09/1986 - 01/10/1986): 41.06km, 8.21€");
        });

        User.findBySlackId("123")
            .then(user => {
                var u = user;
                var saveReport = report.__get__("saveReport");
                return saveReport(u, start, end);
            })
            .then(() => {
                return Report.find();
            })
            .then(reports => {
                var report = reports[0];
                should.equal(report.distance, 41063.8, "Check distance");
                should.equal(report.start, 525916800, "Check start date");
                should.equal(report.end, 528508799, "Check end date");
                done();
            })
            .catch(e => {
                done(e);
            });
    });

    it("Should throw exception on duplicate report", done => {
        var currentMonth = moment(531100799000).utc().add("-1", "month");
        var start = currentMonth.startOf("month").unix();
        var end = currentMonth.endOf("month").unix();
        User.findBySlackId("123")
            .then(user => {
                var u = user;
                var saveReport = report.__get__("saveReport");
                return saveReport(u, start, end);
            })
            .catch(e => {
                should.exist(e);
                done();
            });
    });

    it("Should find two processed activities", done => {
        Activity.find({processed: true})
            .then(activities => {
                should.equal(activities.length, 2);
                done();
            })
            .catch(e => {
                done(e);
            });
    });

    it("Should produce two reports one for each users", done => {
        report.__set__("say", function (channel, text) {
            should.exists(channel);
            should.exists(text);
        });

        Report.remove()
            .then(() => {
                var monthlyReport = report.__get__("monthlyReport");
                return monthlyReport();
            })
            .then(() => {
                return Report.find({});
            })
            .then(reports => {
                should.equal(reports.length, 2);
                done();
            })
            .catch(e => {
                done(e);
            });
    });

    it("Should not fail if no activities are found", done => {
        var currentMonth = moment(528508799000).utc().add("-1", "month");
        var start = currentMonth.startOf("month").unix();
        var end = currentMonth.endOf("month").unix();
        var u;

        report.__set__("say", function (channel, text) {
            should.equal(channel, "mockChannel");
            should.equal(text, "Monthly report (01/08/1986 - 01/09/1986): 0.00km, 0.00€");
        });

        Report.remove()
            .then(() => {
                return User.findBySlackId("123");
            })
            .then(user => {
                u = user;
                var saveReport = report.__get__("saveReport");
                return saveReport(u, start, end);
            })
            .then(() => {
                return Report.find({user: u});
            })
            .then(reports => {
                var report = reports[0];
                should.equal(report.distance, 0, "Check distance");
                should.equal(reports.length, 1);
            })
            .then(() => {
                done();
            })
            .catch(e => {
                done(e);
            });
    });

    it("Should throw exception if report fails", done => {
        report.__set__("moment", {

            utc: function () {
                return {
                    add: function () {
                        return {
                            startOf: function () {
                                return {
                                    unix: function () {
                                        return "notavaliddate";
                                    }
                                };
                            },
                            endOf: function () {
                                return {
                                    unix: function () {
                                        return "notavaliddate";
                                    }
                                };
                            }
                        };
                    }
                };
            }
        });

        var monthlyReport = report.__get__("monthlyReport");

        monthlyReport()
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

});