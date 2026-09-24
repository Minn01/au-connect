# Deploying AU Connect on life.au.edu

This is how to deploy the AU Connect system on the life.au.edu server. It runs
three app images (pulled from Docker Hub) + MongoDB as containers with Docker
Compose, all on one private network:

- `au-connect-app` — the main Next.js app · `127.0.0.1:3000` → `life.au.edu/connect`
- `au-connect-admin` — the admin app · `127.0.0.1:3001` → `life.au.edu/connect-admin`
- `au-connect-reco` — the recommendation API (FastAPI) · **internal only**, no host port
- `au-connect-mongo` — MongoDB 7 (single-node replica set) · **internal only**

Only the two app ports are exposed (through nginx). The recommendation API and
MongoDB are reachable only inside the private network. The reverse proxy (nginx)
and redeployment are handled by the AU team's own setup, so this repo doesn't
run its own.

One thing to keep in mind: the Mongo data lives in a Docker volume
(`ac-mongo-data`) on the server, and nothing backs it up for you. Set up a
regular `mongodump` so you don't lose the data if the server goes down.

## Prerequisites

- Docker and Docker Compose on the server
- `make`
- Access to the server and permission to edit its nginx config

## Steps

### 1. Clone the repo

```bash
git clone https://github.com/Tommyzizii/au-connect.git
cd au-connect
```

The main repository is cloned mainly because it contains the shared
`docker-compose.prod.yml`, environment templates, Prisma schema, and deployment
files. The three production applications themselves are pulled as prebuilt
Docker images.

### 2. Create the deployment env files

Each app gets its own env file (all gitignored — never commit real secrets):

```bash
cp .env.example .env                                # main app
cp .env.admin.example .env.admin                     # admin app
cp .env.recommendation.example .env.recommendation   # recommendation api
```

Also create `.compose.env`, which tells Docker Compose which three application
images to pull:

```dotenv
AU_CONNECT_IMAGE=<DOCKERHUB_USERNAME>/au-connect:<TAG>
ADMIN_IMAGE=<DOCKERHUB_USERNAME>/au-connect-admin:<TAG>
RECO_IMAGE=<DOCKERHUB_USERNAME>/au-connect-recommendation:<TAG>
```

The final image names/tags will be provided by the AU Connect team.

### 3. Fill in the values

Open each file and fill it in.

For the main app's `.env`, the key values are:

```dotenv
NODE_ENV=production

APP_PUBLIC_URL=https://life.au.edu/connect
DATABASE_URL=mongodb://mongo:27017/au-connect?directConnection=true

JWT_SECRET=
MESSAGE_ENCRYPTION_KEY=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

AZURE_STORAGE_ACCOUNT_NAME=
AZURE_STORAGE_ACCOUNT_KEY=
AZURE_STORAGE_CONNECTION_STRING=
AZURE_STORAGE_CONTAINER_NAME=

RECOMMENDATION_SERVICE_URL=http://recommendation:8000
RECOMMENDATION_SERVICE_API_KEY=

GMAIL_USER=
GMAIL_APP_PASSWORD=
```

`APP_PUBLIC_URL` is runtime configuration. It must include the `/connect`
suffix. In production it must also be an absolute **https** URL: the app
rejects http and every OAuth start route returns a 500.

`MESSAGE_ENCRYPTION_KEY` must be a stable secret. It can be generated with:

```bash
openssl rand -base64 32
```

The recommendation API key must be the same value used as `INTERNAL_API_KEY`
in `.env.recommendation`.

For `.env.admin`:

```dotenv
DATABASE_URL=mongodb://mongo:27017/au-connect?directConnection=true

ADMIN_PUBLIC_URL=https://life.au.edu/connect-admin
MAIN_APP_PATH=https://life.au.edu/connect

JWT_SECRET=

MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=

AZURE_STORAGE_ACCOUNT_NAME=
AZURE_STORAGE_ACCOUNT_KEY=
AZURE_STORAGE_CONNECTION_STRING=
AZURE_STORAGE_CONTAINER_NAME=
```

The main app and admin app use the **same Azure Blob Storage account and
container**, so the four `AZURE_STORAGE_*` values should match in `.env` and
`.env.admin`.

For `.env.recommendation`:

```dotenv
MONGODB_URL=mongodb://mongo:27017/?directConnection=true
# Must equal the database name in the main app's DATABASE_URL (au-connect).
# A mismatch (e.g. au_connect) connects fine but sees an empty database.
MONGODB_DB=au-connect

INTERNAL_API_KEY=

OMP_NUM_THREADS=2
MKL_NUM_THREADS=2
TOKENIZERS_PARALLELISM=false

HF_HOME=/opt/huggingface
HF_HUB_OFFLINE=1
```

