# --- Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Instala pnpm
RUN npm install -g pnpm

# Instala dependências (cache eficiente)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copia código fonte
COPY . .

# ADICIONE ESTA LINHA:
RUN npx prisma generate

# Gera o build de produção (dist/)
RUN pnpm run build

# --- Production Stage ---
FROM node:20-alpine

WORKDIR /app

# Instala pnpm
RUN npm install -g pnpm

# Copia apenas o necessário do estágio anterior
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/src/database ./src/database

# Exposição da porta (O Coolify detecta, mas é bom explicitar)
EXPOSE 3000

# Comando de início
CMD ["pnpm", "run", "start:prod"]