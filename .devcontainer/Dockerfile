FROM mcr.microsoft.com/vscode/devcontainers/universal:1-linux

USER root

RUN mkdir -p /deno && \
    curl -fsSL https://deno.land/x/install/install.sh | DENO_INSTALL=/deno sh && \
    chown -R codespace /deno

ENV DENO_INSTALL="/deno"
ENV DENO_DIR="${DENO_INSTALL}/.cache/deno"
ENV PATH="${PATH}:${DENO_INSTALL}/bin:/usr/lib/postgresql/12/bin"
ENV PGDATA="/usr/local/pgsql/data"

RUN apt-get update && \
    apt-get -y install postgresql-12 postgresql-client-12 && \
    mkdir -p /usr/local/pgsql/data && \
    chown -R postgres /usr/local/pgsql

USER postgres

ENV DENO_INSTALL="/deno"
ENV DENO_DIR="${DENO_INSTALL}/.cache/deno"
ENV PATH="${PATH}:${DENO_INSTALL}/bin:/usr/lib/postgresql/12/bin"
ENV PGDATA="/usr/local/pgsql/data"

RUN initdb && \
    pg_ctl start && \
    createuser -s vscode

USER codespace
