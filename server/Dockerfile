FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV DATA_DIR=/app/data
EXPOSE 3001

CMD ["node", "src/index.js"]
