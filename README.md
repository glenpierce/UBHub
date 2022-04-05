# UB Hub

This is the main webapp for UB Hub. We are a group of volunteers working to improve urband biodiversity measurement by municipalities, academics, and citizen scientists. Our team consists of enthusiastic volunteers from 16 different countries.

To run this project, you will need to add a config.js file in the root directory of the project. Its contents should read:

var config = {};

config.rdsHost = process.env.RDS_HOST || '127.0.0.1'; (the port forwarding of the docker command should go to your local host)

config.rdsUser = process.env.RDS_USER || 'root';

config.rdsPassword =  process.env.RDS_PASSWORD || 'my-secret-pw';

config.rdsDatabase = process.env.RDS_DATABASE || 'ubhub';

config.secret = 'In our dev environments, this doesn't really need to be a secret';

config.reCAPTCHASecret = ''; //you don't need this right now reCAPTCHA doesn't seem to be working.

module.exports = config;

You will also need to install and run Docker (here: https://docs.docker.com/get-docker/ ) and run the following command in Docker:

docker run --name ubhub -e MYSQL_ROOT_PASSWORD=my-secret-pw -p 3306:3306 mysql

Note: if you are running an M1 Mac the Docker install can be found here: https://docs.docker.com/docker-for-mac/apple-silicon/ , the command would be: docker run --platform linux/x86_64 --name ubhub -e MYSQL_ROOT_PASSWORD=my-secret-pw -p 3306:3306 mysql 

This container should be running when you are running the project.<br>
<br>
A common problem we are seeing on setup of the DB is that the latest versions of MySQL are complaining about authentication protocols. To solve this problem, enter this command into MySQL, probably via MySQL workbench or via the commandline.<br>
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'my-secret-pw';<br>
flush privileges;<br>
If that doesn't work, try it without @'localhost' part.<br>

To setup the initial database schema, from the project's working directory, enter the node REPL terminal by typing node
then, in the REPL type: <br>
var scripts = require('./scripts'); <br>
press enter <br>
then type: scripts.update(false); <br>
press enter <br>
You should see a lot of logs indicating success on several different database queries. <br>
To exit the REPL, press ctl + c <br>

To start the Node.js server, run: <br>
node bin/www from the command line ( or node bin\www for Mac/Linux systems )<br>
<br>
From there, you can visit localhost:3000 and should see the home page of the website.
The Map requires some additional data in the database and visiting it without that will cause the node server to stop.
<br>
<br>If you're having trouble with the container, to login to it: <br>
docker exec -it ubhub bash<br>
<br>
<b>Restarting now that you are all setup:</b><br>
Now that you've got this all setup, you might someday want to shutdown your computer. Afterwards, you're going to want to restart UbHub when you want to continue development work, here's how:<br>
To run the app:<br>
1. Start Docker (this might be the desktop application)<br>
   Start the mysql container in Docker
   give command docker start ubhub
2. start the Node.js server, run:<br>
node bin/www from the command line ( or node bin/www for Mac/Linux systems )<br>
<br>
