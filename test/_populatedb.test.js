import helper from "./db.test";

describe("Populate DB", () => {

    before(done => {
        helper.createDB(() => {
            helper.popluateDB();
            done();
        });
    });

    it("Should populate db", done => {
        done();
    });

});