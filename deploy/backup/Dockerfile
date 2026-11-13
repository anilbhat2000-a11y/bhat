# Backup container: PostgreSQL client tools plus GnuPG for encryption.
# Built once during installation; it needs no internet access when running.
FROM postgres:16
RUN apt-get update \
 && apt-get install -y --no-install-recommends gnupg \
 && rm -rf /var/lib/apt/lists/*
COPY backup.sh restore.sh run-daily.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/restore.sh /usr/local/bin/run-daily.sh
ENTRYPOINT []
CMD ["/usr/local/bin/run-daily.sh"]
