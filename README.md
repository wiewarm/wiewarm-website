# wiewarm.ch website

D'Desktop Website vo wiewarm.ch, in ihrem ganze Angular 1.x - PHP - 2010 Glanz. Neu ab Saison 2026 mit Postgres Bäckend und Open Source.



# Todo Lischte

 * e2e Tests z.B. robot + Selenimum für Angular + API
 * besseri Lösig für User-supplied Biudli (s3.wiewarm.ch oder so)
 * DB-schema manage so dass me Apassige cha in PRs mitlifere
 * AGENTS.md
   
# Mitmache

 * `cd infra ; docker-compose up ; http://localhost:3770`
 * häcke in www_public
 * i dere lokale Umgäbig/DB si aui Passwörter `badi`
 * hesch öppis guets mach ä Pull Request

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
