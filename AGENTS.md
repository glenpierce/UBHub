# AGENTS.md

Guidance for AI coding agents (and humans) working in the UBHub repository.

UBHub is a web application for recording, mapping, and curating urban-biodiversity
data (institutions/locations, programs, documents, participation) and for managing
the people involved (users, contacts, mailing-list subscribers).

## Hard rule: Docker only — never run `npm`, `npx`, or `node` on the host

Everything runs inside Docker. Do **not** run `npm install`, `npm ci`, `npm test`,
`npx …`, or `node …` on the host machine, not even for a quick test or a one-off
script. `nodeServer/node_modules` lives in a named Docker volume; the host directory
is only a mount point and must stay empty.

```bash
# Run the test suite (brings up an ephemeral MySQL; exits with the test result)
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit node-server-test

# Start the app for local development (http://localhost:3000, nodemon reloads on edit)
docker compose -f docker-compose.local.yml up -d --build

# Run commands against the running dev container
docker compose -f docker-compose.local.yml exec node npm test
docker compose -f docker-compose.local.yml exec node sh
docker compose -f docker-compose.local.yml logs -f --tail=200 node
```

If Docker is not available, stop and say so. Do not fall back to host Node.

Runtime: Node 24.21.0 with npm 11.19.0 (`node:24.21.0-bookworm-slim`, see
`nodeServer/Dockerfile`). This matches the production Elastic Beanstalk platform,
Node.js 24 on Amazon Linux 2023. When AWS ships a new platform version, update the
image tag and `engines` in `package.json` together. Dependencies
are pinned to exact versions in `nodeServer/package.json`; never add wildcard or range
versions. CI (`.github/workflows/docker-tests.yml`) runs the same
`docker-compose.test.yml` stack on every pull request and on pushes to `develop`.
Because `config.js` is gitignored, CI writes a stub with dummy values. When code
reads a new config key, add a dummy value for it to that stub. Never copy real
values from `config.js` into the workflow or anywhere else in the repository.

## Repository layout

```
databaseTools.sql            MySQL schema, stored procedures, migrations (source of truth for tables)
docker-compose.local.yml     dev stack: node (nodemon) + mysql-local; env from .env.local
docker-compose.test.yml      test stack: node-server-test + mysql-test
deploy/                      Elastic Beanstalk bundle + deploy scripts (run by humans)
plans/                       design/implementation plans for in-flight features
tools/                       DB setup / session-decoding helper scripts (also run in Docker)
nodeServer/
  app.js                     Express app: middleware, sessions, route mounting
  bin/www                    HTTP server entry point
  config.js                  NOT committed (gitignored): secrets and environment config
  ConnectionPool.js          mysql2/promise pool + makeDbCallAsPromise + withTransaction
  middleware/                authMiddleware.js: isAuthenticated / isContributor / isApprover / isExec
  routes/                    thin HTTP adapters (one Express router per area)
  services/                  business logic, SQL builders, external integrations
  utils/validationUtils.js   pure input validation (email, integers, region codes, …)
  views/                     server-rendered Pug templates
  public/                    static assets; public/javascripts/data-management/ is the admin SPA-ish client
  test/                      Vitest unit tests (jsdom environment)
```

## Architecture

The project follows a hexagonal (ports and adapters) style. Read
`.github/copilot-instructions.md` for the full design principles and naming rules.

- **Routes (`nodeServer/routes/`)** are thin orchestration layers: parse the request,
  validate it, check authorization (middleware), call a service, and format the
  response. Keep SQL and business rules out of them.
- **Services (`nodeServer/services/`)** hold the domain logic. They receive their
  database dependency as an argument (a mysql2 `pool`/connection, or a query
  function such as `makeDbCallAsPromise`) so they can be unit tested with mocks.
  Validation failures throw `Error`s with a typed `code` (`INVALID_TABLE`,
  `INVALID_INST_ID`, `INVALID_FILTER_FIELD`, `INVALID_EMAIL_REQUEST`,
  `INVALID_SIGNUP`, …), which routes map to 4xx responses.
- **`services/tableMetadata.js`** is the single source of truth for which tables and
  columns the data-management UI can see and edit, and for the email-list filter
  fields. Do not define table structures inline in routes.
