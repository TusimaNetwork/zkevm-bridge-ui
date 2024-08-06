FROM nginx:alpine

RUN apk add --update nodejs npm yarn

WORKDIR /app

COPY .env.example package.json package-lock.json yarn.lock ./
COPY scripts ./scripts
COPY abis ./abis

RUN yarn 
RUN yarn generate-contract-types
COPY . .

WORKDIR /

ENTRYPOINT ["/bin/sh", "/app/scripts/deploy.sh"]
