# AI Rules & Project Standards

## Tech Stack
- **Framework**: TanStack Start (React 19) with Server-Side Rendering (SSR) capabilities.
- **Routing**: TanStack Router (file-based routing in `src/routes`).
- **Language**: TypeScript for strict type safety across the application.
- **Styling**: Tailwind CSS v4 using the new `@theme` configuration system.
- **UI Components**: shadcn/ui components built on Radix UI primitives.
- **Icons**: Lucide React for consistent and accessible iconography.
- **Data Visualization**: Recharts for interactive dashboards and KPIs.
- **Excel Processing**: SheetJS (`xlsx`) for client-side parsing of operation spreadsheets.
- **State Management**: Custom `useSyncExternalStore` implementation for `localStorage` persistence.
- **Build Tool**: Vite 7 with TanStack Router and Cloudflare plugins.

## Library & Implementation Rules

### 1. UI & Components
- **shadcn/ui**: Always use the existing components in `src/components/ui/`. Do not reinvent basic UI elements like buttons, inputs, or dialogs.
- **Layout**: Use the `AppShell` component for all pages to maintain sidebar and header consistency.
- **Tailwind**: Use utility classes for layout and spacing. Follow the theme variables defined in `src/styles.css` (e.g., `var(--color-primary)`).

### 2. State & Data
- **Persistence**: All application data must be stored in `localStorage` via `src/lib/store.ts`. Avoid adding a backend unless explicitly requested.
- **Parsing**: Use `src/lib/excel-parser.ts` for any logic related to spreadsheet ingestion.
- **Analytics**: Business logic and KPI calculations should reside in `src/lib/analytics.ts` to keep components clean.

### 3. Routing
- **File-based**: New routes must be created in `src/routes/`.
- **Navigation**: Use the `Link` component from `@tanstack/react-router` for internal navigation.

### 4. Icons & Visuals
- **Lucide**: Use `lucide-react` for all icons.
- **Charts**: Use `recharts` for data visualization. Maintain the color palette defined in `src/routes/index.tsx` (e.g., `STATUS_COLORS`).

### 5. Code Style
- **TypeScript**: Define explicit interfaces for all data structures in `src/lib/types.ts`.
- **Components**: Prefer small, functional components. Keep page components focused on layout and data orchestration.
- **Formatting**: Project uses Prettier and ESLint. Follow the existing patterns for imports and indentation.

## Operational Constraints
- **Deployment**: The app is optimized for Cloudflare Pages/Workers via TanStack Start.
- **Offline-First**: The app must remain functional without an internet connection after the initial load, as it relies on `localStorage`.