- **Database**: MySQL 8. All SQL is parameterized (`?` placeholders). Identifiers
  that come from requests (table and column names) are checked against
  `tableMetadata.js` allowlists before they are used.
- **Views**: Pug templates rendered on the server. Pages include `mixins.pug` (for
  example `+dataManagementHeader`). The data-management page loads the ES-module
  client in `public/javascripts/data-management/` (`TableManager`, `TableView`,
  `ModalManager`, `Typeahead`), and its initial data comes from
  `window.dataManagementConfigFromServer`.

### Routes mounted in `app.js`

| Mount             | Purpose                                                                 |
|-------------------|-------------------------------------------------------------------------|
| `/`               | redirects to the public marketing site                                  |
| `/login`, `/users`| login page; `POST /users` authenticates and sets the session            |
| `/createUser`     | create a password-holding **User** (privileges 1)                       |
| `/signup`         | public mailing-list signup that creates a **Contact** (privileges 0)    |
| `/account`        | current user's profile, profile update, password reset, logout          |
| `/map`            | map of locations and programs, plus its data endpoints                  |
| `/dataManagement` | admin UI: table data, pending changes, contacts, email lists and sends  |
| `/uploads`        | S3 uploads (direct, presigned, multipart)                               |

### Users, privileges, and sessions

All people live in the single `users` table (primary key `email`). `privileges`:

| Level | Role        | Notes                                                       |
|-------|-------------|-------------------------------------------------------------|
| 0     | Contact     | no `hashedPassword`; cannot log in (staff-created or `/signup`) |
| 1     | User        | authenticated, read-only                                    |
| 2     | Contributor | can propose changes                                         |
| 3     | Approver    | can approve changes, manage contacts, request bulk emails   |
| 4     | Executive   | can approve bulk email sends                                |

Sessions use `client-sessions` (an encrypted cookie named `session`) and carry
`user` (alias), `email`, and `privileges`. Enforce access with the middleware in
`middleware/authMiddleware.js`, never with ad-hoc checks. Passwords are hashed with
bcrypt (`services/passwordUtils.js`).

### Approval workflows

- **Data changes**: Contributors never write directly to curated tables.
  `POST /dataManagement/pending-change` inserts a `row_versions` row
  (`pendingChangeService.js`). An Approver reviews it with `/pending-change/review`
  (`approvalService.js`), which applies the change transactionally. The exception is
  contacts/users: `/dataManagement/contact` writes to `users` directly.
- **Bulk email**: an Approver filters users (`userFilterQueryBuilder.js` builds the
  WHERE clause from the field definitions in `tableMetadata.js`) and creates an
  `email_send_requests` row. The recipient list is snapshotted at request time and
  only a count is returned to the requester (`emailSendRequestService.js`). An
  Executive approves it, and then `brevoService.js` sends **one Brevo API call per
  recipient** so recipients never see each other's addresses. The send runs in the
  background after the HTTP response, and the result is recorded with
  `markEmailSendRequestSent`.

### Email

- `services/mailer.js`: nodemailer over SMTP (Gmail app password) for admin
  notifications: a new user was created, or someone signed up for the mailing list.
  See `nodeServer/README_MAILER.md`.
- `services/brevoService.js`: the Brevo transactional API, used for approved bulk
  sends.

Fire-and-forget sends must catch their own errors. In Node 24 an unhandled promise
rejection crashes the process.

### External integrations and config

`nodeServer/config.js` is gitignored and must never be committed. Server code reads
these keys from it:

- Database: `rdsHost`, `rdsUser`, `rdsPassword`, `rdsDatabase`
- Sessions and passwords: `secret`, `expires`, `salt`
- SMTP mail: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`,
  `EMAIL_FROM`, `ADMIN_EMAIL`
- Brevo: `BREVO_API_KEY`
- S3 uploads: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_*`

Also never commit `.env`, `.env.local`, or `routes/preApprovedUser.json`.

## Security

This is a **public repository**: anything committed, and every GitHub Actions log, is
world-readable.

