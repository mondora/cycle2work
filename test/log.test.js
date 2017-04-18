import rewire from "rewire";

var logger = rewire("../app/log");

describe("Log", () => {

    it("Should produce valid json", done => {
        var obj = logger.__get__("getObj")("a string as payload", "test", "step1");
        var expected = {
            payload: {value: "a string as payload"},
            action: "test",
            step: "step1"
        };
        expected.should.be.eql(obj);
        done();
    });

    it("Should produce valid json 2", done => {
        var obj = logger.__get__("getObj2")({a: "b"}, "test", "step1");
        var expected = {
            payload: {a: "b"},
            action: "test",
            step: "step1"
        };
        expected.should.be.eql(obj);
        done();
    });

    it("Should not fail on wrong log level", done => {
        var botkit = logger.__get__("botkit");
        try {
            botkit.log("not a log level", "test message");
            done();
        } catch (e) {
            done(e);
        }
    });

});