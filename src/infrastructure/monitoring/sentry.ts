// Sentry initialization stub.
// Install and configure when Sentry DSN is available:
//   npm install @sentry/vue
//
// import * as Sentry from '@sentry/vue'
// Sentry.init({
//   app,
//   dsn: import.meta.env.VITE_SENTRY_DSN,
//   integrations: [Sentry.browserTracingIntegration()],
//   tracesSampleRate: 0.1,
// })
//
// For now, errors are logged to console in development.

export function reportError(error: Error, context?: Record<string, unknown>) {
  console.error('[Error]', error, context)
}
