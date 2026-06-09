#!/bin/sh
printf 'POST /test HTTP/1.1\r\nHost: localhost:3002\r\nContent-Type: application/json\r\nContent-Length: 17\r\n\r\n{"email":"test"}' | nc localhost 3002
