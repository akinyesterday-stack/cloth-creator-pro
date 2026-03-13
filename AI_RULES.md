# AI Development Rules - Kumaş Tedarik Sistemi

This document outlines the technical stack and development standards for the Kumaş Tedarik Sistemi application.

## Tech Stack

- **Framework**: React 18 with TypeScript and Vite for a fast, type-safe development experience.
- **Styling**: Tailwind CSS for utility-first styling and responsive design.
- **UI Components**: shadcn/ui (built on Radix UI) for accessible, high-quality pre-built components.
- **Backend & Auth**: Supabase for database management, authentication, and real-time data synchronization.
- **State Management**: TanStack Query (React Query) for efficient server-state management and caching.
- **Forms**: React Hook Form combined with Zod for robust schema-based form validation.
- **Icons**: Lucide React for a consistent and modern iconography set.
- **Notifications**: Sonner for sleek, non-blocking toast notifications.
- **Data Handling**: ExcelJS for spreadsheet generation and Leaflet for interactive map features.
- **Exporting**: html2canvas and jsPDF for generating images and PDF documents from UI elements.

## Library Usage Rules

### UI & Styling
- **Components**: Always check `@/components/ui` for existing shadcn/ui components before creating new ones.
- **Icons**: Exclusively use `lucide-react` icons.
- **Tailwind**: Use Tailwind CSS classes for all layout and styling needs. Avoid custom CSS files unless absolutely necessary.
- **Responsive Design**: Ensure all new components are mobile-friendly using Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`, etc.).

### Data & Backend
- **Supabase**: Use the pre-configured client in `@/integrations/supabase/client`.
- **Fetching**: Use `@tanstack/react-query` hooks (`useQuery`, `useMutation`) for all database interactions to handle loading and error states consistently.
- **Authentication**: Use the custom `useAuth` hook from `@/hooks/useAuth` to access user data and permissions.

### Forms & Validation
- **Validation**: Define Zod schemas for all form inputs to ensure data integrity.
- **Implementation**: Use `react-hook-form` for managing form state and submission.

### Utilities
- **Dates**: Use `date-fns` for all date formatting and manipulation.
- **Toasts**: Use the `toast` function from `sonner` to provide user feedback.
- **Class Merging**: Use the `cn` utility from `@/lib/utils` for conditional class merging.

## Development Principles
- **Component Isolation**: Create small, focused components. New components should be placed in `src/components/` in their own files.
- **Type Safety**: Maintain strict TypeScript typing for all props, state, and API responses.
- **Real-time**: Leverage Supabase's real-time capabilities for features like notifications and chat.