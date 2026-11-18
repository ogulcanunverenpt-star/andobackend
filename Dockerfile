FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install --no-package-lock --include=dev
COPY src ./src
RUN npm run build:railway

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist/railway.js ./dist/railway.js
USER node
CMD ["node", "dist/railway.js"]
