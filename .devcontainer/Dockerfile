FROM mcr.microsoft.com/vscode/devcontainers/base:debian-10

ENV DENO_INSTALL=/deno
RUN mkdir -p /deno
RUN curl -fsSL https://deno.land/x/install/install.sh | sh

ENV PATH="${DENO_INSTALL}/bin:${PATH}"
ENV DENO_DIR="${DENO_INSTALL}/.cache/deno"

RUN chown -R vscode /deno

ENV EDITOR="code --wait"
