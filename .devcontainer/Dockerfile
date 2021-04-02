FROM mcr.microsoft.com/vscode/devcontainers/universal:1-linux

USER root

ENV DENO_INSTALL="/deno" \
    DENO_DIR="/deno/.cache/deno"

RUN mkdir -p "${DENO_INSTALL}" && \
    curl -fsSL https://deno.land/x/install/install.sh | sh && \
    chown -R codespace "${DENO_INSTALL}" && \
    ln -s "${DENO_INSTALL}/bin/deno" /usr/bin/deno && \
    deno install --allow-all --no-check -f https://deno.land/x/deploy/deployctl.ts

RUN apt-get update && apt-get -y install postgresql-client-12 mysql-client-8.0

USER codespace
