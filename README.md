# wiewarm.ch

The Next.js frontend lives in `frontend/`. Apache/PHP in `www_public/` serves
`/api`, `/img`, and `/xmlData.php`; import jobs remain PHP and their directory
remains blocked over HTTP. Internal Apache proxies other requests to Node.
The external HTTPS vhost is unchanged.

## Development

Run `docker compose -f infra/docker-compose.yml up --build` and open
http://localhost:3770. Development database passwords are `badi`.
Node 22 is required for standalone frontend development:
`cd frontend && npm ci && npm run dev`.
Set `WIEWARM_API_ORIGIN=http://localhost:3770` when using the local PHP API.
`WIEWARM_ORIGIN` controls public image URLs separately.

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
to `127.0.0.1:3771`; Node calls the PHP API on that same internal port.

`infra/podman-build.sh` builds both PHP and Node images, tagged `latest` by
default, or with the tag supplied as its first argument.
`infra/vps_deploy.sh` builds both services and checks Node before restarting
internal Apache. Production ports 3771 and 3772 bind to loopback.
Set `ENV_APACHE_PORT=3771` in the existing `~/.env.sh` to match this wiring.
These fixed ports support one deployment per host; running beta and production
on the same host requires separate ports and corresponding proxy configuration.
Enable both user services and user lingering as appropriate for the VPS.
The deployment script pulls the current branch; deploy only reviewed revisions.

Before rollout, record the previous Git revision and preserve the previous PHP
image tag. For rollback, restore that revision/configuration and PHP image;
restore `~/.config/wiewarm-node-image.previous` to `wiewarm-node-image`, then
restart both user services. No database migration is required.

Validate admin login, password changes, updates and image uploads against the
development database before deployment. Production cookies require HTTPS;
use frontend dev mode or a local HTTPS proxy for full admin testing.

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