The recommendation service does **not** need Azure Blob Storage access.

For the OAuth logins to work, register these redirect URIs with each provider:

```text
https://life.au.edu/connect/api/connect/v1/auth/google/callback
https://life.au.edu/connect/api/connect/v1/auth/linkedin/callback
https://life.au.edu/connect/api/connect/v1/auth/azure-ad/callback
```

The admin Microsoft callback is:

```text
https://life.au.edu/connect-admin/api/connect-admin/v1/auth/microsoft/callback
```

Until the redirect URIs are registered, the relevant OAuth login will fail.

### 4. First deployment: start MongoDB

For the first deployment, start MongoDB first:

```bash
docker compose \
  --env-file .compose.env \
  -f docker-compose.prod.yml \
  up -d mongo mongo-init
```

Check it:

```bash
docker compose \
  --env-file .compose.env \
  -f docker-compose.prod.yml \
  ps -a
```

Expected:

```text
au-connect-mongo         Up (healthy)
mongo-init               Exited (0)
```

The production database name is:

```text
au-connect
```

MongoDB runs with a WiredTiger cache cap (`--wiredTigerCacheSizeGB 0.5`, set
in `docker-compose.prod.yml`) because the default cache grabs roughly half of
(total RAM - 1 GB), which is too much on a VM shared with other services.

### 5. First deployment: initialize the fresh database

This deployment starts with a fresh MongoDB database.

Use the Prisma schema in this repo to initialize the empty database before the
applications begin using it.

Because MongoDB is internal to `au-network`, run Prisma from a one-off Node
container on that network:

```bash
docker volume create au-connect-deploy-node-modules

docker run --rm \
  --network au-network \
  -v "$PWD":/app \
  -v au-connect-deploy-node-modules:/app/node_modules \
  -w /app \
  -e DATABASE_URL='mongodb://mongo:27017/au-connect?directConnection=true' \
  node:22-bookworm \
  bash -lc '
    corepack enable &&
    pnpm install --frozen-lockfile &&
    pnpm prisma generate &&
    pnpm prisma db push
  '
```

`prisma db push` is intended here only for the initial empty database.

#### First admin account

The admin app only accepts Microsoft accounts that already exist in the
`Admin` collection.

The AU Connect team will provide the first administrator record as
`bootstrap/admin.json`.

Import it with:

```bash
docker cp bootstrap/admin.json au-connect-mongo:/tmp/admin.json

docker exec au-connect-mongo \
  mongoimport \
  --db au-connect \
  --collection Admin \
  --file /tmp/admin.json \
  --jsonArray \
  --mode=upsert \
  --upsertFields=email
```

After the first administrator can sign in, additional administrators can be
managed from the admin app.

Alternatively, the first administrator can be inserted directly. This is how
the initial SUPER_ADMIN was created on life.au.edu:

```bash
docker exec -it au-connect-mongo mongosh --quiet --eval 'db.getSiblingDB("au-connect").Admin.insertOne({
  email: "<admin-email>",
  name: "<admin-name>",
  role: "SUPER_ADMIN",
  status: "ACTIVE",
  activatedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
})'
```

`status` must be `ACTIVE`; the schema default `PENDING` does not pass the
login check.

#### Skill catalogue

The application also expects the `Skill` collection to contain the AU Connect
skill catalogue.

The AU Connect team will provide it as `bootstrap/skills.json`.

Import it with:

```bash
docker cp bootstrap/skills.json au-connect-mongo:/tmp/skills.json

docker exec au-connect-mongo \
  mongoimport \
  --db au-connect \
  --collection Skill \
  --file /tmp/skills.json \
  --jsonArray \
  --mode=upsert \
  --upsertFields=normalizedName
```

Verify the initial data:

```bash
docker exec au-connect-mongo \
  mongosh --quiet --eval '
    const d = db.getSiblingDB("au-connect");
    print("Admins:", d.Admin.countDocuments());
    print("Skills:", d.Skill.countDocuments());
  '
```

The skill catalogue contains both technologies/tools and normal professional
skills.

### 6. Start the full stack

```bash
make prod-up
```

This pulls the three application images from Docker Hub and starts them with
MongoDB.

The main app listens on `127.0.0.1:3000` and the admin app on
`127.0.0.1:3001` — neither is exposed to the internet directly; the AU team's
nginx sits in front.

