# UB Hub

UB Hub is a web application that helps municipalities, academics, and citizen scientists collect and analyse measurements of urban biodiversity. The project is built and maintained by a global group of volunteers and is intended to be easy to run locally (via Docker) and simple to deploy for testing and development.

This README gives a concise overview of the project, describes the system architecture at a high level, and points to the per-platform setup and testing guides in this repository.

Project goals

- Provide a lightweight platform for recording and visualising urban biodiversity data.
- Make it straightforward for cities and researchers to run the app locally or inside containers.
- Keep the code modular and testable so contributors can add features with confidence.

System architecture (high level)

- nodeServer/ — The main server application. A Node.js + Express app that implements the web UI and API endpoints (routes are under `nodeServer/routes/`). Views are server-rendered with Pug templates in `nodeServer/views/` and public assets are under `nodeServer/public/`.
- MySQL database — Persistent storage for users, submissions and application data. The repository includes `databaseTools.sql` with the schema and seed statements to initialise the database, and `databaseMigrations.sql` to upgrade an existing database.
- Docker — The repository contains compose files to run the app in containers for local development (`docker-compose.local.yml`) and for running tests (`docker-compose.test.yml`). The local compose file expects database connection details via env file and uses `host.docker.internal` on macOS to reach the host DB when required.
- Tests — Unit and integration tests run inside a Docker test image; test files are located under `nodeServer/test/` and test configuration is in `nodeServer/vitest.config.js`.
- Tools and utilities — Helper scripts and tooling live in `nodeServer/tools/` (database helpers, session decoding utilities, etc.).

If you prefer a simple mental model: the server (nodeServer) is the application hexagon (business logic + routing + views) and the database and Docker compose are external adapters used for persistence and local runtime.

Quick start (concise)

1) Add the configuration file

Create `nodeServer/config.js` (this repository intentionally excludes a committed config with secrets). An example config follows — copy this file into `nodeServer/config.js` and update values as appropriate for your environment:

```bash
// nodeServer/config.js
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

2) Initialise the database

Open `databaseTools.sql` in your SQL client and run the script to create the schema and seed any required initial data.

To upgrade an existing database (for example production) after a schema change, run the sections of `databaseMigrations.sql` it hasn't had yet. Each section is labeled, and the newest is at the bottom.

3) Run with Docker (recommended for local development)

For more details about Docker and macOS-specific recommendations see the local development guide: [README.LOCAL.md](README.LOCAL.md).

A minimal command to start the app with the repository's local compose file is:

# build and start (detached)
```bash
docker compose -f docker-compose.local.yml up -d --build
```

# stop and remove containers
```bash
docker compose -f docker-compose.local.yml down
```

After the containers are up you can access the app at:

http://localhost:3000

Testing

This project runs tests inside Docker so your host environment doesn't need a local Node install. Full testing instructions are in `nodeServer/TESTING.md`. In brief, from the repository root you can run the test image and execute the test suite using the provided compose file:

```bash
# build the test image (first-time or after changes)
docker compose -f docker-compose.test.yml build node-server-test

# run the tests inside the container
docker compose -f docker-compose.test.yml run --rm node-server-test
```

Deploying to AWS Elastic Beanstalk

Production runs on Elastic Beanstalk's **Node.js 24 on Amazon Linux 2023** platform (Node 24.21.0, npm 11.19.0, the same versions as the Docker image). A deploy is a zip of `nodeServer/` (a "source bundle"). Elastic Beanstalk runs `npm install` and then `npm start` on it. The scripts in `deploy/` build and deploy that bundle. Only the deploy step talks to AWS, and a person must run it.

One-time setup

1. Install the [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) and sign in (`aws configure` or `aws sso login`). Your IAM user or role needs Elastic Beanstalk deploy permissions; the AWS managed policy `AdministratorAccess-AWSElasticBeanstalk` covers them.
2. Copy `deploy/deploy.env.example` to `deploy/deploy.env` (gitignored) and fill in `EB_APPLICATION_NAME`, `EB_ENVIRONMENT_NAME`, and `AWS_REGION` (for example `ca-central-1`). Optionally set `AWS_PROFILE`.
3. Make sure your local `nodeServer/config.js` and `nodeServer/routes/preApprovedUser.json` hold the **production** values. They are copied into the bundle.

Deploy

Run these steps in order from the repository root. In IntelliJ IDEA, click the green ▶ next to each code block to run it in the terminal. Each step is its own block, so you can check its output before running the next.

Step 1: build the bundle. This runs the tests in Docker, then writes `nodeServer/.appArchives/app-<N>.zip` from committed code.

```bash
deploy/build-bundle.sh
```

Step 2: preview. This prints every AWS command the deploy would run, without calling AWS.

```bash
deploy/deploy-to-elastic-beanstalk.sh --dry-run --latest
```

Step 3: deploy. This shows the target AWS account, environment, and platform, and asks you to type the environment name to confirm. It then uploads, deploys, waits, and reports health.

```bash
deploy/deploy-to-elastic-beanstalk.sh --latest
```

Notes

- `build-bundle.sh` refuses to build if `nodeServer/` has uncommitted changes (`--allow-dirty` overrides this) and runs the tests first (`--skip-tests` skips them). New files must at least be `git add`ed to be included.
- You can deploy a specific bundle instead of the latest: `deploy/deploy-to-elastic-beanstalk.sh nodeServer/.appArchives/app-433.zip`.
- The deploy script ends by printing the command to roll back to the previously deployed version. It exits with an error if the environment doesn't end up healthy (Green).
- Bundles contain production secrets (`config.js`). They are gitignored; never commit or share them.

Development notes and pointers

- Look in `nodeServer/routes/` to see the server routes and `nodeServer/views/` for the Pug templates rendered by the application.
- Static assets (CSS, JS, images) are under `nodeServer/public/`.
- Helper tools and database scripts are in `nodeServer/tools/`.
- If you need macOS-specific Docker hints or troubleshooting steps, follow the local Docker guide: [README.LOCAL.md](README.LOCAL.md).
- For testing and CI-related details, see: `nodeServer/TESTING.md`.

Contributing

We welcome contributions. Please open issues or pull requests that include a clear description of the change, rationale, and any steps needed to validate behavior.

License

This repository uses the licensing specified in the project root (check the repository `LICENSE` file if present). If you are unsure, ask the maintainers before redistributing code or binaries.
