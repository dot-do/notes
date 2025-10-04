/**
 * Shared SEO Library
 *
 * Reusable API integrations and utilities for all autonomous SEO platforms:
 * - SEOBots.do (solopreneurs)
 * - GrowthEngine.ai (agencies)
 * - RankMatrix.com (enterprises)
 * - ContentForge.ai (content creators)
 */

import { z } from 'zod'
import type { BusinessRuntime } from '@mastra/graphdl'

// ============================================================================
// API Integration Types
// ============================================================================

export interface SEMrushKeywordData {
  keyword: string
  searchVolume: number
  difficulty: number
  cpc: number
  intent: 'informational' | 'transactional' | 'commercial' | 'navigational'
  trend: number[]
  relatedKeywords: string[]
}

export interface AhrefsBacklinkData {
  sourceUrl: string
  sourceDomain: string
  targetUrl: string
  anchorText: string
  domainRating: number
  urlRating: number
  linkType: 'dofollow' | 'nofollow' | 'ugc' | 'sponsored'
  firstSeen: string
  lastChecked: string
  status: 'active' | 'lost'
}

export interface GSCData {
  page: string
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

// ============================================================================
// SEMrush API Integration
// ============================================================================

export const semrushAPI = ($: BusinessRuntime) => ({
  /**
   * Research keywords using SEMrush API
   */
  async researchKeywords(params: {
    keyword: string
    database?: string // 'us', 'uk', 'ca', etc.
    limit?: number
  }): Promise<SEMrushKeywordData[]> {
    const { api } = $

    const response = await api.get('https://api.semrush.com/', {
      params: {
        type: 'phrase_related',
        key: process.env.SEMRUSH_API_KEY,
        phrase: params.keyword,
        database: params.database || 'us',
        display_limit: params.limit || 100,
        export_columns: 'Ph,Nq,Cp,Co,Nr,Td',
      }
    })

    // Parse SEMrush CSV response
    const lines = response.data.split('\n').slice(1) // Skip header

    return lines.map(line => {
      const [keyword, volume, cpc, competition, results, trend] = line.split(';')

      return {
        keyword: keyword.trim(),
        searchVolume: parseInt(volume) || 0,
        difficulty: parseFloat(competition) * 100 || 0,
        cpc: parseFloat(cpc) || 0,
        intent: classifyIntent(keyword),
        trend: trend ? trend.split(',').map(Number) : [],
        relatedKeywords: []
      }
    }).filter(k => k.keyword)
  },

  /**
   * Get competitor keywords
   */
  async getCompetitorKeywords(params: {
    domain: string
    limit?: number
  }): Promise<SEMrushKeywordData[]> {
    const { api } = $

    const response = await api.get('https://api.semrush.com/', {
      params: {
        type: 'domain_organic',
        key: process.env.SEMRUSH_API_KEY,
        domain: params.domain,
        display_limit: params.limit || 1000,
        export_columns: 'Ph,Po,Nq,Cp,Co,Tr,Tc,Nr,Td',
      }
    })

    const lines = response.data.split('\n').slice(1)

    return lines.map(line => {
      const [keyword, position, volume, cpc, competition] = line.split(';')

      return {
        keyword: keyword.trim(),
        searchVolume: parseInt(volume) || 0,
        difficulty: parseFloat(competition) * 100 || 0,
        cpc: parseFloat(cpc) || 0,
        intent: classifyIntent(keyword),
        trend: [],
        relatedKeywords: []
      }
    }).filter(k => k.keyword)
  },

  /**
   * Get domain overview metrics
   */
  async getDomainOverview(domain: string) {
    const { api } = $

    const response = await api.get('https://api.semrush.com/', {
      params: {
        type: 'domain_ranks',
        key: process.env.SEMRUSH_API_KEY,
        domain,
        database: 'us',
        export_columns: 'Dn,Rk,Or,Ot,Oc,Ad,At,Ac',
      }
    })

    const [_header, data] = response.data.split('\n')
    const [_domain, rank, organic, organicTraffic, organicCost, ads, adTraffic, adCost] = data.split(';')

    return {
      domain,
      rank: parseInt(rank) || 0,
      organicKeywords: parseInt(organic) || 0,
      organicTraffic: parseInt(organicTraffic) || 0,
      organicCost: parseFloat(organicCost) || 0,
      paidKeywords: parseInt(ads) || 0,
      paidTraffic: parseInt(adTraffic) || 0,
      paidCost: parseFloat(adCost) || 0,
    }
  }
})

// ============================================================================
// Ahrefs API Integration
// ============================================================================

export const ahrefsAPI = ($: BusinessRuntime) => ({
  /**
   * Get backlink profile for domain
   */
  async getBacklinks(params: {
    domain: string
    mode?: 'exact' | 'domain' | 'subdomains'
    limit?: number
  }): Promise<AhrefsBacklinkData[]> {
    const { api } = $

    const response = await api.get('https://api.ahrefs.com/v3/site-explorer/backlinks', {
      headers: {
        'Authorization': `Bearer ${process.env.AHREFS_API_KEY}`,
      },
      params: {
        target: params.domain,
        mode: params.mode || 'domain',
        limit: params.limit || 1000,
      }
    })

    return response.data.backlinks.map((link: any) => ({
      sourceUrl: link.url_from,
      sourceDomain: link.domain_from,
      targetUrl: link.url_to,
      anchorText: link.anchor,
      domainRating: link.domain_rating,
      urlRating: link.url_rating,
      linkType: link.is_dofollow ? 'dofollow' : 'nofollow',
      firstSeen: link.first_seen,
      lastChecked: link.last_check,
      status: link.is_lost ? 'lost' : 'active'
    }))
  },

  /**
   * Get domain metrics (DR, UR, backlinks, referring domains)
   */
  async getDomainMetrics(domain: string) {
    const { api } = $

    const response = await api.get('https://api.ahrefs.com/v3/site-explorer/metrics', {
      headers: {
        'Authorization': `Bearer ${process.env.AHREFS_API_KEY}`,
      },
      params: {
        target: domain,
        mode: 'domain',
      }
    })

    const metrics = response.data.metrics

    return {
      domain,
      domainRating: metrics.domain_rating,
      urlRating: metrics.url_rating,
      backlinks: metrics.backlinks,
      referringDomains: metrics.refdomains,
      organicTraffic: metrics.traffic,
      organicKeywords: metrics.keywords,
    }
  },

  /**
   * Check if backlink is active
   */
  async verifyBacklink(params: {
    sourceUrl: string
    targetUrl: string
  }): Promise<boolean> {
    const { api } = $

    try {
      // Fetch source page
      const response = await api.get(params.sourceUrl)
      const html = response.data

      // Check if target URL exists in HTML
      return html.includes(params.targetUrl)
    } catch (error) {
      return false
    }
  }
})

// ============================================================================
// Google Search Console Integration
// ============================================================================

export const gscAPI = ($: BusinessRuntime) => ({
  /**
   * Get search analytics data from GSC
   */
  async getSearchAnalytics(params: {
    siteUrl: string
    startDate: string
    endDate: string
    dimensions?: ('page' | 'query' | 'country' | 'device')[]
    rowLimit?: number
  }): Promise<GSCData[]> {
    const { api } = $

    const response = await api.post(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(params.siteUrl)}/searchAnalytics/query`,
      {
        startDate: params.startDate,
        endDate: params.endDate,
        dimensions: params.dimensions || ['page', 'query'],
        rowLimit: params.rowLimit || 25000,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GOOGLE_ACCESS_TOKEN}`,
        }
      }
    )

