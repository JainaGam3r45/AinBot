const aliases = {
    debug: "development",
    dev: "development",
    development: "development",
    normal: "production",
    prod: "production",
    production: "production",
};

const requestedMode = String(process.argv[2] || process.env.AINBOT_MODE || process.env.NODE_ENV || "production").toLowerCase();
const mode = aliases[requestedMode] || "production";

process.env.AINBOT_MODE = mode;
process.env.NODE_ENV = mode;

require("../index");
