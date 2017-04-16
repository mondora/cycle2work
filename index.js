var fs = require("fs");
var execSync = require("child_process").execSync;

try {
    execSync("npm run build");
    require("./build/bin/www");
} catch (e) {
    var error = [
        "[" + new Date().toISOString() + "] Message:",
        e.message,
        "[" + new Date().toISOString() + "] Stack:",
        e.stack
    ].join("\n");
    console.log(error);
    fs.writeFileSync("errors.log", error);
}