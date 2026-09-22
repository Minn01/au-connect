# Deploying AU Connect on life.au.edu

This is how to deploy the AU Connect system on the life.au.edu server. It runs
three app images (pulled from Docker Hub) + MongoDB as containers with Docker
Compose, all on one private network:

- `au-connect-app` — the main Next.js app · `127.0.0.1:3000` → `life.au.edu/connect`
- `au-connect-admin` — the admin app · `127.0.0.1:3001` → `life.au.edu/connect-admin`
- `au-connect-reco` — the recommendation API (FastAPI) · **internal only**, no host port
- `au-connect-mongo` — MongoDB (single-node replica set) · **internal only**

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

### 2. Create the three env files

Each app gets its own env file (all gitignored — never commit real secrets):

```bash
cp .env.template .env                                # main app
cp .env.admin.example .env.admin                     # admin app
cp .env.recommendation.example .env.recommendation   # recommendation api
```

### 3. Fill in the values

Open each file and fill it in. The `.env.admin` and `.env.recommendation`
variables come from those repos' own READMEs. For the main app's `.env`, the
key ones:

```dotenv
NEXT_PUBLIC_BASE_URL=https://life.au.edu/connect   # the public URL, use https
NODE_ENV=production
JWT_SECRET=                                        # openssl rand -base64 32
DATABASE_URL=mongodb://mongo:27017/au-connect?directConnection=true

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

GMAIL_USER=
GMAIL_APP_PASSWORD=
```

For the OAuth logins to work, register these redirect URIs with each provider
(Google Cloud Console, LinkedIn, and Microsoft Entra ID), using your real
`NEXT_PUBLIC_BASE_URL` as the host:

```
<NEXT_PUBLIC_BASE_URL>/api/connect/v1/auth/google/callback
<NEXT_PUBLIC_BASE_URL>/api/connect/v1/auth/linkedin/callback
<NEXT_PUBLIC_BASE_URL>/api/connect/v1/auth/azure-ad/callback
```

The AU team decides the final URL, so let us know what it is and we'll add the
redirect URIs. Until that's done, Google/LinkedIn/Microsoft login won't work.

### 4. Start it

```bash
make prod-up
```

This pulls the three images from Docker Hub and starts them plus MongoDB. The
main app listens on `127.0.0.1:3000` and the admin app on `127.0.0.1:3001` —
neither is exposed to the internet directly; the AU team's nginx sits in front.
The recommendation API and MongoDB have no host port at all.

### 5. Set up nginx

The AU team adds routes to their existing nginx. The main app example is in
[`deploy/nginx/au-connect.conf.example`](deploy/nginx/au-connect.conf.example):

```
life.au.edu/               ->  127.0.0.1:3000   (Next redirects to /connect)
life.au.edu/connect        ->  127.0.0.1:3000   (main app)
life.au.edu/connect-admin  ->  127.0.0.1:3001   (admin app)
```

Forward the exact `/`, `/connect`, and `/connect/...` paths without changing the
URI. Next redirects `/` to `/connect` on localhost and the production host.
The admin app uses its own `/connect-admin` route. Then reload nginx:

```bash
sudo nginx -t && sudo nginx -s reload
```

### 6. Stopping it

```bash
make prod-down
```

The `ac-mongo-data` volume sticks around, so your data is safe across restarts.

## How updates get deployed

Each of the three repos builds and pushes its **own** image; the server just
pulls them. The AU team handles the redeploy on their side. The flow is:

```
merge to main in a repo  ->  its GitHub Actions builds & pushes its image
   (au-connect, admin, recommendation → 3 images on Docker Hub)
                                  |
               the AU team pulls the new image and restarts the container
```

To redeploy by hand on the server: `make prod-pull` then `make prod-up`.

Each of the three repos owns its own `Dockerfile` + push workflow
(`.github/workflows/deploy.yml`). This repo (au-connect) also holds the shared
`docker-compose.prod.yml` that runs all three images together.

### One-time CI setup

`NEXT_PUBLIC_BASE_URL` gets compiled into the browser code when the image is
built, not when it runs. So the image has to be built with the real URL. In the
GitHub repo, under Settings > Secrets and variables > Actions, add a variable:

```
NEXT_PUBLIC_BASE_URL = https://life.au.edu/connect
```

And add the two secrets the build uses: `DOCKERHUB_USERNAME` and
`DOCKERHUB_TOKEN`. The production workflow stops if the URL is missing or
does not end in `/connect`.

## About the /connect path

The main app is served under `/connect` everywhere: `basePath: "/connect"` is
set in `next.config.ts` for both localhost and production. Next prefixes page
navigation; browser API calls use the `/connect/api/connect/v1` paths in
`lib/constants.ts`. Share links are built from `NEXT_PUBLIC_BASE_URL`.

The main thing is to build and run with
`NEXT_PUBLIC_BASE_URL=https://life.au.edu/connect` (both the GitHub Actions
variable and the `.env`). That value has to include the `/connect` part, or the
links, logins, and notification emails won't line up. The server rejects a
missing or invalid public URL in production instead of sending localhost links.
