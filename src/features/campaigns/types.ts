import { COUNTRIES } from '@/shared/data/countries'
import type { TKey } from '@/shared/utils/translations'

export type CampaignStatus = 'draft' | 'in_progress' | 'completed' | 'archived'
export type CampaignStepType = 'segmentation' | 'ppc_viability' | 'funnel' | 'content_strategy' | 'meta_ads' | 'google_ads' | 'linkedin_ads'
export type CampaignStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'stale'
export type CampaignAdPlatform = 'meta' | 'google' | 'linkedin'
export type FunnelStage = 'TOFU' | 'MOFU' | 'BOFU'
/** Output language for all campaign-generated content (B9/M-M28). */
export type CampaignLanguage = 'en' | 'fa' | 'ar'

export interface CampaignBrand {
  brand_uuid: string
  company_name: string
  website_url: string
  location: string | null
  selected_industry: { industry_uuid: string; name: string } | null
}

export interface Campaign {
  campaign_uuid: string
  brand: CampaignBrand | null
  brand_uuid?: string
  name: string
  status: CampaignStatus
  current_step: CampaignStepType
  /** Output language echoed everywhere by the backend (default 'en'). */
  language: CampaignLanguage
  total_budget: number | string | null
  currency: string
  segmentation_completed: boolean
  ppc_viability_completed: boolean
  funnel_completed: boolean
  content_strategy_completed: boolean
  meta_ads_completed: boolean
  google_ads_completed: boolean
  linkedin_ads_completed: boolean
  context_payload: Record<string, unknown>
  /** Reused brand-analysis data (M-H8); null until the backend computes it. */
  brand_context?: BrandContext | null
  summary: Record<string, unknown>
  steps_count: number
  created_at: string
  updated_at: string
}

// ── Reused brand-analysis context (M-H8) ───────────────────

export interface BrandContextPersona {
  segment: 'primary' | 'secondary' | string
  demographics?: unknown
  psychographics?: unknown
  pain_points?: string[] | null
  motivations?: string[] | null
  summary?: string | null
  /** Secondary segments sometimes carry `description` instead of `summary`. */
  description?: string | null
}

export interface BrandContext {
  available: boolean
  /**
   * Real backend shape (build_brand_context): the FULL target_audience object
   * — `{ primary: segment, secondary: segment }` — NOT a flat summary with
   * its own summary/pain_points/motivations. Personas below mirror the same
   * segments, so the panel renders them via the persona cards.
   */
  audience_summary?: Record<string, unknown> | null
  personas?: BrandContextPersona[] | null
  services?: string[] | null
}

/** Normalized read of campaign.brand_context — null when unavailable. */
export function resolveBrandContext(campaign: Pick<Campaign, 'brand_context'> | null | undefined): BrandContext | null {
  const bc = campaign?.brand_context
  return bc && bc.available ? bc : null
}

export interface CampaignCreatePayload {
  brand_uuid: string
  name?: string
  total_budget?: number
  currency?: string
  language?: CampaignLanguage
  context_payload?: Record<string, unknown>
}

export interface CampaignStep {
  campaign_step_uuid: string
  campaign: string
  step_type: CampaignStepType
  status: CampaignStepStatus
  request_payload: Record<string, unknown>
  input_snapshot: Record<string, unknown>
  response_payload: Record<string, unknown>
  summary: Record<string, unknown>
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  /** Review decision persisted on the latest run ('' = not reviewed yet). */
  review_status?: 'approved' | 'rejected' | ''
  reject_reason?: string | null
  reviewed_at?: string | null
  created_at: string
  updated_at: string
}

export type CampaignAdReviewStatus = 'approved' | 'rejected'

