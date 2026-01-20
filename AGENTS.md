# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PostMaker X is a pnpm monorepo for optimizing X (Twitter) posts based on algorithm research. It analyzes post content against engagement signals and provides AI-powered suggestions using Gemini.

## Commands

```bash
# Install dependencies
pnpm install

# Typecheck all packages (run after implementation)
pnpm tc

# Build all packages
pnpm build

# Build shared package (required before other packages if types changed)
pnpm build:shared

# Run individual typechecks
pnpm tc:web
pnpm tc:api

# Database operations (PostgreSQL via Drizzle)
pnpm db:push      # Push schema changes
pnpm db:studio    # Open Drizzle Studio
```

## Architecture

### Monorepo Structure

```
postmaker-x/
├── apps/
│   ├── web/          # Vite + React + TailwindCSS frontend
│   └── api/          # Express + TypeScript backend
└── packages/
    └── shared/       # Shared types, constants, algorithm weights
```

### Shared Package (`@postmaker/shared`)

All shared types and constants live here. Both apps import from it:
- `types/` - PostAnalysis, EngagementScores, ContentMetrics, Suggestion, Warning, Template, Timing
- `constants/weights.ts` - Scoring weights based on X algorithm (ENGAGEMENT_WEIGHTS, CONTENT_WEIGHTS, OPTIMAL_LENGTH, LIMITS)
- `constants/algorithm.ts` - Algorithm constants

**Important**: Run `pnpm build:shared` after modifying shared package before other packages can use changes.

### API (`@postmaker/api`)

Express server on port 3001 with routes:
- `POST /api/analyze` - Analyze post content
- `POST /api/generate` - Generate posts via Gemini AI
- `GET /api/templates` - Post templates
- `GET /api/timing/*` - Posting time recommendations

Key services:
- `services/gemini/` - Gemini AI integration (gemini-1.5-flash model)
- `services/analyzer/` - Post analysis against algorithm signals
- `services/scorer.ts` - Scoring calculations
- `services/optimizer/` - Post optimization suggestions
- `db/schema.ts` - Drizzle PostgreSQL schema (posts, analysisHistory, templates)

### Web (`@postmaker/web`)

React SPA with pages:
- `/` (Home) - Post analyzer
- `/threads` - Thread creator
- `/timing` - Timing optimizer
- `/templates` - Template library

State management:
- `@tanstack/react-query` for server state
- `zustand` for client state (`stores/post.ts` with localStorage persistence)

API client: `lib/api.ts` - typed fetch wrapper

UI components: Custom components in `components/ui/` (no external component library)

### Data Flow

1. Frontend calls `api.analyze(content)` via React Query hooks
2. API analyzes content against algorithm weights from `@postmaker/shared`
3. Returns `PostAnalysis` with scores, metrics, suggestions, warnings
4. Frontend displays via Zustand store and UI components

### Environment

API requires:
- `DATABASE_URL` - PostgreSQL connection string
- `GEMINI_API_KEY` - For AI features (optional, features degrade gracefully)