    return response.data.rows.map((row: any) => ({
      page: row.keys[0],
      query: row.keys[1],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }))
  }
})

// ============================================================================
// AI-Powered Utilities
// ============================================================================

export const aiUtils = ($: BusinessRuntime) => ({
  /**
   * Classify keyword intent using AI
   */
  async classifyIntent(keyword: string): Promise<'informational' | 'transactional' | 'commercial' | 'navigational'> {
    const { ai } = $

    const prompt = `Classify the search intent for this keyword: "${keyword}"

Choose ONE of:
- informational (learning, how-to, what is)
- transactional (buy, purchase, download)
- commercial (best, review, compare, vs)
- navigational (brand name, specific site)

Reply with only one word.`

    const result = await ai.generate({ prompt, maxTokens: 10 })
    const intent = result.toLowerCase().trim()

    if (['informational', 'transactional', 'commercial', 'navigational'].includes(intent)) {
      return intent as any
    }

    return 'informational' // Default fallback
  },

  /**
   * Generate keyword clusters using AI
   */
  async clusterKeywords(keywords: string[]): Promise<Record<string, string[]>> {
    const { ai } = $

    const prompt = `Group these keywords into semantic clusters:

${keywords.join('\n')}

Return JSON format:
{
  "cluster_name_1": ["keyword1", "keyword2"],
  "cluster_name_2": ["keyword3", "keyword4"]
}`

    const result = await ai.generate({ prompt, maxTokens: 2000 })

    try {
      return JSON.parse(result)
    } catch {
      return { 'unclustered': keywords }
    }
  },

  /**
   * Generate content brief from keyword cluster
   */
  async generateContentBrief(params: {
    primaryKeyword: string
    relatedKeywords: string[]
    intent: string
  }): Promise<string> {
    const { ai } = $

    const prompt = `Create a comprehensive content brief for:

Primary Keyword: ${params.primaryKeyword}
Related Keywords: ${params.relatedKeywords.join(', ')}
Intent: ${params.intent}

Include:
1. Target audience
2. Content angle/hook
3. Key points to cover (outline)
4. Recommended word count
5. Content type (blog, guide, comparison, etc.)
6. SEO optimizations needed`

    return await ai.generate({ prompt, maxTokens: 1500 })
  },

  /**
   * Generate meta description optimized for CTR
   */
  async generateMetaDescription(params: {
    title: string
    keyword: string
    contentSummary: string
  }): Promise<string> {
    const { ai } = $

    const prompt = `Generate a compelling meta description (155-160 characters):

Title: ${params.title}
Target Keyword: ${params.keyword}
Summary: ${params.contentSummary}

Requirements:
- Include target keyword naturally
- Create urgency or curiosity
- Include a call-to-action
- Exactly 155-160 characters`

    return await ai.generate({ prompt, maxTokens: 100 })
  },

  /**
   * Generate report summary and insights
   */
  async generateReportSummary(params: {
    metrics: Record<string, number>
    period: string
  }): Promise<{ summary: string; recommendations: string[] }> {
    const { ai } = $

    const prompt = `Analyze these SEO metrics for ${params.period}:

${JSON.stringify(params.metrics, null, 2)}

Provide:
1. A 2-3 sentence executive summary
2. 3-5 actionable recommendations

Format as JSON:
{
  "summary": "...",
  "recommendations": ["...", "..."]
}`

    const result = await ai.generate({ prompt, maxTokens: 500 })

    try {
      return JSON.parse(result)
    } catch {
      return {
        summary: 'Unable to generate summary',
        recommendations: []
      }
    }
  }
})

