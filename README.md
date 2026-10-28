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

# AI Policy

 * Mir hätte fröid amne komplette Rewrite ufene moderne Stäck, aber müesst chli gschmackvou und durchdacht si. Gärn zersch imne Issue diskutiere.
 * Chlini änderige: gärn, bitte vorhär usprobiere, minimau mache
 * 50 KLOC PR nume zum d'Schrift ändere lieber nid

# Code of Conduct

Syt lieb zunenang.
