FROM node:16-alpine as ts-compiler
WORKDIR /usr/src/app
COPY package*.json ./
COPY tsconfig*.json ./
RUN npm install
COPY . ./
RUN npm run build

FROM node:16-alpine as ts-remover
WORKDIR /usr/app
COPY --from=ts-compiler /usr/src/app/package*.json ./
COPY --from=ts-compiler /usr/src/app/dist ./
RUN npm install --only=production

FROM node:16-alpine
WORKDIR /usr/app
COPY --from=ts-remover /usr/app ./
RUN mkdir /usr/app/data && chown 1000 /usr/app/data
USER 1000
VOLUME /usr/app/data
CMD ["index.js"]