- **Secrets never enter git, the workflow, or a Docker image.** `config.js` and
  `routes/preApprovedUser.json` are listed in both `.gitignore` and
  `nodeServer/.dockerignore`. Containers get them at runtime through the
  `./nodeServer` bind mount in the compose files. Never copy real values from
  `config.js` into code, tests, docs, or CI. CI uses a stub with dummy values only.
- **GitHub Actions**:
  - Organization policy allows only actions owned by UrbanBiodiversityHub, so the
    workflow uses no third-party actions (`actions/checkout`, `actions/setup-node`,
    and so on). The workflow checks out with plain `git`.
  - Trigger on `pull_request`, never `pull_request_target`. The latter runs fork
    code with a write-capable token and access to secrets.
  - Keep `permissions: contents: read` unless a job needs more.
  - GitHub only masks the raw `GITHUB_TOKEN`. Register any value derived from a
    secret (for example the base64 `x-access-token:` header used for checkout) with
    `echo "::add-mask::<value>"` before using it. Never add `set -x` or echo
    statements to steps that handle tokens.
  - Pass credentials to a single command (`git -c http.extraheader=...`), not as
    persisted git config, so later steps (which run PR-controlled code) can't read
    them.
- **Application**:
  - Use parameterized SQL only.
  - Check request-supplied identifiers against the `tableMetadata.js` allowlists.
  - Enforce access with `authMiddleware.js`.
  - Public forms must not reveal whether an account exists.
  - Never return bulk-email recipient lists to requesters.

## Deployment (AWS Elastic Beanstalk)

**Agents must never run the `aws` (or `eb`) CLI.** Agents may write and edit the
deploy scripts and test them with `--dry-run` or without AWS, but a human runs the
real deploy.

Production runs on the Elastic Beanstalk Node.js platform, which runs `npm install`
and then `npm start` (`node ./bin/www`, listening on `PORT`). A deploy is a source
bundle zip with the contents of `nodeServer/` at the zip root.

```bash
deploy/build-bundle.sh                    # Docker tests + nodeServer/.appArchives/app-<N>.zip
deploy/deploy-to-elastic-beanstalk.sh --dry-run --latest    # or pass a specific app-<N>.zip path
deploy/deploy-to-elastic-beanstalk.sh --latest              # human only
```

Human-facing instructions are in `README.md` under "Deploying to AWS Elastic
Beanstalk". Each step there is its own fenced `bash` block, so it can be run from
IntelliJ's Markdown gutter one step at a time. Keep it that way: never put the
deploy command in the same block as another step.

- `build-bundle.sh` refuses to build if `nodeServer/` has uncommitted tracked
  changes (`--allow-dirty` overrides this). It runs the Docker tests first
  (`--skip-tests` overrides this). It bundles the git-tracked files minus
  tests/dev files, plus the gitignored runtime secrets `config.js` and
  `routes/preApprovedUser.json`. It numbers bundles after the existing
  `app-<N>.zip` files and records the source commit in the zip comment.
- `deploy-to-elastic-beanstalk.sh` reads `deploy/deploy.env` (gitignored; see
  `deploy.env.example`). It confirms the AWS account and environment, warns if
  the environment isn't on the Node.js 24 platform, and asks you to type the
  environment name. It then:
  1. uploads the bundle to S3
  2. runs `create-application-version --process`
  3. runs `update-environment`
  4. waits for the update
  5. reports health and prints the rollback command
- Bundles contain production secrets: they are gitignored and must never be
  shared or committed.

## Conventions

- **Naming**: no abbreviations or single-letter names (including loop variables);
  use fully spelled-out, descriptive names, camelCase for functions and variables,
  and PascalCase for classes.
- **Tests first** for new service logic. Put pure logic in services or utils with
  injected dependencies and test it in `nodeServer/test/<module>.test.js` (Vitest).
  Pug views can be tested by rendering them with `pug.renderFile`.
- **Schema changes** go in `databaseTools.sql`. Update the `CREATE TABLE` and add an
  `ALTER TABLE` in the migrations section for existing databases.
- **Public forms** must not reveal whether an email already exists. Return the same
  response either way, as `/signup` does.
- Keep feature plans in `plans/` when a change spans several layers.
