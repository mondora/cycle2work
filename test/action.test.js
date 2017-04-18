import should from "should";
import rewire from "rewire";
import User from "../app/entity/user";

var action = rewire("../app/bot/action");

describe("Action", () => {

    before(done => {
        action.__set__("getUserInfo", function () {
            return new Promise((resolve) => {
                resolve({
                    user: {
                        profile: {
                            first_name: "first name",
                            last_name: "last name",
                        },
                        name: "name",
                        real_name: "real name"
                    }
                });
            });
        });
        done();
    });

    it("Should throw exception on 'login' if user is already registered", done => {

        action.__set__("reply", function (say) {
            should.exist(say);
        });

        action.__get__("login")({}, {user: 123})
            .then(() => {
                done(new Error("Should not be here"));
            })
            .catch(err => {
                should.exist(err);
                should.equal(err.message, "User already registered");
                done();
            })
            .catch(err => {
                done(err);
            });
    });

    it("Should return Strava auth url on 'login'", done => {
        action.__set__("strava", {
            oauth: {
                getRequestAccessURL: function () {
                    return "mockurl";
                }
            }
        });

        action.__set__("reply", function (say) {
            should.exist(say);
            should.equal(say, "Visit following url for complete registration: mockurl");
        });

        var user = {
            user: 321,
            channel: "mockchannel"
        };

        action.__get__("login")({}, user)
            .then(user => {
                should.exists(user);
                should.exists(user._id);
                done();
            })
            .catch(err => {
                done(err);
            });
    });

    it("Should return Strava auth url on 'login' for uncomplete profile", done => {
        action.__set__("strava", {
            oauth: {
                getRequestAccessURL: function () {
                    return "mockurl";
                }
            }
        });

        action.__set__("reply", function (say) {
            should.exist(say);
            should.equal(say, "Visit following url for complete registration: mockurl");
        });

        var user = {
            user: 789,
            channel: "mockchannel"
        };

        action.__get__("login")({}, user)
            .then(user => {
                should.exists(user);
                should.exists(user._id);
                done();
            })
            .catch(err => {
                done(err);
            });

    });

    it("Should throw exception on 'report' if user is not registered", done => {
        action.__set__("reply", function (say) {
            should.exist(say);
        });

        action.__get__("report")({}, {user: 999})
            .then(() => {
                done(new Error("Should not be here"));
            })
            .catch(err => {
                should.exist(err);
                should.equal(err.message, "User not registered");
                done();
            })
            .catch(err => {
                done(err);
            });
    });

    it("Should produce report from slack message", done => {
        action.__set__("reply", function (say) {
            should.exist(say);
        });

        action.__get__("report")({}, {user: 123})
            .then(message => {
                should.exists(message);
                should.equal(message, "Since your last report you have run 20 km and earned 4.04 €");
                done();
            })
            .catch(err => {
                done(err);
            });
    });

    it("Should produce report by user", done => {

        User.findBySlackId("456")
            .then(user => {
                return action.__get__("reportByUser")(user);
            })
            .then(message => {
                should.exists(message);
                should.equal(message, "Since your last report you have run 0 km and earned 0.00 €");
                done();
            })
            .catch(err => {
                done(err);
            });
    });

    it("Should throw exception if user does not exists", done => {

        User.findBySlackId("999")
            .then(user => {
                return action.__get__("reportByUser")(user);
            })
            .then(() => {
                done(new Error("Should not be here"));
            })
            .catch(err => {
                should.exist(err);
                should.equal(err.message, "User is null");
                done();
            })
            .catch(err => {
                done(err);
            });
    });

});