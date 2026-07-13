# syntax=docker/dockerfile:1

FROM node:24.18.0-bookworm-slim

ENV NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false

LABEL org.opencontainers.image.source="https://github.com/aidc2026ai-melon/aidc-ai-mcp" \
      org.opencontainers.image.title="AIDC-AI.IO MCP Server" \
      org.opencontainers.image.licenses="MIT"

RUN npm install --global --omit=dev aidc-mcp-server@0.2.1 \
    && npm cache clean --force

USER node

ENTRYPOINT ["aidc-mcp-server"]
