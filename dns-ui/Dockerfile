# Etapa 1: Build de la aplicación React + Vite
FROM node:18-alpine AS build

WORKDIR /app

# Copiar manifiestos de dependencias e instalarlas
COPY package*.json ./
RUN npm ci

# Copiar el código fuente y construir el paquete de producción
COPY . .
RUN npm run build

# Etapa 2: Servidor Nginx para servir la aplicación estática
FROM nginx:alpine AS production

# Copiar la configuración de Nginx con soporte para SPA (React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los artefactos estáticos generados en la etapa de build
COPY --from=build /app/dist /usr/share/nginx/html

# Exponer el puerto 80
EXPOSE 80

# Iniciar servidor Nginx
CMD ["nginx", "-g", "daemon off;"]
