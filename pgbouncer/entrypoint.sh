#!/bin/sh
set -e

DB_USER="${DB_USER:-udb}"
DB_PASSWORD="${DB_PASSWORD:-udb}"

sed -i "s/^\(\s*\*\s*=\s*host=postgres port=5432 dbname=udb user=\)udb\( password=\)udb$/\1${DB_USER}\2${DB_PASSWORD}/" /etc/pgbouncer/pgbouncer.ini

printf '"%s" "%s"\n' "$DB_USER" "$DB_PASSWORD" > /etc/pgbouncer/userlist.txt

exec pgbouncer /etc/pgbouncer/pgbouncer.ini
