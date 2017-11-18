# CBICoalition

This is the main webapp for UB Hub (Formerly CBI Coalition). We are a group of volunteers working to improve urband biodiversity measurement by municipalities, academics, and citizen scientists. Our team consists of enthusiastic volunteers from 16 different countries.

To run this project, you will need to add a config.js file in the root directory of the project. Its contents should read:

var config = {};

config.rdsHost = process.env.RDS_HOST || '[the ip address of your docker container]';

config.rdsUser = process.env.RDS_USER || 'root';

config.rdsPassword =  process.env.RDS_PASSWORD || 'my-secret-pw';

config.rdsDatabase = process.env.RDS_DATABASE || 'ubhub';

config.secret = 'In our dev environments, this doesn't really need to be a secret';

config.reCAPTCHASecret = ''; //you don't need this right now reCAPTCHA doesn't seem to be working.

module.exports = config;

You will also need to install and run Docker and run the following command in Docker:

docker run --name ubhub -e MYSQL_ROOT_PASSWORD=my-secret-pw -p 3306:3306 mysql

This container should be running when you are running the project.

To setup the initial database schema, go to http://localhost:3000/databaseUpdate/update and the MySQL commands to setup the database will run.
