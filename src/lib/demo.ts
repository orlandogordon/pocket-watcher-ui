/**
 * Public portfolio demo mode (frontend todo #51 / backend #82).
 *
 * Gated entirely on the `VITE_DEMO_MODE` build flag so the normal home-server
 * build is unaffected. Set via `.env.demo` (loaded by `npm run build:demo`).
 *
 * In demo mode the app auto-logs-in as a seeded throwaway non-admin user, hides
 * the logout affordance, shows a persistent "live demo" banner, and restricts
 * uploads to a bundled set of sample statements. The creds are intentionally
 * public — the frontend is not a security boundary here (shared sandbox, daily
 * reset, registration blocked server-side).
 */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === '1';
export const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL ?? '';
export const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD ?? '';
