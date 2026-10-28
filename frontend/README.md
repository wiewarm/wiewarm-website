# wiewarm.ch

A modern, server-rendered Next.js and React implementation of
[wiewarm.ch](https://www.wiewarm.ch/). It presents current water temperatures
and swimming-location details using only the documented wiewarm REST API.

## Local development

Requirements:

- Node.js 22.13 or newer
- npm

Install dependencies and start the development server:

```bash
npm install
npm run dev -- --port 3001
```

Open [http://localhost:3001/](http://localhost:3001/) in a browser.

## Login for pool staff (`/admin`)

Staff sign in with Bad-Id and PIN against `PUT /api/v1/login/{badid}/{pin}`. The
legacy API has no tokens, so the session cookie (httpOnly, AES-GCM encrypted)
holds the credentials needed for later write calls. Production requires a
`SESSION_SECRET` environment variable (a long random string); development uses a
fixed fallback. "Passwort ändern" uses `PUT /api/v1/login/password` and keeps the session
signed in with the new password.

## Temperature history

The "Temperaturverlauf" chart at the bottom of each location page uses
`GET /api/v1/bad/{badid}/timeseries` (daily averages, up to 90 days). The 90 days
are fetched once on the server; range (7–90 days) and pools are chosen in the
browser, defaulting to 30 days and the main pools. If the endpoint is not
available, the chart section is simply hidden.

Available checks:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

## Font selection mode

The local font comparison tool is available at
[http://localhost:3001/?fontselect=true](http://localhost:3001/?fontselect=true).
It exists for evaluating alternatives and is not part of the normal interface.

## Typography decision

At its meeting of **07.10.2026**, the local Font Selection Committee selected
**Geist** as the official font for wiewarm.ch.

This decision may only be changed by a majority vote of the full council.

## Design selection mode

The design selector is always visible in the site header, including in a fresh
browser session. **Sommerfrische** is the default: a bright turquoise, yellow,
and coral palette, a compact banner with an original lakeside SVG postcard,
quick place searches, canton filtering, and prominent temperature readings.
Compact rows on desktop and phones keep more measurements visible. Geist
remains the interface typeface, with Fraunces used for the postcard-style accent.
Older readings are labelled explicitly. All data continues to come from the
existing wiewarm API, with server-rendered search, sorting, and pagination.

The selector also includes **Swiss Lido**, the restored **First
Try**, a summer-orbit **Second Try**, the proposal-inspired **Summer Swim**,
**Amiga Chiptune**, **Modern macOS**, **Vintage 60s**, **MS-DOS**, and a darker
cathedral-inspired **Goth** experiment. The selected design persists while
browsing and is restored before the page paints. This edition uses the
`wiewarm-design-v2` preference key so returning visitors see the new default once.

Use `?fontselect=true` to show the additional font control.

## Data source

Application data is fetched exclusively from the documented
[wiewarm REST API](https://www.wiewarm.ch/api/doc/index.html).

The legacy implementation is available in the
[wiewarm-website repository](https://github.com/wiewarm/wiewarm-website).
