FROM nginx:alpine

RUN apk add --update nodejs npm

WORKDIR /app

COPY .env.example package.json package-lock.json ./
COPY scripts ./scripts
COPY abis ./abis

RUN npm install
RUN npm run generate-contract-types
COPY . .

WORKDIR /

ENTRYPOINT ["/bin/sh", "/app/scripts/deploy.sh"]
