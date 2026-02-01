# Running tests in Docker (Vitest)

This project runs its test suite inside Docker so you don't need to run `npm` on the host.

Prerequisites
- Docker Desktop (or Docker Engine) installed and running on macOS.
- A working internet connection for the first run (to pull node image and install packages).

Commands (zsh)

Build the test image (this will install dependencies inside the image):

```bash
# build the test image using the dedicated compose file
docker compose -f docker-compose.test.yml build node-server-test
```

Run the tests (runs `npm ci` then `npm test` inside the container):

```bash
docker compose -f docker-compose.test.yml run --rm node-server-test
```

Alternative CI-friendly command (build and run, then exit when complete):

```bash
# starts container, runs tests and stops
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit node-server-test
```

Notes
- All `npm` commands run inside the container. The `entrypoint` is configured to run `npm ci && npm test` so your host `npm` is not used.
- The first run may be slow as devDependencies (including `vitest`) get installed inside the image.
- If you don't have a `package-lock.json`, the Dockerfile will run `npm install` instead of `npm ci`.

Troubleshooting
- "Cannot connect to the Docker daemon": Start Docker Desktop on macOS and try again.
- If tests fail with native build errors when installing dependencies, the test image may need extra system packages (e.g., build tools). Edit `nodeServer/Dockerfile` and add packages to `apt-get install` or build with the build-arg `INSTALL_BUILD_TOOLS=1`.
- If you'd like to speed up subsequent builds, generate a `package-lock.json` (run `npm install` inside the container, commit the lockfile) so `npm ci` can be used.

Expected output
- Vitest prints test results to stdout from the container. A non-zero exit code means failing tests.

Files added/modified for testing
- Modified: `nodeServer/package.json` (added `test` script and `vitest` devDependency)
- Added: `nodeServer/vitest.config.ts`
- Added: `nodeServer/test/example.test.ts`
- Added: `nodeServer/Dockerfile`
- Added: `nodeServer/.dockerignore`
- Added: `docker-compose.test.yml`

If you want, I can also:
- Add a GitHub Actions job that builds and runs the same test container in CI.
- Add more example tests wired to actual application modules.
