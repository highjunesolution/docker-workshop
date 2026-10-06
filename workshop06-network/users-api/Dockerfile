FROM node:22

WORKDIR /app

RUN npm install --global pnpm@12

COPY package*.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3001

CMD [ "pnpm", "start" ]