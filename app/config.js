var assert = require("assert");

function getEnv (variableName, required) {
    if (required && process.env.NODE_ENV !== "test") {
        assert(process.env[variableName], `Envrironment variable ${variableName} must be defined`);
    }
    return process.env[variableName];
}

export const LOG_DIR = getEnv("LOG_DIR") || "log/";
export const LOG_LEVEL = getEnv("LOG_LEVEL") || "info";
export const STRAVA_CLIENT_ID = getEnv("STRAVA_CLIENT_ID", true);
export const STRAVA_ACCESS_TOKEN = getEnv("STRAVA_ACCESS_TOKEN", true);
export const STRAVA_CLIENT_SECRET = getEnv("STRAVA_CLIENT_SECRET", true);
export const STRAVA_REDIRECT_URI = getEnv("STRAVA_REDIRECT_URI", true);
export const SLACK_TOKEN = getEnv("SLACK_TOKEN", true);
export const DB_URL = getEnv("DB_URL", true);
export const TOKEN_EXPIRE_MINUTES = getEnv("TOKEN_EXPIRE_MINUTES") || 5;