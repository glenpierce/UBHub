# UB Hub

This is the main webapp for UB Hub. We are a group of volunteers working to improve urban biodiversity measurement by municipalities, academics, and citizen scientists. Our team consists of enthusiastic volunteers from 16 different countries.

To run this project, you will need to add a config.js file in the nodeServer directory of the project. Its contents should read:
```bash
const config = {
  secret: "secret",
  rdsHost: "127.0.0.1",
  rdsUser: process.env.RDS_USER || "root",
  rdsPassword: process.env.RDS_PASSWORD || "my-secret-pw",
  rdsDatabase: process.env.RDS_DATABASE || "ubhub",
  reCAPTCHASecret: "reCAPTCHASecret",
  expires: 24 * 60 * 60 * 1000,
}

export default { config };

```

You will also need to install and run Docker (here: https://docs.docker.com/get-docker/ ) and run the following command in Docker:

Run the docker-compose command with both the default and local override files:

```bash
docker-compose -f docker-compose.local.yml up
```

How to stop the Docker containers:

```bash
docker-compose -f docker-compose.local.yml down
```

Open databaseTools.sql in your SQL environment and run the script to set up the database.

You can then access the webapp at http://localhost:3000