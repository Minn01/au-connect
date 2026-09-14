# Deploying AU Connect on life.au.edu

These are the instructions for deploying **AU Connect** on the life.au.edu server.
The stack runs two containers via Docker Compose:

| Container | What it is | Port |
|-----------|-----------|------|
| `au-connect-app` | the Next.js app (pulled from Docker Hub) | 3000 (localhost only) |
| `au-connect-watchtower` | continuous deployment — auto-updates the app | — |

The **database is MongoDB Atlas** (managed cloud, not a container) — configured
via `DATABASE_URL` in `.env`.

## Prerequisites

- Docker and Docker Compose installed on the server
- `make` installed
- Access to the server + permission to edit the nginx config

## Steps

### 1. Clone the repo

```bash
git clone https://github.com/<your-org>/au-connect.git
cd au-connect
```

### 2. Create `.env` from the template

```bash
cp .env.template .env
```

### 3. Fill in the required values

Edit `.env`. The important ones:

```dotenv
NEXT_PUBLIC_BASE_URL=https://life.au.edu/connect   # the public URL (https!)
NEXT_PUBLIC_APP_URL=https://life.au.edu/connect
NODE_ENV=production
JWT_SECRET=super_secure_jwt_secret                 # openssl rand -base64 32
DATABASE_URL=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/au_connect?retryWrites=true&w=majority

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

**OAuth redirect URIs** — register these with each provider (Google Cloud
Console, LinkedIn, Microsoft Entra ID), replacing the host with your real
`NEXT_PUBLIC_BASE_URL`:

```
<NEXT_PUBLIC_BASE_URL>/api/connect/v1/auth/google/callback
<NEXT_PUBLIC_BASE_URL>/api/connect/v1/auth/linkedin/callback
<NEXT_PUBLIC_BASE_URL>/api/connect/v1/auth/azure-ad/callback
```

Since the final URL is decided by the AU team, **tell us the website URL** so
the redirect URIs can be added — otherwise Microsoft/Google/LinkedIn login will
fail.

### 4. Start it

```bash
make prod-up
```

This pulls the image from Docker Hub and starts the app + Watchtower. The app
connects to your Atlas database via `DATABASE_URL` and listens on
**127.0.0.1:3000** (not exposed publicly — nginx fronts it).

### 5. Put nginx in front

An example config is in [`deploy/nginx/au-connect.conf.example`](deploy/nginx/au-connect.conf.example).
It proxies `life.au.edu/connect` → `127.0.0.1:3000`. Copy it into the server's
nginx config, then:

```bash
sudo nginx -t && sudo nginx -s reload
```

### 6. Stop it

```bash
make prod-down
```

(Your data lives in Atlas, so stopping the app never touches it.)

---

## Continuous deployment (Watchtower)

Watchtower is already part of `docker-compose.prod.yml`. It watches Docker Hub
and, whenever a new image is published, pulls it and restarts the app — **no
manual redeploy needed.**

The full pipeline:

```
merge to main → GitHub Actions builds & pushes  tommyzizii/au-connect:latest
                                                        │
                    Watchtower on the server sees the new image (checks every 5 min)
                                                        │
                    pulls it + recreates au-connect-app with the same .env
```

- Watchtower only touches containers labelled `watchtower.enable=true` (the app).
- If your Docker Hub repo is **private**, run `docker login` on the server and
  uncomment the `config.json` volume line in `docker-compose.prod.yml`.
- Watch it work: `docker logs -f au-connect-watchtower`.

### ⚠ One-time CI setup (important for Next.js)

`NEXT_PUBLIC_BASE_URL` is compiled into the browser bundle **at build time**, so
the image Watchtower pulls must be built with the real URL. In the GitHub repo,
set an **Actions variable** (Settings → Secrets and variables → Actions →
Variables):

```
NEXT_PUBLIC_BASE_URL = https://life.au.edu/connect
```

Also set the two secrets the build already uses: `DOCKERHUB_USERNAME` and
`DOCKERHUB_TOKEN`. Without the variable, the image is built pointing at
`localhost` and links/logins/social-previews break in production.

---

## Serving under `/connect` (sub-path) vs a sub-domain

The app is **already configured for the sub-path** `life.au.edu/connect`:
`basePath: "/connect"` is set in `next.config.ts`, the middleware redirects are
basePath-aware, and the social-share URLs are built from `NEXT_PUBLIC_BASE_URL`.
Use **Option A** in the nginx example.

The only requirement: build/run with `NEXT_PUBLIC_BASE_URL=https://life.au.edu/connect`
(both the GitHub Actions variable and `.env`). That value must include the
`/connect` suffix so links, logins, and social previews resolve correctly.

If the AU team instead gives you a dedicated sub-domain (e.g. `connect.au.edu`),
remove the `basePath` line from `next.config.ts`, use **Option B** in the nginx
example, and set `NEXT_PUBLIC_BASE_URL=https://connect.au.edu`.
