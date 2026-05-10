FROM alpine:3.20
RUN apk add --no-cache pgbouncer postgresql-client && \
    adduser -D -u 1001 -h /var/lib/pgbouncer pgbouncer && \
    mkdir -p /var/log/pgbouncer && \
    chown -R pgbouncer:pgbouncer /var/log/pgbouncer /etc/pgbouncer
COPY pgbouncer.ini /etc/pgbouncer/pgbouncer.ini
COPY userlist.txt /etc/pgbouncer/userlist.txt
RUN chown -R pgbouncer:pgbouncer /etc/pgbouncer
EXPOSE 6432
USER pgbouncer
CMD ["pgbouncer", "/etc/pgbouncer/pgbouncer.ini"]
