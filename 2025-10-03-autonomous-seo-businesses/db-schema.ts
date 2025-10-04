/**
 * Database Schemas for Autonomous SEO/AEO Businesses
 *
 * Shared data models used across all SEO platform brands:
 * - SEOBots.do (solopreneurs)
 * - GrowthEngine.ai (agencies)
 * - RankMatrix.com (enterprises)
 * - ContentForge.ai (content creators)
 */

export interface User {
  id: string
  email: string
  name: string
  createdAt: Date

  // Subscription & billing
  plan: 'free' | 'starter' | 'pro' | 'agency' | 'enterprise'
  subscriptionStatus: 'active' | 'trialing' | 'past_due' | 'canceled'
  credits: number // For backlink reward program

  // Usage tracking
  keywordsTracked: number
  contentGenerated: number
  backlinksEarned: number

  // Settings
  timezone: string
  emailNotifications: boolean
  slackWebhook?: string
}

export interface Project {
  id: string
  userId: string
  name: string
  domain: string
  createdAt: Date

  // Configuration
  targetMarket: string
  primaryKeywords: string[]
  competitorDomains: string[]

  // Integrations
  googleSearchConsole?: {
    siteUrl: string
    connected: boolean
    lastSync?: Date
  }
  googleAnalytics?: {
    propertyId: string
    connected: boolean
  }
}

export interface Keyword {
  id: string
  projectId: string
  keyword: string

  // Metrics (from SEMrush/Ahrefs)
  searchVolume: number
  difficulty: number // 0-100
  cpc: number
  intent: 'informational' | 'transactional' | 'commercial' | 'navigational'

  // AI classification
  cluster?: string // AI-generated topic cluster
  priority: number // AI-calculated priority score

  // Tracking
  tracked: boolean
  targetUrl?: string

  // Metadata
  discoveredAt: Date
  lastUpdated: Date
  source: 'semrush' | 'ahrefs' | 'gsc' | 'competitor' | 'ai-generated'
}

export interface Ranking {
  id: string
  keywordId: string
  projectId: string

  // Position data
  position: number
  previousPosition?: number
  change: number // +/- from previous

  // SERP features
  hasFeatureSnippet: boolean
  hasLocalPack: boolean
  hasPeopleAlsoAsk: boolean

  // Metadata
  url: string
  searchEngine: 'google' | 'bing'
  location: string
  device: 'desktop' | 'mobile'
  date: Date
}

export interface Content {
  id: string
  projectId: string

  // Content details
  title: string
  slug: string
  url: string
  type: 'blog' | 'guide' | 'comparison' | 'how-to' | 'directory' | 'news'

  // SEO data
  targetKeywords: string[]
  metaDescription: string
  h1: string
  wordCount: number

  // AI generation
  contentBrief?: string // AI-generated brief
  aiGenerated: boolean
  generatedBy?: string // AI model used

  // Schema markup
  schemaType: string[] // e.g., ['Article', 'HowTo']
  schemaMarkup?: object // JSON-LD

  // Performance
  publishedAt?: Date
  lastUpdatedAt?: Date
  needsUpdate: boolean // True if > 90 days old

  // Status
  status: 'draft' | 'published' | 'archived'
}

export interface Backlink {
  id: string
  projectId: string

  // Link details
  sourceUrl: string
  sourceDomain: string
  targetUrl: string
  anchorText: string

  // Metrics (from Ahrefs/Majestic)
  domainAuthority: number // 0-100
  domainRating: number // 0-100
  linkType: 'dofollow' | 'nofollow' | 'ugc' | 'sponsored'

  // Discovery
  discoveredAt: Date
  lastChecked: Date
  status: 'active' | 'lost' | 'pending'

  // Acquisition strategy
  strategy: 'digital-pr' | 'guest-post' | 'free-credits' | 'broken-link' | 'organic'

  // Credits program (for free-credits strategy)
  creditsAwarded?: number
  awardedAt?: Date
}

export interface KeywordCluster {
  id: string
  projectId: string