// ============================================================================
// Schema.org / JSON-LD Utilities
// ============================================================================

export const schemaUtils = {
  /**
   * Generate Article schema
   */
  generateArticleSchema(params: {
    title: string
    description: string
    url: string
    datePublished: string
    dateModified?: string
    author: { name: string; url?: string }
    imageUrl?: string
  }) {
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: params.title,
      description: params.description,
      url: params.url,
      datePublished: params.datePublished,
      dateModified: params.dateModified || params.datePublished,
      author: {
        '@type': 'Person',
        name: params.author.name,
        url: params.author.url
      },
      image: params.imageUrl,
    }
  },

  /**
   * Generate HowTo schema
   */
  generateHowToSchema(params: {
    name: string
    description: string
    steps: Array<{ name: string; text: string; image?: string }>
    totalTime?: string
  }) {
    return {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: params.name,
      description: params.description,
      totalTime: params.totalTime,
      step: params.steps.map((step, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        name: step.name,
        text: step.text,
        image: step.image
      }))
    }
  },

  /**
   * Generate FAQ schema
   */
  generateFAQSchema(params: {
    questions: Array<{ question: string; answer: string }>
  }) {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: params.questions.map(qa => ({
        '@type': 'Question',
        name: qa.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: qa.answer
        }
      }))
    }
  },

  /**
   * Generate Product schema
   */
  generateProductSchema(params: {
    name: string
    description: string
    imageUrl: string
    offers: {
      price: number
      currency: string
      availability: string
    }
    aggregateRating?: {
      ratingValue: number
      reviewCount: number
    }
  }) {
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: params.name,
      description: params.description,
      image: params.imageUrl,
      offers: {
        '@type': 'Offer',
        price: params.offers.price,
        priceCurrency: params.offers.currency,
        availability: params.offers.availability
      },
      aggregateRating: params.aggregateRating ? {
        '@type': 'AggregateRating',
        ratingValue: params.aggregateRating.ratingValue,
        reviewCount: params.aggregateRating.reviewCount
      } : undefined
    }
  }
}