export interface CampaignAd {
  campaign_ad_uuid: string
  campaign: string
  platform: CampaignAdPlatform
  funnel_stage: string | null
  persona: string | null
  funnel_context: Record<string, unknown>
  data: Record<string, unknown>
  /** Review decision persisted server-side on data; null = not reviewed yet. */
  review_status: CampaignAdReviewStatus | null
  reject_reason: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface AdsStrategyPayload {
  platform: CampaignAdPlatform
}

export interface GenerateAdPayload {
  persona_name: string
  funnel_stage: FunnelStage
  platform: CampaignAdPlatform
  quantity?: number
}

export type VisualAspectRatio = '1:1' | '2:3' | '3:2' | '4:7' | '7:4'
export type VisualQuality = 'auto' | 'low' | 'medium' | 'high'
export type VisualStatus = 'completed' | 'failed'

export interface GenerateVisualsPayload {
  ad_uuids: string[]
  aspect_ratio?: VisualAspectRatio
  quality?: VisualQuality
}

export interface GeneratedVisual {
  campaign_ad_uuid: string
  platform: string | null
  persona: string | null
  funnel_stage: string | null
  visual_id?: string
  aspect_ratio: string
  size: string
  quality: string
  visual_summary: string
  prompt?: string
  success: boolean
  visual_status: VisualStatus
  image_url: string | null
  content_type?: string | null
  file_size?: number
  generated_at?: string | null
  revised_prompt: string | null
  error: string | null
}

export interface AdGenerateResult {
  success: boolean
  campaign: Campaign
  ads: CampaignAd[]
}

export interface VisualGenerateResult {
  success: boolean
  campaign: Campaign
  generated_count: number
  results: GeneratedVisual[]
}

/** GET /campaigns/{uuid}/visuals/ — every persisted visual (success + failure). */
export interface CampaignVisualsListResult {
  success: boolean
  results: GeneratedVisual[]
}

export interface ClearAdsResult {
  success: boolean
  deleted_count: number
  campaign: Campaign
}

// ── Ad review / manual edit / refine (F13) ────────────────

export interface ReviewAdPayload {
  decision: 'approved' | 'rejected'
  /** Required when decision is "rejected"; must be absent when "approved". */
  reject_reason?: string
}

/** Manual copy edit (AdCopyEditor) — any subset, values must be non-blank. */
export interface PatchAdPayload {
  headline?: string
  primary_text?: string
  description?: string
  cta?: string
}

export interface RefineAdPayload {
  feedback: string
}

export interface CampaignAdsListResult {
  success: boolean
  ads: CampaignAd[]
}

export interface AdReviewResult {
  success: boolean
  ad: CampaignAd
}

export interface AdUpdateResult {
  success: boolean
  ad: CampaignAd
}

export interface AdRefineResult {
  success: boolean
  campaign: Campaign
  ad: CampaignAd
  ads: CampaignAd[]
}

export interface StepApproveResult {
  success: boolean
  campaign: Campaign
  step: CampaignStep
}

// ── Platform recommendation (F15/C5) ──────────────────────

export interface PlatformRecommendation {
  platform: CampaignAdPlatform
  /** 0–100 suitability score from the backend recommender. */
  suitability_score: number
  recommended: boolean
  rationale: string
  key_strengths: string[]
  risks: string[]
  requirements: string[]
}

export interface PlatformBudgetFit {
  assessment: string
  notes: string
  suggested_channel_count: number | null
}

export interface PlatformRole {
  platform: CampaignAdPlatform
  role: string
  funnel_stage: string
}

export interface PlatformChannelStrategy {
  summary: string
  platform_roles: PlatformRole[]
  cross_platform_relationships: string[]
}

export interface PlatformWarning {
  type: string
  message: string
  platform: string | null
}

/** POST /campaigns/{uuid}/recommend-platforms/ response, also persisted into context_payload. */
export interface PlatformRecommendationsResult {
  success: boolean
  campaign_uuid?: string
  recommendations: PlatformRecommendation[]
  budget_fit?: PlatformBudgetFit | null
  channel_strategy?: PlatformChannelStrategy | null
  warnings?: PlatformWarning[]
}

/**
 * Read the persisted recommendation result off a campaign's context_payload
 * (the backend stores the recommend-platforms result there) — null when absent.
 */
export function getPlatformRecommendations(
  campaign: Pick<Campaign, 'context_payload'> | null | undefined,
): PlatformRecommendationsResult | null {
  const recs = (campaign?.context_payload as { platform_recommendations?: unknown } | undefined)
    ?.platform_recommendations
  if (!recs || typeof recs !== 'object') return null
  const result = recs as PlatformRecommendationsResult
  return Array.isArray(result.recommendations) && result.recommendations.length > 0 ? result : null
}

// ── Step review / refine (reject + feedback re-run) ────────

/** Body of POST /campaigns/{uuid}/steps/{step_type}/review/. */
export interface StepReviewPayload {
  decision: 'approved' | 'rejected'
  /** Required when decision is "rejected"; must be absent/empty when "approved". */
  reject_reason?: string
}

export interface StepReviewResult {
  success: boolean
  step: CampaignStep
}

/** Optional refinement feedback accepted by every step run endpoint (≤1000 chars). */
export interface StepRefineOptions {
  refinement_feedback?: string
}

export interface SegmentationRunPayload {
  business_type?: string
  location?: string
  country?: string
  city?: string
  product_description?: string
  include_deep_research?: boolean
  /** Selected persona names; empty/absent = target all personas (server-side filter). */
  personas?: string[]
  refinement_feedback?: string
}

export interface StepResult {
  campaign: Campaign
  step: CampaignStep
}

export interface AdsStrategyRun {
  campaign_step_uuid: string
  step_type: 'meta_ads' | 'google_ads' | 'linkedin_ads'
  platform: CampaignAdPlatform
  status: CampaignStepStatus
  request_payload: Record<string, unknown>
  response_payload: Record<string, unknown>
  summary: Record<string, unknown>
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface AdsStrategyListResponse {
  success: boolean
  strategies: AdsStrategyRun[]
}

/**
 * Completed vs applicable step count (MOM باگ۶): the 4 base steps plus only
 * the platforms the user actually selected. If platform selection hasn't
 * happened yet, all three platform flags count so early-campaign progress is
 * unchanged (a partial-platform campaign can still reach 100%).
 */
export function getCampaignStepCounts(campaign: Campaign): { completed: number; total: number } {
  const baseFlags = [
    campaign.segmentation_completed,
    campaign.ppc_viability_completed,
    campaign.funnel_completed,
    campaign.content_strategy_completed,
  ]
  const ctx = campaign.context_payload as { selected_platforms?: string[] } | undefined
  const selectedPlatforms = ctx?.selected_platforms ?? []
  const platformFlags = selectedPlatforms.length
    ? selectedPlatforms.map((p) => campaign[`${p}_ads_completed` as keyof Campaign])
    : [
        campaign.meta_ads_completed,
        campaign.google_ads_completed,
        campaign.linkedin_ads_completed,
      ]
  const flags = [...baseFlags, ...platformFlags]
  return { completed: flags.filter(Boolean).length, total: flags.length }
}

export function getCampaignProgress(campaign: Campaign): number {
  const { completed, total } = getCampaignStepCounts(campaign)
  return Math.round((completed / total) * 100)
}

export function areAllPlatformAdsComplete(campaign: Campaign): boolean {
  const ctx = campaign.context_payload as any
  const platforms: string[] = ctx?.selected_platforms ?? []
  if (platforms.length === 0) return false
  return platforms.every((p) => {
    const flag = `${p}_ads_completed` as keyof Campaign
    return campaign[flag]
  })
}

// ── PPC service cards (MOM 11.2 — expandable details) ─────

export interface PpcServiceDetailRow { labelKey: TKey; text: string }

function ppcDetailValue(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() ? v.trim() : null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v)) {
    const items = v.filter((x): x is string => typeof x === 'string' && !!x.trim())
    return items.length ? items.join(', ') : null
  }
  if (typeof v === 'object') {
    const entries = Object.entries(v as Record<string, unknown>).map(
      ([k, val]) => `${k}: ${typeof val === 'object' ? JSON.stringify(val) : String(val)}`,
    )
    return entries.length ? entries.join(' · ') : null
  }
  return null
}

