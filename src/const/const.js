const crypto = require("crypto");
const accessTokenSecret = crypto.randomBytes(64).toString("hex");
const refreshTokenSecret = crypto.randomBytes(64).toString("hex");

module.exports = {
  accessTokenSecret,
  refreshTokenSecret,
};
