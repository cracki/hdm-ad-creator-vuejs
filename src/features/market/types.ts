export interface ContentIntelligenceRequest {
  brand_uuid?: string | null
  industry: string
  location: string
  brand_services?: string[]
  content_goal?: 'engagement' | 'leads' | 'awareness' | 'sales' | 'education'
}

export interface ContentIntelligenceRun {
  content_intelligence_run_uuid: string
  brand: string | null
  run_type: 'full' | 'opportunities' | 'gaps' | 'matrix' | 'top_performers' | 'calendar'
  status: 'pending' | 'running' | 'completed' | 'failed'
  industry: string
  location: string
  content_goal: string
  request_payload: Record<string, unknown>
  result_payload: ContentIntelligenceResult
  summary: ContentIntelligenceSummary
  created_at: string
  updated_at: string
}

export interface ContentIntelligenceSummary {
  total_opportunities: number
  gaps_found: number
  content_ideas: number
  top_performers_analyzed: number
}

export interface ContentIntelligenceResult {
  content_opportunities: ContentOpportunities
  content_gaps: ContentGapsResponse
  content_matrix: ContentMatrixResponse
  top_performers: TopPerformingContentResponse
  summary: ContentIntelligenceSummary
  industry: string
  location: string
}

// --- Content Matrix ---

export interface ContentMatrixRequest {
  industry: string
  location: string
  target_personas?: string[]
}

export interface ContentMatrixStageIdea {
  title_inspiration: string
  topic: string
  current_top_result?: string
  position?: number
  suggested_title: string
  content_angle: string
  type?: string
}

export interface ContentMatrixStage {
  stage: string
  goal: string
  content_ideas: ContentMatrixStageIdea[]
  recommended_formats: string[]
  total_ideas: number
  target_personas?: string[]
}

export interface ContentMatrixResponse {
  industry: string
  location: string
  content_matrix: {
    TOFU: ContentMatrixStage
    MOFU: ContentMatrixStage
    BOFU: ContentMatrixStage
  }
  total_content_ideas: number
  priority_recommendation: string
}

// --- Top Performing Content ---

export interface TopPerformingContentRequest {
  industry: string
  location: string
}

export interface TopPerformer {
  title: string
  url: string
  snippet: string
  search_query: string
  position: number
  domain: string
  content_type: string
  why_it_ranks: string
  your_opportunity: string
}

export interface TopPerformingPatterns {
  most_common_type: [string, number] | null
  dominant_domains: string[]
  average_position: number
}

export interface TopPerformingContentResponse {
  industry: string
  top_performers: TopPerformer[]
  total_found: number
  common_patterns: TopPerformingPatterns
  action_items: string[]
}

// --- Content Gaps ---

export interface ContentGapsRequest {
  industry: string
  location: string
  your_topics?: string[]
}

export interface ContentGapItem {
  topic: string
  opportunity_score: number
  reason: string
  suggested_content_type: string
  top_current_results: { title: string; url: string }[]
  people_also_ask: string[]
}

export interface ContentGapsResponse {
  industry: string
  content_gaps: ContentGapItem[]
  total_gaps_found: number
  recommendation: string
}

// --- Content Opportunities ---

export interface ContentOpportunityTopic {
  title: string
  snippet: string
  url: string
  position: number
  query: string
  domain: string
}

export interface ContentOpportunities {
  industry?: string
  location?: string
  total_topics_found: number
  top_performing_content: ContentOpportunityTopic[]
  content_by_type: Record<string, ContentOpportunityTopic[]>
  people_also_ask: string[]
  related_searches: string[]
  top_competing_domains: { domain: string; content_count: number }[]
}

// --- AI Hooks ---

export interface AIHooksRequest {
  titles: string[]
  industry: string
  brand_name?: string | null
  hook_count?: number
}

export interface AIHooksResponse {
  hooks: AIHook[]
  [key: string]: unknown
}

export interface AIHook {
  title: string
  hooks: string[]
  [key: string]: unknown
}