/**
 * Detail rows for an expandable PPC service card (MOM 11.2): reads whatever
 * detail keys exist on the service object — the BPC-scores shape (`reasoning`,
 * `classification`), the opportunity-ranking shape (`priority_level`) and the
 * PPC-blueprint shape (`key_platforms`, `campaign_objective`, `key_risk`, …) —
 * and returns only the ones carrying a usable value. Labels are localized by
 * the caller via `t(row.labelKey)`.
 */
export function ppcServiceDetailRows(svc: Record<string, unknown> | null | undefined): PpcServiceDetailRow[] {
  if (!svc || typeof svc !== 'object') return []
  const rows: PpcServiceDetailRow[] = []
  const push = (labelKey: TKey, ...values: unknown[]) => {
    for (const v of values) {
      const text = ppcDetailValue(v)
      if (text) {
        rows.push({ labelKey, text })
        return
      }
    }
  }
  push('ppc.detail.priority', svc.priority_level, svc.priority)
  push('ppc.detail.platforms', svc.key_platforms, svc.recommended_platforms, svc.platforms)
  push('ppc.detail.objective', svc.campaign_objective, svc.objective)
  push('ppc.detail.valueProp', svc.unique_value_proposition, svc.value_proposition)
  push('ppc.detail.budget', svc.budget_allocation, svc.recommended_budget, svc.budget)
  push('ppc.detail.reasoning', svc.reasoning, svc.rationale, svc.notes, svc.analysis)
  push('ppc.detail.risk', svc.key_risk, svc.risk)
  return rows
}

