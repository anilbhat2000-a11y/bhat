FROM node:22-alpine
# LibreOffice converts PowerPoint, Word and Excel lessons to PDF; ffmpeg converts MOV and MKV
# videos to MP4. The fonts keep converted documents looking like the originals.
# Retried, because a slow or busy download mirror is the most common install failure.
# ALPINE_MIRROR (in .env) switches to another mirror, for example https://mirror.leaseweb.com/alpine
ARG ALPINE_MIRROR=""
RUN if [ -n "$ALPINE_MIRROR" ]; then sed -i "s#https\?://dl-cdn.alpinelinux.org/alpine#${ALPINE_MIRROR%/}#" /etc/apk/repositories; fi \
 && for i in 1 2 3 4 5; do \
      apk add --no-cache libreoffice ffmpeg ttf-liberation font-noto font-dejavu && exit 0; \
      echo "Package download failed (attempt $i of 5), retrying in 15 seconds..."; sleep 15; \
    done; \
    echo "Could not download packages. Check the server can reach dl-cdn.alpinelinux.org (see docs/INSTALL.md)."; exit 1
WORKDIR /app
COPY package.json package-lock.json ./
# Install with devDependencies: the build needs TypeScript and Prisma's CLI.
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build && npm prune --omit=dev
ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
