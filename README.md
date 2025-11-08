# Axperiments

A clean Astro + Bknd starter application based on Freedom Stack v2.

## Stack

- [Astro](https://astro.build) - Web framework
- [Alpine.js](https://alpinejs.dev) + [Alpine AJAX](https://alpine-ajax.js.org/) - Client-side interactions
- [TailwindCSS v4](https://tailwindcss.com/) + [Basecoat UI](https://basecoatui.com/) - Styling
- [Bknd](https://bknd.io) - Backend (Auth, Database, Media)
- [Netlify](https://www.netlify.com) - Deployment (or host anywhere)

## Quick Start

### Install Dependencies

```bash
npm install
```

### Setup Local Database

Remove any existing database:

```bash
npm run db:reset-local
```

### Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:4321`

### Default Users

The seed script creates two default users:

- **Admin**: `admin@example.com` / `password`
- **User**: `user@example.com` / `password`

## Database

Development uses a local libSQL database at `.astro/content.db`.

For production, configure environment variables:
- `DB_LIBSQL_URL` - Database URL
- `DB_LIBSQL_TOKEN` - Auth token

Recommended production database: [Turso](https://tur.so)

## Documentation

- [BKND_CRUD_GUIDE.md](./BKND_CRUD_GUIDE.md) - Complete guide for building CRUD apps
- [CLAUDE.md](./CLAUDE.md) - AI assistant guidelines

## Project Structure

```
├── src/
│   ├── components/     # Reusable Astro components
│   ├── layouts/        # Page layouts
│   ├── lib/
│   │   └── services/   # Business logic services
│   ├── pages/          # Routes and API endpoints
│   │   ├── api/        # API routes
│   │   └── *.astro     # Page routes
│   ├── styles/         # Global styles
│   ├── bknd.ts         # Bknd API helper
│   └── middleware.ts   # Astro middleware
├── bknd.config.ts      # Bknd configuration
└── astro.config.mjs    # Astro configuration
```

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run format       # Format code with Prettier
npm run db:reset-local  # Reset local database
```

## Based On

[Freedom Stack v2](https://github.com/cameronapak/freedom-stack-v2) by Cameron Pak
