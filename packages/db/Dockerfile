FROM postgres:16

# Install pg_cron and http extension. ca-certificates is required by the http
# extension's libcurl: pg_cron jobs call the app over HTTPS, and without a CA
# bundle every call fails with "error setting certificate file".
RUN apt-get update && \
    apt-get install -y \
    ca-certificates \
    postgresql-16-cron \
    postgresql-16-http && \
    rm -rf /var/lib/apt/lists/*