  // Cluster details
  name: string
  primaryKeyword: string
  keywords: string[] // Keyword IDs
  intent: 'informational' | 'transactional' | 'commercial' | 'navigational'

  // Content strategy
  contentBrief?: string // AI-generated
  targetUrl?: string
  contentStatus: 'none' | 'planned' | 'writing' | 'published'

  // Priority
  priority: number // 0-100, AI-calculated
  estimatedTraffic: number

  // Metadata
  createdAt: Date
  aiGenerated: boolean
}

export interface Competitor {
  id: string
  projectId: string

  // Competitor details
  domain: string
  name: string

  // Metrics
  domainAuthority: number
  estimatedTraffic: number
  backlinks: number

  // Keyword overlap
  sharedKeywords: number
  uniqueKeywords: number

  // Last analysis
  lastAnalyzed: Date
  analysisStatus: 'pending' | 'complete' | 'failed'
}

export interface Report {
  id: string
  projectId: string

  // Report details
  type: 'daily' | 'weekly' | 'monthly' | 'custom'
  period: {
    start: Date
    end: Date
  }

  // Metrics
  metrics: {
    keywordsTracked: number
    avgPosition: number
    positionChanges: number
    contentPublished: number
    backlinksEarned: number
    organicTraffic?: number
    aiCitations?: number
  }

  // AI summary
  summary: string // AI-generated insights
  recommendations: string[] // AI-generated action items

  // Delivery
  generatedAt: Date
  sentAt?: Date
  recipients: string[]
}

export interface CreditTransaction {
  id: string
  userId: string

  // Transaction details
  type: 'earned' | 'spent' | 'bonus' | 'refund'
  amount: number
  balance: number // After transaction

  // Context
  reason: string
  relatedEntityType?: 'backlink' | 'content' | 'referral'
  relatedEntityId?: string

  // Metadata
  createdAt: Date
}

export interface BacklinkOutreach {
  id: string
  projectId: string
  userId: string

  // Target site
  targetDomain: string
  targetUrl: string
  contactEmail: string
  contactName?: string

  // Offer details
  creditsOffered: number
  offerType: 'developer-advocate' | 'case-study' | 'integration-partner'

  // Outreach
  emailSent: boolean
  sentAt?: Date
  opened: boolean
  clicked: boolean
  replied: boolean

  // Result
  status: 'pending' | 'accepted' | 'declined' | 'completed'
  backlinkId?: string // If backlink was created

  // Metadata
  createdAt: Date
}

/**
 * Database operations interface
 *
 * Maps to actual db.* operations in Business-as-Code DSL
 */
export interface SEODatabase {
  users: Collection<User>
  user: (id: string) => Item<User>

  projects: Collection<Project>
  project: (id: string) => Item<Project>

  keywords: Collection<Keyword>
  keyword: (id: string) => Item<Keyword>

  rankings: Collection<Ranking>
  ranking: (id: string) => Item<Ranking>

  content: Collection<Content>
  contents: Collection<Content> // Alternative plural

  backlinks: Collection<Backlink>
  backlink: (id: string) => Item<Backlink>

  clusters: Collection<KeywordCluster>
  cluster: (id: string) => Item<KeywordCluster>

  competitors: Collection<Competitor>
  competitor: (id: string) => Item<Competitor>

  reports: Collection<Report>
  report: (id: string) => Item<Report>

  credits: Collection<CreditTransaction>

  outreach: Collection<BacklinkOutreach>
}

/**
 * Generic collection operations
 */
interface Collection<T> {
  find(query?: any): Promise<T[]>
  create(data: Partial<T>): Promise<T>
  updateMany(query: any, update: any): Promise<number>
  deleteMany(query: any): Promise<number>
  count(query?: any): Promise<number>
  aggregate(query: any): Promise<any>
}

/**
 * Generic item operations
 */
interface Item<T> {
  get(): Promise<T>
  update(data: Partial<T>): Promise<T>
  delete(): Promise<void>
}
