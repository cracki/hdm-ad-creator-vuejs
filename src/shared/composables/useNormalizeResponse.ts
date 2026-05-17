type AliasMap = Record<string, string[]>

const ADS_STRATEGY_ALIASES: AliasMap = {
  campaign_overview: ['overview', 'campaign_summary'],
  funnel_campaigns: ['campaigns', 'ad_campaigns', 'campaign_list'],
}

const ADS_STRATEGY_NESTED_ALIASES: AliasMap = {
  campaign_name: ['campaign_name_suggestion', 'name', 'title'],
  total_campaigns: ['number_of_campaigns', 'total_ads'],
  monthly_budget_range: ['estimated_monthly_budget_range', 'budget_range', 'monthly_budget'],
  primary_goal: ['primary_conversion_goal', 'main_objective', 'goal'],
  budget_percent: ['budget_allocation_percent', 'budget_percentage'],
  bidding_strategy: ['bidding', 'bid_strategy'],
  primary_kpi: ['kpi', 'main_kpi'],
  audience_targeting: ['audience', 'target_audience'],
  creative_strategy: ['creative', 'creative_direction'],
  call_to_action: ['cta'],
}

const DEEP_RESEARCH_ALIASES: AliasMap = {
  audience_insights: ['audience', 'customer_insights', 'target_audience_insights'],
  psychographic: ['psychographics', 'psychographic_profile'],
  demographic: ['demographics', 'demographic_profile'],
  behavioral: ['behavioral_patterns', 'behaviors'],
  pain_points: ['pains', 'pain', 'challenges'],
  desires: ['desire', 'wants'],
  motivations: ['motivation', 'drivers'],
  objections: ['objection', 'barriers', 'concerns'],
  messaging_recommendations: ['messaging', 'recommended_messaging', 'messaging_strategy'],
  brand_perceptions: ['brand_perception'],
  competitive_landscape: ['competitive', 'competitor_insights'],
  key_insights: ['insights', 'key_findings'],
  personas: ['persona', 'audience_personas'],
  segments: ['segment', 'audience_segments'],
  fears: ['fear', 'anxieties'],
  triggers: ['trigger', 'buying_triggers'],
  values: ['value', 'core_values'],
  advantages: ['advantage', 'competitive_advantages'],
  channels: ['channel', 'preferred_channels'],
}

type NormalizerContext = 'ads-strategy' | 'deep-research'

const CONTEXT_TOP_LEVEL: Record<NormalizerContext, AliasMap> = {
  'ads-strategy': ADS_STRATEGY_ALIASES,
  'deep-research': DEEP_RESEARCH_ALIASES,
}

function resolveKey(obj: Record<string, unknown>, canonical: string, aliases: string[]): { value: unknown; foundAs: string | null } {
  if (Object.prototype.hasOwnProperty.call(obj, canonical)) {
    return { value: obj[canonical], foundAs: canonical }
  }
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(obj, alias)) {
      return { value: obj[alias], foundAs: alias }
    }
  }
  return { value: undefined, foundAs: null }
}

function normalizeFlat(obj: Record<string, unknown>, aliases: AliasMap): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const consumedKeys = new Set<string>()

  for (const [canonical, aliasList] of Object.entries(aliases)) {
    const { value, foundAs } = resolveKey(obj, canonical, aliasList)
    if (foundAs !== null) {
      result[canonical] = value
      consumedKeys.add(foundAs)
      // Only mark canonical as consumed if it was the found key
      if (foundAs !== canonical) consumedKeys.add(canonical)
    }
  }

  for (const [key, value] of Object.entries(obj)) {
    if (!consumedKeys.has(key)) {
      result[key] = value
    }
  }

  return result
}

function unwrapDataLayer(data: Record<string, unknown>): Record<string, unknown> {
  const inner = data.data
  if (!inner || typeof inner !== 'object' || Array.isArray(inner)) return data
  const result = { ...(inner as Record<string, unknown>) }
  for (const [key, value] of Object.entries(data)) {
    if (key !== 'data') result[key] = value
  }
  return result
}

export function useNormalizeResponse() {
  function normalize(data: Record<string, unknown>, context: NormalizerContext): Record<string, unknown> {
    if (!data || typeof data !== 'object') return {}

    const topAliases = CONTEXT_TOP_LEVEL[context]
    const unwrapped = unwrapDataLayer(data)
    const result = normalizeFlat(unwrapped, topAliases)

    if (context === 'ads-strategy') {
      const campaigns = result.funnel_campaigns
      if (Array.isArray(campaigns)) {
        result.funnel_campaigns = campaigns.map((item) => {
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            return normalizeFlat(item as Record<string, unknown>, ADS_STRATEGY_NESTED_ALIASES)
          }
          return item
        })
      }
    }

    return result
  }

  return { normalize }
}
