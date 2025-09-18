# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app

# Activa Corepack y fija Yarn Classic (1.22.x)
# (no uses "npm i -g yarn@1")
RUN corepack enable && corepack prepare yarn@1.22.22 --activate

# Instala deps (usa lock si existe; si no, instala normal)
COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile || yarn install

# Copia el resto y build
COPY . .
RUN yarn build

# ---- runtime ----
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
RUN printf "server {\n  listen 80;\n  server_name _;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / { try_files $uri $uri/ /index.html; }\n}\n" > /etc/nginx/conf.d/default.conf
