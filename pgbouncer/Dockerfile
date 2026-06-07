FROM alpine:3.20
RUN apk add --no-cache pgbouncer postgresql-client && \
    adduser -D -u 1001 -h /var/lib/pgbouncer pgbouncer && \
    mkdir -p /var/log/pgbouncer && \
    touch /etc/pgbouncer/pgbouncer.ini /etc/pgbouncer/userlist.txt
COPY pgbouncer.ini /etc/pgbouncer/pgbouncer.ini
COPY userlist.txt /etc/pgbouncer/userlist.txt
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && \
    chown -R pgbouncer:pgbouncer /etc/pgbouncer /entrypoint.sh /var/log/pgbouncer
EXPOSE 6432
USER pgbouncer
ENTRYPOINT ["/entrypoint.sh"]
