# Deploying AU Connect on life.au.edu

This is how to deploy AU Connect on the life.au.edu server. It runs the app and
MongoDB as containers with Docker Compose:

- `au-connect-app` — the Next.js app, pulled from Docker Hub, listening on port 3000 (localhost only)
- `au-connect-mongo` — MongoDB, running as its own container (single-node replica set)

Redeployment and the reverse proxy are handled by the AU team's own setup
(their Watchtower and nginx), so this repo doesn't run its own.

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

### 2. Create the `.env` file

```bash
cp .env.template .env
```

### 3. Fill in the values

Open `.env` and fill in the values. The main ones:

```dotenv
NEXT_PUBLIC_BASE_URL=https://life.au.edu/connect   # the public URL, use https
NEXT_PUBLIC_APP_URL=https://life.au.edu/connect
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

This pulls the app image from Docker Hub and starts the app and MongoDB. The app
listens on 127.0.0.1:3000 — it isn't exposed to the internet directly; the AU
team's nginx sits in front of it.

### 5. Set up nginx

There's an example config at
[`deploy/nginx/au-connect.conf.example`](deploy/nginx/au-connect.conf.example)
that proxies `life.au.edu/connect` to `127.0.0.1:3000`. Copy it into the
server's nginx config and reload:

```bash
sudo nginx -t && sudo nginx -s reload
```

### 6. Stopping it

```bash
make prod-down
```

The `ac-mongo-data` volume sticks around, so your data is safe across restarts.

## How updates get deployed

We don't run our own Watchtower — the AU team handles redeployment on their side.
From our end, all we do is publish a new image, and their setup picks it up. The
flow is:

```
merge to main  ->  GitHub Actions builds and pushes tommyzizii/au-connect:latest
                                  |
               the AU team's Watchtower notices the new image and redeploys
                                  |
               (or they pull and restart the container manually)
```

The app container carries the `watchtower.enable=true` label, so if their
Watchtower filters by label it will pick ours up automatically. If you ever need
to redeploy by hand, `make prod-pull` followed by `make prod-up` does it.

### One-time CI setup

`NEXT_PUBLIC_BASE_URL` gets compiled into the browser code when the image is
built, not when it runs. So the image has to be built with the real URL. In the
GitHub repo, under Settings > Secrets and variables > Actions, add a variable:

```
NEXT_PUBLIC_BASE_URL = https://life.au.edu/connect
```

And add the two secrets the build uses: `DOCKERHUB_USERNAME` and
`DOCKERHUB_TOKEN`. If you skip the variable, the image gets built pointing at
localhost, and the links, logins, and social-share previews break in production.

## About the /connect path

The app is set up to live under `life.au.edu/connect`. `basePath: "/connect"` is
set in `next.config.ts`, and the share links are built from
`NEXT_PUBLIC_BASE_URL`. Use Option A in the nginx example.

The main thing is to build and run with
`NEXT_PUBLIC_BASE_URL=https://life.au.edu/connect` (both the GitHub Actions
variable and the `.env`). That value has to include the `/connect` part, or the
links and logins won't line up.

If the AU team gives you a separate subdomain instead (like `connect.au.edu`),
remove the `basePath` line from `next.config.ts`, use Option B in the nginx
example, and set `NEXT_PUBLIC_BASE_URL=https://connect.au.edu`.
