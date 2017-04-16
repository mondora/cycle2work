import bunyan from "bunyan";
import R from "ramda";
import {LOG_DIR, LOG_LEVEL} from "./config";

const streams = [{
    path: `${LOG_DIR}/cycle2work.log`,
    type: "rotating-file",
    period: "1d",
    count: 7,
    level: LOG_LEVEL
}];

const log = bunyan.createLogger({
    name: "Cycle2Work",
    streams
});

function infoRaw (payload, msg, action, step, time) {
    log.info(getObj2(payload, action, step, time), msg);
}

function debug (payload, msg, action, step, time) {
    if (log.debug()) {
        log.debug(getObj(payload, action, step, time), msg);
    }
}

function trace (payload, msg, action, step, time) {
    if (log.trace()) {
        log.trace(getObj(payload, action, step, time), msg);
    }
}

function fatal (payload, msg, action, step, time) {
    if (log.fatal()) {
        log.fatal(getObj(payload, action, step, time), msg);
    }
}

function error (payload, msg, action, step, time) {
    if (log.error()) {
        log.error(getObj(payload, action, step, time), msg);
    }
}

function warn (payload, msg, action, step, time) {
    if (log.warn()) {
        log.warn(getObj(payload, action, step, time), msg);
    }
}

function info (payload, msg, action, step, time) {
    if (log.info()) {
        log.info(getObj(payload, action, step, time), msg);
    }
}

function getMilliseconds (hrtime) {
    var delta = getHRTime(hrtime);
    return (delta[0] * 1000) + Math.floor(delta[1] / 1000000);
}

function getHRTime (hrtime) {
    return R.isNil(hrtime) ? process.hrtime() : process.hrtime(hrtime);
}

function jsonize (payload) {
    if (R.is(Object, payload)) {
        return payload;
    } else {
        return {"value": payload};
    }
}

function getObj (payload, action, step, time) {
    var obj = {"payload": jsonize(payload), "action": action, "step": step};
    if (!R.isNil(time)) {
        obj.exec_time = getMilliseconds(time);
    }
    return obj;
}

function getObj2 (payload, action, step, time) {
    var obj = {"payload:": payload, "action": action, "step": step};
    if (!R.isNil(time)) {
        obj.exec_time = getMilliseconds(time);
    }
    return obj;
}

var botkit = {
    log: function (level, msg) {
        if (log[level]) {
            log[level].call(log, {}, msg);
        }
    }
};

export default {
    botkit,
    debug,
    trace,
    fatal,
    error,
    info,
    infoRaw,
    warn,
    getHRTime,
    jsonize
};