The recommendation API and MongoDB have no host port at all.

If needed, the equivalent Compose commands are:

```bash
docker compose \
  --env-file .compose.env \
  -f docker-compose.prod.yml \
  pull

docker compose \
  --env-file .compose.env \
  -f docker-compose.prod.yml \
  up -d
```

### 7. Set up nginx

The AU team adds two routes to their existing nginx:

```text
life.au.edu/connect        ->  127.0.0.1:3000   (main app)
life.au.edu/connect-admin  ->  127.0.0.1:3001   (admin app)
```

The path must be preserved when proxying.

Example:

```nginx
location = /connect {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /connect/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location = /connect-admin {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /connect-admin/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Then reload nginx:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 8. Verify the deployment

Check containers:

```bash
docker compose \
  --env-file .compose.env \
  -f docker-compose.prod.yml \
  ps -a
```

Test the main app:

```bash
curl -I https://life.au.edu/connect
```

A redirect to the authentication page is normal when logged out.

Test the admin app:

```bash
curl -I https://life.au.edu/connect-admin/login
```

Test the internal recommendation service:

```bash
docker run --rm \
  --network au-network \
  curlimages/curl:latest \
  http://recommendation:8000/hello
```

### 9. Stopping it

```bash
make prod-down
```

The `ac-mongo-data` volume sticks around, so data is preserved across normal
container restarts.

Do **not** run `docker compose down -v` in production unless the database is
intentionally being deleted.

---

## Demo/test data seeding

Demo data can be seeded with `pnpm db:seed` from a checkout of this repo
(`migration_scripts/seed-local-test-data.ts`). Mongo is temporarily
published on loopback for the seeding, then resealed. This is how the demo
data on life.au.edu was seeded:

```bash
docker compose \
  --env-file .compose.env \
  -f docker-compose.prod.yml \
  -f docker-compose.seed.yml \
  up -d mongo

DATABASE_URL="mongodb://localhost:27018/au-connect?directConnection=true" pnpm db:seed

docker compose \
  --env-file .compose.env \
  -f docker-compose.prod.yml \
  up -d mongo
```

The seed links everything to the first real OAuth account, so at least one
login must happen before seeding. All seeded accounts use the email domain
`@seed.aunetwork.test`, so the demo data is identifiable and removable at any
time by deleting those users.

## How updates get deployed

Each of the three repos builds and pushes its **own** image; the server just
pulls them. The AU team handles the redeploy on their side. The flow is:

```text
merge to main in a repo
        |
        v
GitHub Actions builds & pushes its image
        |
        v
AU team pulls the updated image
        |
        v
Docker Compose recreates the affected container
```

The three images are:

```text
au-connect
au-connect-admin
au-connect-recommendation
```

To redeploy by hand on the server:

```bash
make prod-pull
make prod-up
```

or:

```bash
docker compose \
  --env-file .compose.env \
  -f docker-compose.prod.yml \
  pull

docker compose \
  --env-file .compose.env \
  -f docker-compose.prod.yml \
  up -d
```

Each of the three repos owns its own `Dockerfile` + image workflow. This repo
(`au-connect`) holds the shared `docker-compose.prod.yml` that runs the complete
system together.

### One-time CI setup

Each repository that publishes a Docker image needs:

```text
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
```

The production public hostname is runtime configuration. It is **not** necessary
to rebuild the main application image just to change `APP_PUBLIC_URL`.

---

## About the /connect path

The main app is served under `/connect` everywhere:

```text
basePath: "/connect"
```

is fixed in `next.config.ts`.

The public production URL is configured at runtime with:

```dotenv
APP_PUBLIC_URL=https://life.au.edu/connect
```

The admin app uses:

```dotenv
ADMIN_PUBLIC_URL=https://life.au.edu/connect-admin
MAIN_APP_PATH=https://life.au.edu/connect
```

Normal Next.js navigation remains base-path aware, while browser API requests
use the `/connect/api/connect/v1` namespace.

The nginx proxy should preserve the `/connect` and `/connect-admin` prefixes.

---

## MongoDB backup

MongoDB data is stored in the Docker volume `ac-mongo-data`. The volume is
persistent, but it is not a backup.

Example backup:

```bash
docker exec au-connect-mongo \
  mongodump \
  --db au-connect \
  --archive=/tmp/au-connect-backup.archive \
  --gzip

docker cp \
  au-connect-mongo:/tmp/au-connect-backup.archive \
  ./au-connect-backup.archive
```

Production backups should be copied somewhere outside the Docker volume/server.