/** Whether a service card has anything to reveal when expanded. */
export function hasPpcServiceDetails(svc: Record<string, unknown> | null | undefined): boolean {
  if (!svc || typeof svc !== 'object') return false
  if (typeof svc.description === 'string' && svc.description.trim()) return true
  if (Array.isArray(svc.pros) && svc.pros.length) return true
  if (Array.isArray(svc.cons) && svc.cons.length) return true
  return ppcServiceDetailRows(svc).length > 0
}

/**
 * Service list from a PPC viability payload: prefers the BPC scores, then the
 * opportunity ranking, then any services-like list. Each row is enriched with
 * its matching `ppc_blueprints` entry (joined by service name) so the
 * expandable cards can surface platform / objective / risk details.
 */
export function ppcServiceList(data: Record<string, unknown> | null | undefined): Record<string, unknown>[] {
  if (!data || typeof data !== 'object') return []
  const d = data as Record<string, any>
  const svcs = d.brand_trust_analysis?.services_bpc_scores
    ?? d.strategic_prioritization?.ppc_opportunity_ranking
    ?? d.services
    ?? d.platforms
    ?? d.recommendations
    ?? []
  const items: unknown[] = Array.isArray(svcs) ? svcs : []
  return mergePpcBlueprints(
    items.filter((s): s is Record<string, unknown> => !!s && typeof s === 'object'),
    d,
  )
}

/**
 * Join each service row with its matching `ppc_blueprints` entry (case-
 * insensitive on the service name) so expandable cards keep their platform /
 * objective / risk details whichever list the rows came from.
 */
export function mergePpcBlueprints(
  rows: Record<string, unknown>[],
  data: Record<string, unknown> | null | undefined,
): Record<string, unknown>[] {
  const blueprints = (data as Record<string, any> | null | undefined)?.strategic_prioritization?.ppc_blueprints
  if (!Array.isArray(blueprints) || !blueprints.length) return rows
  const byName = new Map(
    blueprints.map((b: any) => [String(b?.service ?? b?.name ?? '').toLowerCase(), b]),
  )
  return rows.map((row) => {
    const key = String((row as any).service ?? (row as any).name ?? '').toLowerCase()
    const bp = byName.get(key)
    return bp ? { ...bp, ...row } : row
  })
}

export function getCampaignStepStatuses(campaign: Campaign): Record<CampaignStepType, 'completed' | 'pending'> {
  return {
    segmentation: campaign.segmentation_completed ? 'completed' : 'pending',
    ppc_viability: campaign.ppc_viability_completed ? 'completed' : 'pending',
    funnel: campaign.funnel_completed ? 'completed' : 'pending',
    content_strategy: campaign.content_strategy_completed ? 'completed' : 'pending',
    meta_ads: campaign.meta_ads_completed ? 'completed' : 'pending',
    google_ads: campaign.google_ads_completed ? 'completed' : 'pending',
    linkedin_ads: campaign.linkedin_ads_completed ? 'completed' : 'pending',
  }
}

// ── Total budget + funnel split (F16) ─────────────────────

/** "USD 1,000" style display for a campaign's total budget; null when unset. */
export function formatCampaignBudget(campaign: Pick<Campaign, 'total_budget' | 'currency'>): string | null {
  const amount = Number(campaign.total_budget)
  if (campaign.total_budget == null || !Number.isFinite(amount)) return null
  return `${campaign.currency || 'USD'} ${amount.toLocaleString()}`
}

export interface FunnelBudgetSplitEntry {
  percent: number
  /** total_budget × percent / 100 — null when the campaign has no budget set. */
  amount: number | null
}

/**
 * Funnel-stage budget split from campaign.summary.funnel percentages
 * (tofu/mofu/bofu_budget_percentage). Null when the funnel step hasn't
 * produced a split yet.
 */
export function getFunnelBudgetSplit(
  campaign: Pick<Campaign, 'summary' | 'total_budget' | 'currency'>,
): Record<'tofu' | 'mofu' | 'bofu', FunnelBudgetSplitEntry> | null {
  const funnel = (campaign.summary as { funnel?: Record<string, unknown> } | undefined)?.funnel
  if (!funnel) return null
  const read = (key: string): number | null => {
    const raw = funnel[`${key}_budget_percentage`]
    const n = Number(raw)
    return raw != null && Number.isFinite(n) ? n : null
  }
  const tofu = read('tofu')
  const mofu = read('mofu')
  const bofu = read('bofu')
  if (tofu == null && mofu == null && bofu == null) return null
  const total = Number(campaign.total_budget)
  const hasTotal = campaign.total_budget != null && Number.isFinite(total)
  const entry = (percent: number | null): FunnelBudgetSplitEntry => ({
    percent: percent ?? 0,
    // A missing stage percent is treated as a 0% share; round to 2 decimals
    amount: hasTotal ? Math.round(total * (percent ?? 0)) / 100 : null,
  })
  return { tofu: entry(tofu), mofu: entry(mofu), bofu: entry(bofu) }
}

