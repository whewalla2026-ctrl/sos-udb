FROM postgres:16-alpine
RUN apk add --no-cache postgresql16-dev gcc musl-dev make git
RUN git clone --branch 2.17.2 https://github.com/timescale/timescaledb /tmp/timescaledb && cd /tmp/timescaledb && ./bootstrap -DREGRESS_CHECKS=OFF && cd build && make -j4 install && cd / && rm -rf /tmp/timescaledb
RUN echo \
shared_preload_libraries
=
timescaledb
\ >> /usr/local/share/postgresql/postgresql.conf.sample
