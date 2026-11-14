FROM node:22-alpine
# LibreOffice converts PowerPoint, Word and Excel lessons to PDF; ffmpeg converts MOV and MKV
# videos to MP4. The fonts keep converted documents looking like the originals.
RUN apk add --no-cache libreoffice ffmpeg ttf-liberation font-noto font-dejavu
WORKDIR /app
COPY package.json package-lock.json ./
# Install with devDependencies: the build needs TypeScript and Prisma's CLI.
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build && npm prune --omit=dev
ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