// ============================================================================
// llms.txt Generation
// ============================================================================

export const llmsTxtUtils = {
  /**
   * Generate llms.txt file content
   */
  generate(params: {
    siteName: string
    description: string
    mainPages: Array<{ title: string; url: string; description: string }>
    apiDocs?: string
    contactEmail?: string
  }): string {
    return `# ${params.siteName}

> ${params.description}

## Main Pages

${params.mainPages.map(page =>
  `- [${page.title}](${page.url}): ${page.description}`
).join('\n')}

${params.apiDocs ? `## API Documentation\n\n${params.apiDocs}\n` : ''}

${params.contactEmail ? `## Contact\n\nEmail: ${params.contactEmail}` : ''}
`
  }
}

// ============================================================================
// Helper Utilities
// ============================================================================

/**
 * Simple keyword intent classification (non-AI fallback)
 */
export function classifyIntent(keyword: string): 'informational' | 'transactional' | 'commercial' | 'navigational' {
  const lower = keyword.toLowerCase()

  // Transactional
  if (/\b(buy|purchase|order|download|get|subscribe|pricing|price|deal|coupon)\b/.test(lower)) {
    return 'transactional'
  }

  // Commercial
  if (/\b(best|top|review|compare|vs|versus|alternative|comparison)\b/.test(lower)) {
    return 'commercial'
  }

  // Informational
  if (/\b(how|what|why|when|where|guide|tutorial|learn|examples?)\b/.test(lower)) {
    return 'informational'
  }

  // Default to informational
  return 'informational'
}

/**
 * Calculate priority score for keyword
 */
export function calculatePriority(params: {
  searchVolume: number
  difficulty: number
  cpc: number
  currentPosition?: number
}): number {
  const { searchVolume, difficulty, cpc, currentPosition } = params

  // Normalize metrics (0-100 scale)
  const volumeScore = Math.min(searchVolume / 100, 100)
  const difficultyScore = 100 - difficulty
  const valueScore = Math.min(cpc * 20, 100)

  // Position bonus (keywords we rank for but not in top 10)
  const positionBonus = currentPosition && currentPosition > 10 && currentPosition <= 50 ? 25 : 0

  // Weighted average
  const priority = (
    volumeScore * 0.4 +
    difficultyScore * 0.3 +
    valueScore * 0.2 +
    positionBonus * 0.1
  )

  return Math.round(Math.min(priority, 100))
}

/**
 * Validate backlink quality
 */
export function validateBacklinkQuality(params: {
  domainRating: number
  linkType: string
  anchorRelevance: number // 0-100
  contextRelevance: number // 0-100
}): { score: number; quality: 'excellent' | 'good' | 'fair' | 'poor' } {
  const { domainRating, linkType, anchorRelevance, contextRelevance } = params

  let score = 0

  // Domain rating (40% weight)
  score += (domainRating / 100) * 40

  // Link type (20% weight)
  score += linkType === 'dofollow' ? 20 : 5

  // Anchor relevance (20% weight)
  score += (anchorRelevance / 100) * 20

  // Context relevance (20% weight)
  score += (contextRelevance / 100) * 20

  const quality =
    score >= 80 ? 'excellent' :
    score >= 60 ? 'good' :
    score >= 40 ? 'fair' : 'poor'

  return { score: Math.round(score), quality }
}

/**
 * Format date for reports
 */
export function formatDateRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }

  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`
}

/**
 * Calculate percentage change
 */
export function percentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}
