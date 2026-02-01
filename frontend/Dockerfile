FROM node:20-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install --legacy-peer-deps

COPY . ./
RUN npm run build

FROM nginx:alpine

WORKDIR /app

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/build /usr/share/nginx/html

ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "envsubst '$$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'" ]
