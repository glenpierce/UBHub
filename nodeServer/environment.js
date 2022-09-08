let environment = {};

environment.rdsHost = process.env.RDS_HOST;
environment.rdsUser = process.env.RDS_USER;
environment.rdsPassword = process.env.RDS_PASSWORD;
environment.rdsDatabase = process.env.RDS_DATABASE;
environment.secret = process.env.SECRET;
environment.reCAPTCHASecret = process.env.reCAPTCHASecret;
environment.salt = process.env.SALT;

environment.expires = 4000;

module.exports = environment;