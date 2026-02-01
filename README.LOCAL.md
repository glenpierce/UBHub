Local Docker setup — Run UBHub inside a container and use host MySQL

Purpose

This document explains how to run the UBHub Node app inside Docker on macOS while connecting to a MySQL instance running on the mac host (localhost:3306). The container isolates npm installs and runtime from the host.

High-level checklist

- Ensure Docker Desktop is installed and running on macOS.
- Provide database credentials in `.env.local.example` (or create `.env.local` and update the compose file to reference it).
- Build and run the container with docker compose.
- Verify the app at http://localhost:3000 and confirm DB connectivity.

Prerequisites

- macOS with Docker Desktop (latest recommended).
- A MySQL server running on the mac host and listening on TCP port 3306.
- The repository root contains `docker-compose.local.yml` and `nodeServer/`.

Files of interest

- `docker-compose.local.yml` — compose file used for local development. By default this repository references `.env.local.example` as the env file for the Node service.
- `.env.local.example` — placeholder environment variables. Fill this with your real DB credentials locally. Do not commit real credentials.

Quick start (recommended)

1) Edit DB credentials

Open and edit `.env.local.example` in the repo root and set the correct values for your host MySQL instance (RDS_USER / RDS_PASSWORD / RDS_HOST / RDS_PORT / RDS_DATABASE). The compose file in this repo currently uses `.env.local.example` as the env_file; you may also copy it to `.env.local` and then edit the copy.

Tip: prefer creating `.env.local` (not committed) and then either edit `docker-compose.local.yml` to point `env_file: .env.local` or keep editing `.env.local.example` (fastest) and don't commit it.

2) Build and start the container

From the repository root (/path/to/UBHub):

```bash
# Build the node image and run the service in detached mode
docker compose -f docker-compose.local.yml up -d --build
```

3) Verify the web app

Open your browser to:

```
http://localhost:3000
```

Or use curl to check headers/status:

```bash
curl -I http://localhost:3000
```

4) Run tests inside the container

```bash
# Run the tests inside the running container
docker compose -f docker-compose.local.yml exec node npm test
```

5) Run an on-demand DB connectivity test from inside the container

This command runs a tiny Node snippet inside the container and reports whether it can connect to the MySQL server using the env variables in the container:

```bash
docker compose -f docker-compose.local.yml exec node \
  node -e "const mysql=require('mysql2/promise');(async ()=>{try{const c=await mysql.createConnection({host:process.env.RDS_HOST,port:process.env.RDS_PORT,user:process.env.RDS_USER,password:process.env.RDS_PASSWORD,database:process.env.RDS_DATABASE});await c.query('SELECT 1');console.log('DB OK');await c.end()}catch(e){console.error('DB ERR',e.code||e.message);console.error(e);process.exit(1)}})()"
```

If the test prints "DB OK" then the container can access MySQL on the host using the configured credentials.

Grant SQL (run on host MySQL)

If you get ER_ACCESS_DENIED_ERROR, create a dedicated user and grant access from any host (or the container IP). Run the following on your mac host (adjust the password and DB name):

```sql
CREATE DATABASE IF NOT EXISTS ubhub;
CREATE USER IF NOT EXISTS 'ubhub'@'%' IDENTIFIED BY 'securepassword';
GRANT ALL PRIVILEGES ON ubhub.* TO 'ubhub'@'%';
FLUSH PRIVILEGES;
```

Or, to grant only from the specific container source IP you saw in the error logs (replace 172.31.27.215 with that IP):

```sql
CREATE USER IF NOT EXISTS 'ubhub'@'172.31.27.215' IDENTIFIED BY 'securepassword';
GRANT ALL PRIVILEGES ON ubhub.* TO 'ubhub'@'172.31.27.215';
FLUSH PRIVILEGES;
```

Notes and troubleshooting

- host.docker.internal (macOS): the compose file uses `host.docker.internal` for `RDS_HOST`. This resolves to the mac host from inside Docker Desktop on macOS; do not use `localhost` inside the container (it resolves to the container itself).

- ER_ACCESS_DENIED_ERROR: usually username/password mismatch or wrong host permission for the user in MySQL. Confirm the user exists for host `%` or the specific client IP and that the password matches the `.env.local.example` values.

- MySQL bind-address: ensure MySQL listens on a TCP socket (127.0.0.1 or 0.0.0.0) rather than only a UNIX socket. If it only listens on a socket, the container cannot connect via host.docker.internal.

- Port conflicts: if port 3000 is already used on your mac host, change the mapping in `docker-compose.local.yml` (e.g. `"3001:3000"`) or stop the process currently using port 3000.

- node_modules volume: the compose file mounts `nodeServer/` and uses a named volume for `node_modules`, so `npm ci` and module installs happen inside the container and do not modify the host. This keeps the host free of the installed dependencies for better isolation.

- Engine warnings: the project `package.json` requests Node 22.x but the container is built on Node 18 in the provided Dockerfile.test. This results in an npm EBADENGINE warning but is not fatal. If you need exact engine parity, update the Dockerfile base image.

Useful commands

```bash
# Show container logs
docker compose -f docker-compose.local.yml logs -f --tail=200 node

# Run a shell inside the running container
docker compose -f docker-compose.local.yml exec node sh

# Stop and remove containers, networks and volumes for this compose
docker compose -f docker-compose.local.yml down --remove-orphans

# Rebuild and restart container
docker compose -f docker-compose.local.yml up -d --build
```

Security

- Do not commit `.env.local.example` after filling in credentials. Keep your DB credentials out of source control. Use a secrets manager for production.