// ── Funnel per-persona stage fields (additive backend contract) ──

/**
 * One stage×persona message inside funnel_context.persona_profiles[].messages.
 * `cta`, `kpi` and `budget_share` are ADDITIVE fields from FunnelResultSerializer —
 * older runs don't have them, so readers must treat them as optional/unknown.
 */
export interface FunnelPersonaStageMessage {
  headline_angle?: string | null
  body_approach?: string | null
  /** Call to action for this persona at this stage (string or { text }). */
  cta?: unknown
  /** Key performance indicator for this persona at this stage. */
  kpi?: unknown
  /** Percent (0–100) of that stage's budget allocated to this persona. */
  budget_share?: number | string | null
  [key: string]: unknown
}

export interface FunnelPersonaProfile {
  persona_name?: string | null
  persona_summary?: string | null
  messages?: Record<string, FunnelPersonaStageMessage | null | undefined>
}

/**
 * Defensive reader for the additive funnel text fields (cta / kpi): accepts a
 * plain string or a { text | value | name | description } object; null when
 * absent/empty so callers can hide the chip on older runs.
 */
export function readFunnelTextField(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() ? value : null
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    for (const key of ['text', 'value', 'name', 'description']) {
      const candidate = record[key]
      if (typeof candidate === 'string' && candidate.trim()) return candidate
    }
  }
  return null
}

/** Defensive reader for budget_share: 0–100 number (numeric strings tolerated); null when absent/invalid. */
export function readFunnelBudgetShare(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(n) || n < 0 || n > 100) return null
  return n
}

/**
 * Backend-computed content item count (content strategy payload's
 * content_pieces_count); null when absent so callers can fall back to counting
 * the rendered items themselves.
 */
export function readContentPiecesCount(data: unknown): number | null {
  const n = Number((data as { content_pieces_count?: unknown } | null | undefined)?.content_pieces_count)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null
}

// ── Target market (country/city, F19) ─────────────────────

export interface TargetMarket {
  country: string
  city: string
}

/**
 * Initial country/city for the segmentation form: prefer the structured
 * target_market persisted by a previous run; otherwise best-effort seed the
 * country from the brand's free-text location.
 */
export function resolveTargetMarket(campaign: Pick<Campaign, 'context_payload' | 'brand'> | null | undefined): TargetMarket {
  const tm = (campaign?.context_payload as { target_market?: { country?: unknown; city?: unknown } } | undefined)?.target_market
  if (tm && typeof tm === 'object') {
    return {
      country: typeof tm.country === 'string' ? tm.country : '',
      city: typeof tm.city === 'string' ? tm.city : '',
    }
  }
  const brandLocation = campaign?.brand?.location
  if (brandLocation) {
    const match = COUNTRIES.find((c) => brandLocation.toLowerCase().includes(c.toLowerCase()))
    if (match) return { country: match, city: '' }
  }
  return { country: '', city: '' }
}

/** Compose the legacy free-text location ("City, Country") kept for display. */
export function composeLocation(tm: TargetMarket): string {
  const city = tm.city.trim()
  const country = tm.country.trim()
  if (city && country) return `${city}, ${country}`
  return city || country
}

// ── Ad copy reading (F13) ─────────────────────────────────

export interface AdCopyView {
  headline: string
  body: string
  description: string
  cta: string
  framework: string
  score: number
}

/**
 * Read displayable copy off a CampaignAd's data. Key aliases across the LLM
 * providers (headline|title, body|primary_text, cta|call_to_action) are
 * resolved with the manual-edit keys FIRST: once an ad is PATCHed, its
 * primary_text key holds the newest copy while a stale body lingers.
 */
export function getAdCopy(ad: Pick<CampaignAd, 'data'>): AdCopyView {
  const d = (ad.data ?? {}) as Record<string, unknown>
  const str = (v: unknown): string => (typeof v === 'string' ? v : '')
  return {
    headline: str(d.headline) || str(d.title),
    body: str(d.primary_text) || str(d.body) || str(d.description),
    description: str(d.description),
    cta: str(d.cta) || str(d.call_to_action),
    framework: str(d.framework) || str(d.creative_framework),
    score: Number(d.score ?? d.quality_score ?? 0) || 0,
  }
}
