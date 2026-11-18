FROM node:24-slim

ENV TEST_ENV=production

WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --ignore-scripts && npm cache clean --force

COPY --chown=node:node . .

ENTRYPOINT ["npx", "playwright", "test"]
