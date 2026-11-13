FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
# Install with devDependencies: the build needs TypeScript and Prisma's CLI.
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build && npm prune --omit=dev
ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
