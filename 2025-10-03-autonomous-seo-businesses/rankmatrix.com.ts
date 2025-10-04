/**
 * RankMatrix.com - Enterprise SEO Intelligence Platform
 *
 * Brand: RankMatrix.com
 * ICP: Fortune 500, large enterprises, global brands
 * Pricing: $2K Business | $5K Professional | $10K+ Enterprise
 * Automation: AI-powered with enterprise integrations
 *
 * Features:
 * - Multi-region, multi-language SEO tracking
 * - Advanced predictive analytics & forecasting
 * - Enterprise API with custom integrations
 * - Dedicated account management & SLA
 * - Custom workflows and automation
 * - Advanced security, SSO, audit logs
 * - Real-time collaboration & notifications
 */

import type { BusinessRuntime } from '@mastra/graphdl'
import { semrushAPI, ahrefsAPI, gscAPI, aiUtils, schemaUtils, calculatePriority, percentageChange, formatDateRange } from './shared-seo-lib'
import type { User, Project, Keyword, KeywordCluster, Competitor, Content, Report, Ranking } from './db-schema'

export const rankMatrix = ($: BusinessRuntime) => {
  const { ai, api, db, decide, every, on, send, user } = $

  // Get API integrations
  const semrush = semrushAPI($)
  const ahrefs = ahrefsAPI($)
  const gsc = gscAPI($)
  const aiHelpers = aiUtils($)

  // ============================================================================
  // EVENT: New Enterprise Account Created
  // ============================================================================

  on.user.created(async (newUser: User) => {
    // Send enterprise welcome email
    await send.email({
      to: newUser.email,
      subject: '🏢 Welcome to RankMatrix - Enterprise SEO Intelligence',
      template: 'enterprise-onboarding',
      data: {
        name: newUser.name,
        onboardingUrl: `https://rankmatrix.com/onboarding?user=${newUser.id}`,
        accountManagerEmail: 'success@rankmatrix.com',
        apiDocsUrl: 'https://rankmatrix.com/docs/enterprise-api',
        ssoSetupUrl: 'https://rankmatrix.com/admin/sso'
      }
    })

    // Create enterprise organization
    await db.organizations.create({
      userId: newUser.id,
      name: newUser.metadata?.companyName || `${newUser.name}'s Organization`,
      plan: newUser.plan,
      sso: {
        enabled: false,
        provider: '',
        domain: ''
      },
      security: {
        ipWhitelist: [],
        twoFactor: false,
        apiKeyRotation: 90 // days
      },
      sla: {
        uptime: 99.9,
        supportResponseTime: 4, // hours
        accountManager: 'success@rankmatrix.com'
      }
    })

    // Assign dedicated account manager
    await send.internal({
      to: 'success@rankmatrix.com',
      subject: `New Enterprise Account: ${newUser.name}`,
      data: {
        userId: newUser.id,
        company: newUser.metadata?.companyName,
        plan: newUser.plan,
        onboardingUrl: `https://admin.rankmatrix.com/users/${newUser.id}`
      }
    })

    // Award enterprise credits
    await db.credits.create({
      userId: newUser.id,
      type: 'bonus',
      amount: 5000,
      balance: 5000,
      reason: 'Enterprise welcome package - premium SEO intelligence at scale',
      createdAt: new Date()
    })
  })

  // ============================================================================
  // EVENT: Enterprise Project Created
  // ============================================================================

  on.project.created(async (project: Project) => {
    // Deep competitive intelligence
    if (project.competitorDomains.length > 0) {
      await ai.generate({
        prompt: `Performing enterprise-grade competitive analysis for ${project.domain}...`,
        callback: async () => {
          const competitorPromises = project.competitorDomains.map(async (competitorDomain) => {
            // Parallel data gathering
            const [metrics, keywords, backlinks] = await Promise.all([
              ahrefs.getDomainMetrics(competitorDomain),
              semrush.getCompetitorKeywords({ domain: competitorDomain, limit: 2000 }),
              ahrefs.getBacklinks({ domain: competitorDomain, limit: 1000 })
            ])

            // Save competitor with comprehensive data
            const competitor = await db.competitors.create({
              projectId: project.id,
              domain: competitorDomain,
              name: competitorDomain,
              domainAuthority: metrics.domainRating,
              estimatedTraffic: metrics.organicTraffic,
              backlinks: metrics.backlinks,
              sharedKeywords: 0,
              uniqueKeywords: keywords.length,
              lastAnalyzed: new Date(),
              analysisStatus: 'complete',
              metadata: {
                referringDomains: metrics.referringDomains,
                topBacklinks: backlinks.slice(0, 100),
                topKeywords: keywords.slice(0, 100)
              }
            })

            // Import all keywords with competitive data
            let sharedCount = 0

            for (const kw of keywords) {
              const existing = await db.keywords.findOne({
                projectId: project.id,
                keyword: kw.keyword
              })

              if (existing) {
                sharedCount++
                // Add competitive data to existing keyword
                await db.keyword(existing.id).update({
                  metadata: {
                    ...existing.metadata,
                    competitorData: {
                      ...existing.metadata?.competitorData,
                      [competitorDomain]: {
                        searchVolume: kw.searchVolume,
                        difficulty: kw.difficulty,
                        estimatedTraffic: kw.searchVolume * 0.3 // Rough estimate
                      }
                    }
                  }
                })
              } else {
                await db.keywords.create({
                  projectId: project.id,
                  keyword: kw.keyword,
                  searchVolume: kw.searchVolume,
                  difficulty: kw.difficulty,
                  cpc: kw.cpc,
                  intent: kw.intent,
                  priority: calculatePriority({
                    searchVolume: kw.searchVolume,
                    difficulty: kw.difficulty,
                    cpc: kw.cpc
                  }),
                  tracked: false,
                  discoveredAt: new Date(),
                  lastUpdated: new Date(),
                  source: 'competitor',
                  metadata: {
                    competitorData: {
                      [competitorDomain]: {
                        searchVolume: kw.searchVolume,
                        difficulty: kw.difficulty
                      }
                    }
                  }
                })
              }
            }

            await db.competitor(competitor.id).update({ sharedKeywords: sharedCount })

            return competitor
          })

          await Promise.all(competitorPromises)
        }
      })
    }

    // AI-powered strategic keyword clustering
    const allKeywords = await db.keywords.find({ projectId: project.id })

    if (allKeywords.length > 50) {
      // Advanced clustering with ML
      const clusters = await aiHelpers.clusterKeywords(allKeywords.map(k => k.keyword))

      for (const [clusterName, keywordList] of Object.entries(clusters)) {
        const keywordIds = allKeywords
          .filter(k => keywordList.includes(k.keyword))
          .map(k => k.id)

        if (keywordIds.length < 5) continue

        const clusterKeywords = allKeywords.filter(k => keywordIds.includes(k.id))
        const estimatedTraffic = clusterKeywords.reduce((sum, k) => sum + k.searchVolume * 0.3, 0)
        const avgPriority = clusterKeywords.reduce((sum, k) => sum + k.priority, 0) / clusterKeywords.length
        const primaryKeyword = clusterKeywords.sort((a, b) => b.searchVolume - a.searchVolume)[0]

        // AI-powered content strategy
        const brief = await ai.generate({
          prompt: `Create an enterprise-grade content strategy for:

Topic Cluster: ${clusterName}
Primary Keyword: ${primaryKeyword.keyword}
Related Keywords: ${clusterKeywords.slice(0, 15).map(k => k.keyword).join(', ')}
Estimated Traffic Potential: ${Math.round(estimatedTraffic)}/month

Provide:
1. Content pillar strategy
2. Sub-topic breakdown
3. Target audience segments
4. Competitive positioning
5. Success metrics
6. Timeline and resources needed

Format as detailed markdown.`,
          maxTokens: 2000
        })

        await db.clusters.create({
          projectId: project.id,
          name: clusterName,
          primaryKeyword: primaryKeyword.keyword,
          keywords: keywordIds,
          intent: primaryKeyword.intent,
          contentBrief: brief,
          contentStatus: 'planned',
          priority: Math.round(avgPriority),
          estimatedTraffic: Math.round(estimatedTraffic),
          createdAt: new Date(),
          aiGenerated: true
        })
      }
    }

    // Notify stakeholders
    const org = await db.organizations.findOne({ userId: project.userId })

    await send.notification({
      userId: project.userId,
      title: `Enterprise Project Initialized: ${project.name}`,
      message: `✅ ${allKeywords.length} keywords | ✅ ${await db.clusters.count({ projectId: project.id })} content clusters | ✅ ${await db.competitors.count({ projectId: project.id })} competitors analyzed`,
      action: {
        label: 'View Strategic Overview',
        url: `https://rankmatrix.com/projects/${project.id}/overview`
      }
    })
  })

  // ============================================================================
  // CRON: Multi-Region Rank Tracking (Hourly)
  // ============================================================================

  every.hour(async () => {
    const projects = await db.projects.find({ status: 'active', plan: { $in: ['professional', 'enterprise'] } })

    for (const project of projects) {
      const keywords = await db.keywords.find({ projectId: project.id, tracked: true })

      // Track across multiple regions and devices
      const regions = project.metadata?.trackingRegions || ['us']
      const devices = ['desktop', 'mobile']

      for (const keyword of keywords.slice(0, 100)) { // Rate limiting
        for (const region of regions) {
          for (const device of devices) {
            // Get GSC data if available
            if (project.googleSearchConsole?.connected) {
              const yesterday = new Date()
              yesterday.setDate(yesterday.getDate() - 1)

              const gscData = await gsc.getSearchAnalytics({
                siteUrl: project.googleSearchConsole.siteUrl,
                startDate: yesterday.toISOString().split('T')[0],
                endDate: yesterday.toISOString().split('T')[0],
                dimensions: ['query', 'device']
              })

              const ranking = gscData.find(d =>
                d.query === keyword.keyword &&
                d.page.includes(project.domain)
              )

              if (ranking) {
                const previousRanking = await db.rankings.findOne({
                  keywordId: keyword.id,
                  location: region,
                  device,
                  date: { $lt: yesterday }
                })

                const previousPosition = previousRanking?.position || 0
                const change = previousPosition > 0 ? previousPosition - ranking.position : 0

                await db.rankings.create({
                  keywordId: keyword.id,
                  projectId: project.id,
                  position: ranking.position,
                  previousPosition,
                  change,
                  hasFeatureSnippet: false,
                  hasLocalPack: false,
                  hasPeopleAlsoAsk: false,
                  url: ranking.page,
                  searchEngine: 'google',
                  location: region,
                  device,
                  date: yesterday
                })

                // Alert on significant changes (enterprise SLA)
                if (Math.abs(change) >= 5) {
                  await send.notification({
                    userId: project.userId,
                    title: `Rank Change Alert: ${keyword.keyword}`,
                    message: `${change > 0 ? '📈' : '📉'} ${Math.abs(change)} positions (${region}, ${device})`,
                    action: {
                      label: 'View Details',
                      url: `https://rankmatrix.com/projects/${project.id}/keywords/${keyword.id}`
                    },
                    priority: Math.abs(change) >= 10 ? 'high' : 'normal'
                  })
                }
              }
            }
          }
        }
      }
    }
  })

  // ============================================================================
  // CRON: Predictive Analytics & Forecasting (Daily 3 AM)
  // ============================================================================

  every.day.at('03:00', async () => {
    const projects = await db.projects.find({ status: 'active', plan: 'enterprise' })

    for (const project of projects) {
      // Get 90 days of ranking history
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      const rankings = await db.rankings.find({
        projectId: project.id,
        date: { $gte: ninetyDaysAgo }
      })

      if (rankings.length < 30) continue // Need enough data

      // Group by keyword
      const keywordRankings = new Map<string, Ranking[]>()

      for (const ranking of rankings) {
        const keyword = await db.keyword(ranking.keywordId).get()
        if (!keywordRankings.has(keyword.id)) {
          keywordRankings.set(keyword.id, [])
        }
        keywordRankings.get(keyword.id)!.push(ranking)
      }

      // AI-powered forecasting
      for (const [keywordId, rankHistory] of keywordRankings) {
        const keyword = await db.keyword(keywordId).get()

        // Sort by date
        rankHistory.sort((a, b) => a.date.getTime() - b.date.getTime())

        const positionHistory = rankHistory.map(r => r.position)

        // Generate forecast
        const forecast = await ai.generate({
          prompt: `Analyze this keyword ranking history and provide a 30-day forecast:

Keyword: ${keyword.keyword}
Search Volume: ${keyword.searchVolume}/month
Current Position: ${positionHistory[positionHistory.length - 1]}
90-Day History: ${positionHistory.join(', ')}

Provide:
1. Predicted position in 30 days
2. Confidence level (high/medium/low)
3. Key factors influencing the trend
4. Recommended actions

Format as JSON:
{
  "predictedPosition": number,
  "confidence": "high" | "medium" | "low",
  "factors": ["factor1", "factor2"],
  "recommendations": ["action1", "action2"]
}`,
          maxTokens: 500
        })

        try {
          const forecastData = JSON.parse(forecast)

          // Save forecast
          await db.forecasts.create({
            keywordId,
            projectId: project.id,
            currentPosition: positionHistory[positionHistory.length - 1],
            predictedPosition: forecastData.predictedPosition,
            confidence: forecastData.confidence,
            factors: forecastData.factors,
            recommendations: forecastData.recommendations,
            createdAt: new Date(),
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          })
        } catch (e) {
          // Failed to parse forecast
          console.error('Forecast parsing failed:', e)
        }
      }

      // Generate executive forecast summary
      const forecasts = await db.forecasts.find({ projectId: project.id })

      const highConfidence = forecasts.filter(f => f.confidence === 'high')
      const improvements = highConfidence.filter(f => f.predictedPosition < f.currentPosition)
      const declines = highConfidence.filter(f => f.predictedPosition > f.currentPosition)

      await send.email({
        to: (await db.user(project.userId).get()).email,
        subject: `📊 30-Day SEO Forecast - ${project.name}`,
        template: 'enterprise-forecast',
        data: {
          projectName: project.name,
          totalForecasts: forecasts.length,
          expectedImprovements: improvements.length,
          expectedDeclines: declines.length,
          topOpportunities: improvements.slice(0, 5),
          topRisks: declines.slice(0, 5),
          dashboardUrl: `https://rankmatrix.com/projects/${project.id}/forecasts`
        }
      })
    }
  })

  // ============================================================================
  // CRON: Advanced Content Performance Analysis (Weekly Sunday 6 AM)
  // ============================================================================

  every.sunday.at('06:00', async () => {
    const projects = await db.projects.find({ status: 'active' })

    for (const project of projects) {
      const content = await db.content.find({
        projectId: project.id,
        status: 'published'
      })

      for (const article of content) {
        // Check if content needs update (>90 days old)
        const age = Date.now() - article.publishedAt!.getTime()
        const ageInDays = age / (1000 * 60 * 60 * 24)

        if (ageInDays > 90 && !article.needsUpdate) {
          // Flag for refresh
          await db.content(article.id).update({ needsUpdate: true })

          // Generate refresh recommendations
          const refreshPlan = await ai.generate({
            prompt: `This article was published ${Math.round(ageInDays)} days ago:

Title: ${article.title}
Target Keywords: ${article.targetKeywords.join(', ')}
Word Count: ${article.wordCount}

Recommend:
1. What sections to update
2. New data/statistics to add
3. Additional keywords to target
4. Content expansion opportunities
5. Technical SEO improvements

Format as actionable markdown.`,
            maxTokens: 800
          })

          await send.notification({
            userId: project.userId,
            title: `Content Refresh Recommended: ${article.title}`,
            message: `Published ${Math.round(ageInDays)} days ago`,
            action: {
              label: 'View Refresh Plan',
              url: `https://rankmatrix.com/content/${article.id}/refresh`
            },
            metadata: { refreshPlan }
          })
        }

        // Analyze content performance
        if (project.googleSearchConsole?.connected) {
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

          const gscData = await gsc.getSearchAnalytics({
            siteUrl: project.googleSearchConsole.siteUrl,
            startDate: thirtyDaysAgo.toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            dimensions: ['page']
          })

          const pageData = gscData.find(d => d.page === article.url)

          if (pageData) {
            // Update content performance metrics
            await db.content(article.id).update({
              metadata: {
                ...article.metadata,
                performance: {
                  clicks: pageData.clicks,
                  impressions: pageData.impressions,
                  ctr: pageData.ctr,
                  avgPosition: pageData.position,
                  lastUpdated: new Date()
                }
              }
            })
          }
        }
      }
    }
  })

  // ============================================================================
  // CRON: Executive Dashboard & Insights (Daily 7 AM)
  // ============================================================================

  every.day.at('07:00', async () => {
    const users = await db.users.find({ plan: { $in: ['business', 'professional', 'enterprise'] } })

    for (const user of users) {
      const projects = await db.projects.find({ userId: user.id })

      if (projects.length === 0) continue

      // Aggregate metrics across all projects
      let totalKeywords = 0
      let totalContent = 0
      let totalBacklinks = 0
      let totalTraffic = 0

      for (const project of projects) {
        totalKeywords += await db.keywords.count({ projectId: project.id, tracked: true })
        totalContent += await db.content.count({ projectId: project.id, status: 'published' })
        totalBacklinks += await db.backlinks.count({ projectId: project.id, status: 'active' })

        // Get traffic if GSC connected
        if (project.googleSearchConsole?.connected) {
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)

          const gscData = await gsc.getSearchAnalytics({
            siteUrl: project.googleSearchConsole.siteUrl,
            startDate: yesterday.toISOString().split('T')[0],
            endDate: yesterday.toISOString().split('T')[0],
            dimensions: ['page']
          })

          totalTraffic += gscData.reduce((sum, d) => sum + d.clicks, 0)
        }
      }

      // AI-generated daily insights
      const insights = await ai.generate({
        prompt: `Generate executive SEO insights for:

Portfolio Summary:
- ${projects.length} active projects
- ${totalKeywords} keywords tracked
- ${totalContent} published articles
- ${totalBacklinks} active backlinks
- ${totalTraffic} organic clicks (yesterday)

Provide:
1. Key trend observation
2. Top opportunity
3. Priority action item

Keep it concise (2-3 sentences total).`,
        maxTokens: 200
      })

      await send.email({
        to: user.email,
        subject: '☀️ Daily SEO Intelligence Brief',
        template: 'enterprise-daily-brief',
        data: {
          name: user.name,
          projects: projects.length,
          keywords: totalKeywords,
          content: totalContent,
          backlinks: totalBacklinks,
          traffic: totalTraffic,
          insights,
          dashboardUrl: 'https://rankmatrix.com/dashboard'
        }
      })
    }
  })

  // ============================================================================
  // USER ACTION: Custom Workflow Execution
  // ============================================================================

  on.user.action('execute-workflow', async (params: { workflowId: string; projectId: string; inputs: any }) => {
    const workflow = await db.workflows.findOne({ id: params.workflowId })
    const project = await db.project(params.projectId).get()

    if (!workflow) {
      throw new Error('Workflow not found')
    }

    // Execute custom enterprise workflow
    // This would integrate with the user's custom automation
    await send.notification({
      userId: project.userId,
      title: `Workflow Started: ${workflow.name}`,
      message: `Executing custom workflow for ${project.name}`,
      action: {
        label: 'View Progress',
        url: `https://rankmatrix.com/workflows/${params.workflowId}/runs/latest`
      }
    })
  })

  // ============================================================================
  // API: Enterprise API Endpoint
  // ============================================================================

  on.api.request('/api/v1/projects/:id/analytics', async (req) => {
    const projectId = req.params.id
    const { startDate, endDate, metrics } = req.query

    // Validate API key and permissions
    const apiKey = req.headers['x-api-key']
    const user = await db.users.findOne({ apiKeys: { $contains: apiKey } })

    if (!user) {
      return { status: 401, body: { error: 'Unauthorized' } }
    }

    // Get project
    const project = await db.project(projectId).get()

    if (project.userId !== user.id) {
      return { status: 403, body: { error: 'Forbidden' } }
    }

    // Gather requested metrics
    const data: any = {}

    if (metrics.includes('keywords')) {
      data.keywords = await db.keywords.find({ projectId })
    }

    if (metrics.includes('rankings')) {
      data.rankings = await db.rankings.find({
        projectId,
        date: { $gte: new Date(startDate), $lte: new Date(endDate) }
      })
    }

    if (metrics.includes('content')) {
      data.content = await db.content.find({ projectId })
    }

    return {
      status: 200,
      body: {
        projectId,
        period: { startDate, endDate },
        data
      }
    }
  })

  return {
    name: 'RankMatrix.com',
    description: 'Enterprise SEO intelligence platform',
    version: '1.0.0'
  }
}
