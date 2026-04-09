FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then echo "Missing NEXT_PUBLIC_SUPABASE_URL at build time"; exit 1; fi
RUN if [ -z "$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY" ] && [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then echo "Missing Supabase public key at build time"; exit 1; fi
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
