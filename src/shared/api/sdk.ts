// Auto-generated types from Django backend OpenAPI schema.
// Regenerate with: npx openapi-typescript http://localhost:8000/api/v1/schema/ -o src/shared/api/sdk.ts
//
// For now, this file re-exports hand-written types from the feature modules.
// Once the backend is running, run the generation command above and import from here instead.

export type { User, AuthTokens, LoginPayload, RegisterPayload, GoogleLoginPayload } from '@/features/auth/types'
export type { Brand, Industry, BrandCreatePayload, BrandAsset, BrandSocialMedia } from '@/features/brands/types'
