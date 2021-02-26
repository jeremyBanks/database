FROM mcr.microsoft.com/vscode/devcontainers/base:debian-10

ENV DENO_INSTALL=/deno
RUN mkdir -p /deno
RUN curl -fsSL https://deno.land/x/install/install.sh | sh

ENV PATH="${DENO_INSTALL}/bin:${PATH}"
ENV DENO_DIR="${DENO_INSTALL}/.cache/deno"

RUN deno cache https://deno.land/std@0.88.0/fs/expand_glob.ts
RUN deno cache https://deno.land/std@0.88.0/log/mod.ts
RUN deno cache https://deno.land/std@0.88.0/testing/asserts.ts
RUN deno cache https://deno.land/x/database@0.0.0/mod.ts
RUN deno cache https://deno.land/x/postgres@v0.8.0/mod.ts
RUN deno cache https://deno.land/x/sqlite@v2.3.2/mod.ts
RUN deno cache https://deno.land/x/zod@v3-snapshot-2021-01-21/deno/lib/mod.ts

RUN chown -R vscode /deno

ENV EDITOR="code --wait"
