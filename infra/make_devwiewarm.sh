#!/bin/bash
set -euo pipefail

SRC_DB="betawiewarm"
DST_DB="devwiewarm"
OUT_FILE="/home/wiewarm-pmp/public_html/files/db/devwiewarm.sql"

psql -v ON_ERROR_STOP=1 postgres <<SQL
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '${DST_DB}'
  AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS ${DST_DB};
CREATE DATABASE ${DST_DB} TEMPLATE ${SRC_DB};
SQL

psql -v ON_ERROR_STOP=1 "${DST_DB}" <<'SQL'
UPDATE bad
SET password_hash = '$6$rounds=5000$pw_is_badi$5tjAjV0qlAvIEvjeHiYrYf8mMM/SXTMX7EkpvZ7EqNkkP2jPjUe8eaNOP7spG9lTooedlggfJiauFl4qvhPWW/';

DELETE FROM temperatur
WHERE datum < DATE '2024-01-01';

DELETE FROM infos
WHERE datum < DATE '2024-01-01';

SQL

pg_dump -Cc "${DST_DB}" | gzip -c > "${OUT_FILE}"
