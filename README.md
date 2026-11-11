# wiewarm.ch

The Next.js frontend lives in `frontend/`. Apache/PHP in `www_public/` serves
`/api`, `/img`, and `/xmlData.php`; import jobs remain PHP and their directory
remains blocked over HTTP. Internal Apache proxies other requests to Node.
The external HTTPS vhost is unchanged.

## Development

From the repository root, with Docker Engine and Docker Compose installed:

```bash
docker compose -f infra/docker-compose.yml up --build -d --wait
docker compose -f infra/docker-compose.yml logs -f
```

Open http://localhost:3770 once the database import and frontend startup finish.
The first run downloads the development database and installs frontend packages,
so it takes longer. The containers provide Node 26 LTS, PHP, and PostgreSQL;
no host Node installation is needed. The frontend runs `next dev` with live
reload from `frontend/`; PHP files are also mounted directly from the checkout.
Development images are loaded directly from the local PHP server.
Run frontend tests with `docker compose -f infra/docker-compose.yml exec frontend npm test`.

The local database is `devwiewarm`. Its application account is `webuser` with
password `badi`; its administrator account is `postgres` with password `postgres`.
PostgreSQL is available at `localhost:3779`. Both published ports bind to localhost.
Database data and container frontend dependencies/cache live in Docker volumes.
Stop the environment with `docker compose -f infra/docker-compose.yml down`;
this preserves those volumes. Adding `--volumes` deletes local database changes
and causes a fresh database import on the next start.

For an optional frontend running on the host, use Node 26 LTS (the package minimum
is 22.13), leave the PHP/database containers running, and run:

```bash
cd frontend
npm ci
WIEWARM_API_ORIGIN=http://localhost:3770 WIEWARM_ORIGIN=http://localhost:3770 npm run dev
```

Then open http://localhost:3000. The API origin selects the backend for reads and
writes; the public origin selects image URLs. Both commands above use the local API.

## Production

Create `~/.wiewarm-node.env` (mode 600) containing a persistent, random
`SESSION_SECRET` and the public origin for this deployment:

```dotenv
SESSION_SECRET=<generate a random value with openssl rand -hex 32>
WIEWARM_ORIGIN=https://beta.wiewarm.ch
```

Generate the secret once and replace the placeholder; retain it across deploys.
For production, set `WIEWARM_ORIGIN=https://www.wiewarm.ch` instead.
Keep existing PHP secrets and image mounts. On beta, those PHP settings must
select the beta database. The existing external HTTPS vhost for beta must proxy
to the existing `ENV_APACHE_PORT`; Node calls the PHP API on that same internal port.

`infra/podman-build.sh` builds both PHP and Node images, tagged `latest` by
default, or with the tag supplied as its first argument.
`infra/vps_deploy.sh` builds both services and checks Node before restarting
internal Apache. Both containers bind to loopback.
Keep `ENV_APACHE_PORT` in `~/.env.sh` aligned with the external HTTPS proxy:
production uses 3771 and beta uses 3772 on the current VPS. Node defaults to
`ENV_APACHE_PORT + 10` (3781 for production, 3782 for beta). Set `ENV_NODE_PORT`
in the same file if another free port is needed. Separate users run the two
deployments with their own service configuration, secrets, and database settings.
Enable both user services and user lingering as appropriate for the VPS.
The deployment script pulls the current branch; deploy only reviewed revisions.

Before rollout, record the previous Git revision and preserve the previous PHP
image tag. For rollback, restore that revision/configuration and PHP image;
restore `~/.config/wiewarm-node-image.previous` to `wiewarm-node-image`, then
restart both user services. No database migration is required.

Validate admin login, password changes, updates and image uploads against the
development database before deployment. Production cookies require HTTPS;
use frontend dev mode or a local HTTPS proxy for full admin testing.

## Analytics and consent

The frontend loads GA4 only after an explicit analytics opt-in. «Nur notwendige»
is available on the first dialog with the same prominence as accepting. The footer
links to privacy information and lets visitors withdraw consent. Choices expire
after 180 days, and withdrawal also applies to other open tabs on the same origin.
The admin area does not load the tracker. Do not add an unconditional Google tag
to Apache, the layout, or a tag manager alongside this implementation.

The existing public GA4 ID `G-SLQMWRY7SY` is used by default only for production
builds whose `WIEWARM_ORIGIN` is `https://www.wiewarm.ch` or `https://wiewarm.ch`.
Beta and localhost default to no analytics. `GOOGLE_ANALYTICS_ID=G-...` in the
Node environment overrides this; an explicitly empty value disables it. This is
a runtime setting, so changing it requires a container restart, not a build.
The old Universal Analytics tag is not restored.

Before enabling the property, review the privacy notice's operator details and
the Google account's data processing/transfer settings and retention period.
Disable Enhanced Measurement in the GA4 web stream: this integration sends its
own page views with search parameters and fragments removed and does not need
automatic form, search, click or history tracking. Keep Google Signals, advertising
personalisation and user-provided data collection disabled in the account too.
The consent dialog alone does not establish compliance for the whole deployment.

# Password API

`PUT /api/v1/login/password` accepts a JSON body with `badid`, `pincode`
(the current password), and `new_password` (a non-empty string). It returns
`{"success":"OK"}` on success, 400 for invalid input, or 401 for invalid
credentials. The existing administrator password is also accepted.

The password belongs to the BAD: the current schema stores it in
`bad.password_hash`, not in `badmeister`. Updates always use a freshly salted
SHA-512 crypt hash, matching `infra/cryptpw.php`, regardless of the previous hash.

# Temperature history API

`GET /api/v1/bad/235/timeseries?days=7` returns daily average temperatures
in °C for each pool, matching `statng.php`. `days` defaults to 60 and accepts
integers from 7 to 90; invalid values return 400 and unknown BAD IDs return 404.
The range ends at the BAD's latest temperature reading (today if none exist),
with both boundary dates included, so `days=7` normally returns eight dates.

The response contains `badid`, `badname`, `ort`, `days`, `start`, `end`,
`becken` (pool IDs and names), and `data`. Each data row has an ISO `date` and
a `temperatures` object keyed by pool ID, for example
`{"date":"2026-07-10","temperatures":{"11":21.5,"12":null}}`.
Missing readings are `null`; a BAD without pools returns empty `becken` and `data` arrays.

# AI Policy

 * Mir hätte fröid amne komplette Rewrite ufene moderne Stäck, aber müesst chli gschmackvou und durchdacht si. Gärn zersch imne Issue diskutiere.
 * Chlini änderige: gärn, bitte vorhär usprobiere, minimau mache
 * 50 KLOC PR nume zum d'Schrift ändere lieber nid

# Code of Conduct

Syt lieb zunenang.
