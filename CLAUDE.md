# CLAUDE.md - Repository Exploration

**Last Updated:** 2025-01-11
**Explored By:** Claude (Sonnet 4.5)

---

## Project Identity

**Name:** Freedom Stack v2
**Version:** 0.0.2
**Status:** Work in Progress (WIP) - improving continuously
**GitHub:** cameronapak/freedom-stack-v2
**Purpose:** A lightweight, modern web development stack that prioritizes accessibility, financial freedom, and self-hosting capabilities

---

## Project Philosophy & Design Principles

The stack is built around 5 core criteria:

1. **Elementary & Vanilla:** Simple to learn and use
2. **Financially Accessible:** Free-tier hosting without credit cards (Netlify free tier)
3. **Self-Hostable:** Complete control over deployment
4. **Sustainable:** Uses only actively maintained packages
5. **AI-Friendly:** Works seamlessly with AI code editor assistants (supports Cursor's @basecoat-ui.mdc)

---

## Technology Stack

### Frontend Framework

- **Astro 5.12.0** - Static/hybrid SSR framework with file-based routing
- **Server Output Mode** - Configured for full-stack capabilities

### UI & Styling

- **TailwindCSS v4.1.8** - Utility-first CSS framework
- **Basecoat UI** - Component library (shadcn/ui alternative without React)
- **Basecoat CSS** - Pre-built component styles

### Client-Side Interactivity

- **Alpine.js 3.14.9** - Lightweight JavaScript framework
- **Alpine AJAX 0.12.2** - AJAX plugin for Alpine (HTMX alternative)

### Backend Framework

- **Bknd 0.15.0** - Lightweight, self-hostable backend with built-in features:
  - User authentication and management
  - Database management
  - Media file management
  - Admin dashboard
  - API generation

### Database

- **libSQL** (via @libsql/client 0.15.9) - SQLite-compatible database
- **Default:** Local SQLite database at `.astro/content.db`
- **Production:** Recommended Turso service for remote hosting

### Deployment

- **Netlify Adapter** (@astrojs/netlify 6.5.1)
- Can be deployed anywhere

### Development Tools

- **Prettier 3.5.3** - Code formatting with Astro and Tailwind plugins
- **TypeScript** - Strict mode enabled
- **Node.js 22.14.0** (via .nvmrc)

---

## Core Architecture

### Application Request Flow

```
HTTP Request
    ↓
middleware.ts (bknd initialization & routing)
    ↓
Handles /api/* and /admin routes → Bknd API
    ├─ /api/auth/* - Authentication endpoints
    ├─ /api/data/* - Database operations
    └─ /api/media/* - File uploads
    ↓
Other routes → Astro pages
```

### Key Configuration Files

#### bknd.config.ts (3,753 bytes)

- Defines database schema with 2 entities: `posts` and `comments`
- Posts → Comments: one-to-many relationship
- Initial auth config (allow register, JWT tokens, role-based permissions)
- Media adapter for file uploads
- Seed data with demo users and posts
- TypeScript auto-generation plugin

#### astro.config.mjs

- Server output mode
- TailwindCSS Vite plugin integration
- Netlify adapter
- Trailing slash: ignore (both /admin and /admin/ work)

#### tsconfig.json

- Astro strict TypeScript rules
- Path alias: @/_ maps to src/_

---

## Directory Structure

```
/
├── .astro/                     # Astro build cache & generated types
├── public/                     # Static assets & generated files
│   ├── favicon.svg
│   ├── bknd/                   # Bknd admin UI assets (generated)
│   └── temp/uploads/           # Media uploads directory
├── src/
│   ├── components/             # Reusable Astro components
│   │   ├── Authenticated.astro # Auth-aware conditional rendering
│   │   └── Header.astro        # Navigation header with auth UI
│   ├── layouts/
│   │   └── Layout.astro        # Root layout with AlpineJS initialization
│   ├── pages/                  # File-based routing (Astro)
│   │   ├── index.astro         # Homepage - lists posts
│   │   ├── login.astro         # Login page with demo credentials (dev-only)
│   │   ├── logout.astro        # Logout handler
│   │   ├── register.astro      # User registration
│   │   ├── 404.astro           # Error page
│   │   └── posts/[...slug]/
│   │       └── index.astro     # Dynamic post detail page
│   ├── styles/
│   │   └── global.css          # TailwindCSS imports & custom components
│   ├── assets/
│   │   └── lucide/             # Icon assets
│   ├── bknd.ts                 # Bknd API helper functions
│   ├── bknd-types.d.ts         # Auto-generated DB types (via plugin)
│   ├── middleware.ts           # Request middleware for bknd
│   └── env.d.ts                # TypeScript environment declarations
├── bknd.config.ts              # Bknd configuration (database, auth, media)
├── astro.config.mjs            # Astro configuration
├── tsconfig.json               # TypeScript configuration
├── package.json                # Dependencies and scripts
├── .prettierrc                  # Prettier formatting rules
├── .nvmrc                       # Node version specification
├── .gitignore                  # Git ignore rules
└── README.md                    # Project documentation
```

---

## Database Schema

### Posts Table

```typescript
- id: number (auto-generated)
- title: string (required)
- slug: string (required)
- content?: string
- views?: number
- comments?: Comments[] (relation)
```

### Comments Table

```typescript
- id: number (auto-generated)
- content?: string
- posts_id?: number (foreign key)
- posts?: Posts (relation)
```

### Indices

- posts.title (indexed)
- posts.slug (unique indexed)

### Seed Data

- Admin user: admin@example.com / password
- Default user: user@example.com / password
- Sample post about Freedom Stack v2

---

## Routes & Pages

| Route         | Component                             | Purpose                                      |
| ------------- | ------------------------------------- | -------------------------------------------- |
| /             | src/pages/index.astro                 | Blog homepage - lists all posts with preview |
| /posts/[slug] | src/pages/posts/[...slug]/index.astro | Post detail page with view counter           |
| /login        | src/pages/login.astro                 | Login form (shows demo creds in dev mode)    |
| /register     | src/pages/register.astro              | Registration form                            |
| /logout       | src/pages/logout.astro                | Logout handler - clears session              |
| /admin        | (Bknd generated)                      | Admin dashboard for data management          |
| /404          | src/pages/404.astro                   | Error page (rickroll easter egg!)            |

---

## Key Components

### Authenticated.astro

- Conditional slot rendering based on authentication status
- Two slots: default (authenticated) and fallback (not authenticated)
- Usage example: Wraps content that should only show to logged-in users

### Header.astro

- Navigation bar with bird icon logo
- Shows login/register buttons for unauthenticated users
- Shows admin link and logout button for authenticated users

### Layout.astro

- Root layout wrapping all pages
- Initializes AlpineJS and Alpine AJAX
- Handles flash messages from bknd errors
- Global CSS imports

---

## Authentication & Authorization

### Built with Bknd Auth

- Email/password authentication
- JWT tokens with configurable issuer/secret
- Two roles: `admin` (implicit allow all) and `default` (permission-based)
- Guard enabled for protected routes
- Register allowed by default

### Default Permissions (for default role)

- system.access.api
- data.database.sync
- data.entity.\* (create, read, update, delete)
- media.file.\* (upload, read, delete, list)

---

## Main Dependencies

| Package          | Purpose            | Version       |
| ---------------- | ------------------ | ------------- |
| astro            | Framework          | ^5.12.0       |
| bknd             | Backend            | 0.15.0        |
| alpinejs         | JS Framework       | ^3.14.9       |
| alpine-ajax      | AJAX Plugin        | ^0.12.2       |
| tailwindcss      | CSS Framework      | ^4.1.8        |
| basecoat-css     | UI Components      | ^0.1.2        |
| @astrojs/netlify | Deployment Adapter | ^6.5.1        |
| @libsql/client   | Database Client    | 0.15.9 (peer) |

**Development Tools:**

- prettier, prettier-plugin-astro, prettier-plugin-tailwindcss

---

## Build & Development Workflow

### NPM Scripts

```json
{
  "predev": "bknd copy-assets --out public/bknd --clean",
  "dev": "astro dev",
  "prebuild": "bknd copy-assets --out public/bknd --clean",
  "build": "astro build",
  "preview": "astro preview",
  "format": "prettier -w .",
  "db:reset-local": "rm .astro/content.db"
}
```

### Development Workflow

1. Run `npm install`
2. Run `npm run dev` to start dev server
3. Bknd auto-initializes database and admin UI
4. Access app at localhost:3000

---

## Environment Variables

Defined in `src/env.d.ts`:

- `DB_LIBSQL_URL` - Remote database URL (optional, for Turso)
- `DB_LIBSQL_TOKEN` - Remote database auth token (optional, for Turso)

Falls back to local SQLite at `.astro/content.db` if not provided.

---

## Main Entry Points

### 1. middleware.ts (src/middleware.ts)

- Request handler initialization
- Routes API/admin requests to bknd
- Routes other requests to Astro pages
- Handles error redirects with flash messages

### 2. Layout.astro (src/layouts/Layout.astro)

- Root HTML template
- Loads all styles and scripts
- Initializes AlpineJS runtime
- Manages global head tags

### 3. bknd.config.ts (root)

- Configuration definition for backend
- Database schema
- Authentication rules
- Media handling
- Seed data

---

## Recent Git History

Last 5 commits:

1. `df722b5` - feat(login): hide dev credentials block in production
2. `b60af73` - feat: switch to libsql client and add env vars for remote db
3. `ea962e9` - update readme
4. `f806edc` - style: fix formatting and remove unused ctx parameter
5. `e2ea4fb` - fix: update basecoat-ui symlink to use relative path

**Current Branch:** main
**Status:** Clean working directory

---

## Code Quality & Conventions

- **Code Style:** Prettier formatting (spaces, trailing comma: none)
- **Type Safety:** Strict TypeScript
- **No External React:** All UI is vanilla/Alpine-based
- **Component Library:** Tailwind + Basecoat (no JSX/React)
- **Auto-generated Types:** bknd plugin generates database types in `src/bknd-types.d.ts`
- **AI-Friendly:** Designed for AI code editor assistance

### Frontend Development Approach

When working on the frontend, follow these guidelines:

1. **Basecoat UI First**
   - Use Basecoat CSS components (`btn`, `card`, `input`, `badge`, etc.)
   - Leverage Basecoat's pre-built styles instead of custom components
   - Reference [Basecoat documentation](https://basecoatui.com) for available components

2. **No Color Customization**
   - Do NOT modify colors or theme variables
   - Work with the default Basecoat/Tailwind color palette
   - Focus on using semantic color classes (`text-primary`, `bg-muted`, etc.)

3. **Focus on Layout & Components**
   - Prioritize layout improvements (spacing, hierarchy, grid systems)
   - Improve component structure and organization
   - Enhance usability through better UX patterns
   - Add icons for visual clarity (inline SVG from Lucide)

4. **Alpine.js Integration**
   - Use Alpine.js for client-side interactivity
   - Keep logic in `x-data` blocks instead of separate `<script>` tags
   - Use Alpine directives (`@click`, `x-show`, `x-model`, etc.)
   - Avoid inline `onclick` handlers - use Alpine event handling

5. **Component Patterns**
   - Separate content into logical cards/sections
   - Use consistent spacing (`space-y-*`, `gap-*`)
   - Add loading states for async operations
   - Replace native alerts/confirms with custom modals

6. **Accessibility & UX**
   - Provide visual feedback (loading states, disabled states)
   - Use proper semantic HTML
   - Include helpful placeholder text
   - Add icons to improve scannability

---

## Key Technical Decisions

1. **Why Astro?** Server-side rendering with minimal client JS, file-based routing
2. **Why Alpine.js?** Lightweight reactivity without heavy framework overhead
3. **Why Bknd?** Self-hostable backend without vendor lock-in
4. **Why libSQL/Turso?** SQLite compatibility with edge hosting support
5. **Why Basecoat UI?** React-free component library with Tailwind integration

---

## Development Notes

### Local Database

- Location: `.astro/content.db`
- Auto-created on first run
- Reset with: `npm run db:reset-local`

### Admin Dashboard

- Accessible at: `/admin`
- Requires authentication
- Auto-generated by Bknd
- Assets copied to `public/bknd/` during build

### Type Generation

- Database types auto-generated in `src/bknd-types.d.ts`
- Updated when schema changes in `bknd.config.ts`
- Provides full TypeScript intellisense for DB entities

---

## Common Tasks

### Adding a New Page

1. Create `.astro` file in `src/pages/`
2. Use `Layout.astro` as wrapper
3. Access `locals.bknd` for API calls

### Adding a Database Entity

1. Edit `bknd.config.ts` schema
2. Run dev server to regenerate types
3. Access via `locals.bknd.data()`

### Deploying to Netlify

1. Set environment variables in Netlify dashboard
2. Push to connected Git repository
3. Netlify auto-builds and deploys

### Using Remote Database (Turso)

1. Create Turso database
2. Set `DB_LIBSQL_URL` and `DB_LIBSQL_TOKEN`
3. Restart dev server

---

## Project Status

**Current Version:** 0.0.2
**Maturity:** Work in Progress
**Production Ready:** Not yet (actively improving)
**Node Version:** 22.14.0

The project is under active development with focus on improving the developer experience and documentation.
