# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS base
WORKDIR /workspace
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json .eslintrc.cjs .eslintignore .prettierrc ./
COPY packages ./packages
COPY services ./services
COPY apps ./apps

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @nexzo/billing build

CMD ["pnpm", "--filter", "@nexzo/billing", "start"]
