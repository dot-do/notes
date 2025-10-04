/**
 * GrowthEngine.ai - Autonomous SEO for Agencies
 *
 * Brand: GrowthEngine.ai
 * ICP: Marketing agencies, SEO agencies, consulting firms
 * Pricing: $299 Agency | $599 Pro | $999 Enterprise
 * Automation: AI-powered with multi-client management
 *
 * Features:
 * - Multi-client project management
 * - White-label reporting & dashboards
 * - Team collaboration & permissions
 * - Advanced competitive analysis
 * - Bulk keyword & content operations
 * - API access for integrations
 * - Client portal & billing
 */

import type { BusinessRuntime } from '@mastra/graphdl'
import { semrushAPI, ahrefsAPI, gscAPI, aiUtils, schemaUtils, calculatePriority, percentageChange } from './shared-seo-lib'
import type { User, Project, Keyword, KeywordCluster, Competitor, Content, Report } from './db-schema'

export const growthEngine = ($: BusinessRuntime) => {
  const { ai, api, db, decide, every, on, send, user } = $

  // Get API integrations
  const semrush = semrushAPI($)
  const ahrefs = ahrefsAPI($)
  const gsc = gscAPI($)
  const aiHelpers = aiUtils($)

  // ============================================================================
  // EVENT: New Agency Account Created
  // ============================================================================

  on.user.created(async (newUser: User) => {
    // Send agency welcome email
    await send.email({
      to: newUser.email,
      subject: '🚀 Welcome to GrowthEngine.ai - Scalable SEO for Agencies',
      template: 'agency-onboarding',
      data: {
        name: newUser.name,
        setupUrl: `https://growthengine.ai/setup?user=${newUser.id}`,
        teamInviteUrl: `https://growthengine.ai/team/invite`,
        apiDocsUrl: 'https://growthengine.ai/docs/api'
      }
    })

    // Create agency workspace
    await db.workspaces.create({
      userId: newUser.id,
      name: `${newUser.name}'s Agency`,
      plan: newUser.plan,
      teamMembers: [{ userId: newUser.id, role: 'owner', permissions: ['*'] }],
      whiteLabelConfig: {
        logoUrl: '',
        primaryColor: '#6366f1',
        domain: '', // Custom domain for client portal
      }
    })

    // Award agency bonus credits
    await db.credits.create({
      userId: newUser.id,
      type: 'bonus',
      amount: 500,
      balance: 500,
      reason: 'Agency welcome bonus - scale your SEO services!',
      createdAt: new Date()
    })
  })

  // ============================================================================
  // EVENT: New Client Project Created
  // ============================================================================

  on.project.created(async (project: Project) => {
    // Get workspace
    const workspace = await db.workspaces.findOne({ userId: project.userId })

    // Comprehensive competitor analysis
    if (project.competitorDomains.length > 0) {
      await ai.generate({
        prompt: `Performing deep competitive analysis for ${project.domain}...`,
        callback: async () => {
          for (const competitorDomain of project.competitorDomains) {
            // Get domain metrics
            const metrics = await ahrefs.getDomainMetrics(competitorDomain)

            // Get top keywords
            const keywords = await semrush.getCompetitorKeywords({
              domain: competitorDomain,
              limit: 500
            })

            // Save competitor
            const competitor = await db.competitors.create({
              projectId: project.id,
              domain: competitorDomain,
              name: competitorDomain,
              domainAuthority: metrics.domainRating,
              estimatedTraffic: metrics.organicTraffic,
              backlinks: metrics.backlinks,
              sharedKeywords: 0, // Calculated later
              uniqueKeywords: keywords.length,
              lastAnalyzed: new Date(),
              analysisStatus: 'complete'
            })

            // Import competitor keywords
            let sharedCount = 0

            for (const kw of keywords.slice(0, 200)) {
              // Check if keyword already exists for this project
              const existing = await db.keywords.findOne({
                projectId: project.id,
                keyword: kw.keyword
              })

              if (existing) {
                sharedCount++
              } else {
                // Add new keyword
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
                  source: 'competitor'
                })
              }
            }

            // Update shared keyword count
            await db.competitor(competitor.id).update({ sharedKeywords: sharedCount })
          }
        }
      })
    }

    // AI-powered keyword clustering
    const allKeywords = await db.keywords.find({ projectId: project.id })

    if (allKeywords.length > 10) {
      const clusters = await aiHelpers.clusterKeywords(allKeywords.map(k => k.keyword))

      for (const [clusterName, keywordList] of Object.entries(clusters)) {
        // Find keyword IDs
        const keywordIds = allKeywords
          .filter(k => keywordList.includes(k.keyword))
          .map(k => k.id)

        if (keywordIds.length < 3) continue // Skip small clusters

        // Calculate cluster metrics
        const clusterKeywords = allKeywords.filter(k => keywordIds.includes(k.id))
        const estimatedTraffic = clusterKeywords.reduce((sum, k) => sum + k.searchVolume, 0)
        const avgPriority = clusterKeywords.reduce((sum, k) => sum + k.priority, 0) / clusterKeywords.length

        // Determine primary keyword (highest search volume)
        const primaryKeyword = clusterKeywords.sort((a, b) => b.searchVolume - a.searchVolume)[0]

        // Generate content brief
        const brief = await aiHelpers.generateContentBrief({
          primaryKeyword: primaryKeyword.keyword,
          relatedKeywords: clusterKeywords.slice(1, 6).map(k => k.keyword),
          intent: primaryKeyword.intent
        })

        // Create cluster
        await db.clusters.create({
          projectId: project.id,
          name: clusterName,
          primaryKeyword: primaryKeyword.keyword,
          keywords: keywordIds,
          intent: primaryKeyword.intent,
          contentBrief: brief,
          contentStatus: 'planned',
          priority: Math.round(avgPriority),
          estimatedTraffic,
          createdAt: new Date(),
          aiGenerated: true
        })
      }
    }

    // Notify team
    await send.notification({
      userId: project.userId,
      title: `New Client: ${project.name}`,
      message: `Analysis complete: ${allKeywords.length} keywords, ${await db.clusters.count({ projectId: project.id })} content clusters`,
      action: {
        label: 'View Project',
        url: `https://growthengine.ai/projects/${project.id}`
      }
    })
  })

  // ============================================================================
  // CRON: Daily Keyword Rank Tracking (6 AM)
  // ============================================================================

  every.day.at('06:00', async () => {
    const projects = await db.projects.find({ status: 'active' })

    for (const project of projects) {
      // Get tracked keywords
      const keywords = await db.keywords.find({ projectId: project.id, tracked: true })

      for (const keyword of keywords) {
        // Get current rankings from GSC (if connected)
        if (project.googleSearchConsole?.connected) {
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)

          const gscData = await gsc.getSearchAnalytics({
            siteUrl: project.googleSearchConsole.siteUrl,
            startDate: yesterday.toISOString().split('T')[0],
            endDate: yesterday.toISOString().split('T')[0],
            dimensions: ['query']
          })

          const ranking = gscData.find(d => d.query === keyword.keyword)

          if (ranking) {
            // Get previous position
            const previousRanking = await db.rankings.findOne({
              keywordId: keyword.id,
              date: { $lt: yesterday }
            })

            const previousPosition = previousRanking?.position || 0
            const change = previousPosition > 0 ? previousPosition - ranking.position : 0

            // Save ranking
            await db.rankings.create({
              keywordId: keyword.id,
              projectId: project.id,
              position: ranking.position,
              previousPosition,
              change,
              hasFeatureSnippet: false, // TODO: Detect from SERP
              hasLocalPack: false,
              hasPeopleAlsoAsk: false,
              url: ranking.page,
              searchEngine: 'google',
              location: 'US',
              device: 'desktop',
              date: yesterday
            })
          }
        }
      }
    }
  })

  // ============================================================================
  // CRON: Bulk Content Generation (8 AM)
  // ============================================================================

  every.day.at('08:00', async () => {
    const projects = await db.projects.find({ status: 'active' })

    for (const project of projects) {
      const user = await db.user(project.userId).get()

      // Check plan limits
      const monthlyContentLimit = user.plan === 'agency' ? 50 : user.plan === 'pro' ? 150 : 500

      const thisMonth = new Date()
      thisMonth.setDate(1)
      thisMonth.setHours(0, 0, 0, 0)

      const contentThisMonth = await db.content.count({
        projectId: project.id,
        publishedAt: { $gte: thisMonth }
      })

      if (contentThisMonth >= monthlyContentLimit) continue

      // Find top priority clusters without content
      const clusters = await db.clusters.find({
        projectId: project.id,
        contentStatus: 'planned',
        priority: { $gte: 70 }
      })

      if (clusters.length === 0) continue

      // Sort by priority
      clusters.sort((a, b) => b.priority - a.priority)

      const targetCluster = clusters[0]

      // Get cluster keywords
      const keywords = await db.keywords.find({
        projectId: project.id,
        id: { $in: targetCluster.keywords }
      })

      // Generate comprehensive content
      const article = await ai.generate({
        prompt: `Write a comprehensive, expert-level article for an agency client:

Primary Topic: ${targetCluster.name}
Primary Keyword: ${targetCluster.primaryKeyword}
Related Keywords: ${keywords.slice(0, 10).map(k => k.keyword).join(', ')}
Intent: ${targetCluster.intent}

Content Brief:
${targetCluster.contentBrief}

Requirements:
- 2500-3500 words (agency quality)
- Expert tone, data-driven
- Clear H2/H3 structure with semantic headings
- Natural keyword integration
- Include statistics and examples
- Actionable insights
- FAQ section
- Call-to-action

Format as markdown with proper headings.`,
        maxTokens: 6000
      })

      // Extract title
      const titleMatch = article.match(/^#\s+(.+)$/m)
      const title = titleMatch ? titleMatch[1] : targetCluster.name

      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

      // Generate meta description
      const metaDescription = await aiHelpers.generateMetaDescription({
        title,
        keyword: targetCluster.primaryKeyword,
        contentSummary: targetCluster.contentBrief || ''
      })

      // Generate advanced schema markup
      const schemaMarkup = [
        schemaUtils.generateArticleSchema({
          title,
          description: metaDescription,
          url: `https://${project.domain}/blog/${slug}`,
          datePublished: new Date().toISOString(),
          author: { name: project.name, url: `https://${project.domain}` }
        })
      ]

      // Create content
      const content = await db.content.create({
        projectId: project.id,
        title,
        slug,
        url: `https://${project.domain}/blog/${slug}`,
        type: targetCluster.intent === 'how-to' ? 'how-to' : 'guide',
        targetKeywords: keywords.map(k => k.keyword),
        metaDescription,
        h1: title,
        wordCount: article.split(/\s+/).length,
        contentBrief: targetCluster.contentBrief,
        aiGenerated: true,
        generatedBy: 'gpt-4',
        schemaType: ['Article'],
        schemaMarkup,
        publishedAt: new Date(),
        lastUpdatedAt: new Date(),
        needsUpdate: false,
        status: 'published'
      })

      // Update cluster
      await db.cluster(targetCluster.id).update({
        targetUrl: content.url,
        contentStatus: 'published'
      })

      // Update user stats
      await db.user(project.userId).update({
        contentGenerated: user.contentGenerated + 1
      })
    }
  })

  // ============================================================================
  // CRON: Client Reports (Monthly - 1st at 9 AM)
  // ============================================================================

  every.month.on(1).at('09:00', async () => {
    const projects = await db.projects.find({ status: 'active' })

    for (const project of projects) {
      // Calculate period (last 30 days)
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)

      // Gather comprehensive metrics
      const keywordsTracked = await db.keywords.count({ projectId: project.id, tracked: true })
      const contentPublished = await db.content.count({
        projectId: project.id,
        publishedAt: { $gte: start, $lte: end }
      })
      const backlinksEarned = await db.backlinks.count({
        projectId: project.id,
        discoveredAt: { $gte: start, $lte: end }
      })

      // Get ranking changes
      const rankings = await db.rankings.find({
        projectId: project.id,
        date: { $gte: start, $lte: end }
      })

      const avgPosition = rankings.length > 0
        ? rankings.reduce((sum, r) => sum + r.position, 0) / rankings.length
        : 0

      const positionChanges = rankings.filter(r => r.change !== 0).length

      // Get traffic data
      let organicTraffic = 0

      if (project.googleSearchConsole?.connected) {
        const gscData = await gsc.getSearchAnalytics({
          siteUrl: project.googleSearchConsole.siteUrl,
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
          dimensions: ['query']
        })

        organicTraffic = gscData.reduce((sum, d) => sum + d.clicks, 0)
      }

      const metrics = {
        keywordsTracked,
        avgPosition: Math.round(avgPosition * 10) / 10,
        positionChanges,
        contentPublished,
        backlinksEarned,
        organicTraffic,
        aiCitations: 0 // TODO: Track AI citations
      }

      // Generate executive summary
      const aiSummary = await aiHelpers.generateReportSummary({
        metrics,
        period: 'the past 30 days'
      })

      // Create white-label report
      const report = await db.reports.create({
        projectId: project.id,
        type: 'monthly',
        period: { start, end },
        metrics,
        summary: aiSummary.summary,
        recommendations: aiSummary.recommendations,
        generatedAt: new Date(),
        recipients: [] // Will be populated by workspace team
      })

      // Get workspace for white-label config
      const workspace = await db.workspaces.findOne({ userId: project.userId })

      // Send white-labeled report
      await send.email({
        to: project.metadata?.clientEmail || (await db.user(project.userId).get()).email,
        subject: `Monthly SEO Performance Report - ${project.name}`,
        template: 'agency-monthly-report',
        data: {
          projectName: project.name,
          period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
          metrics,
          summary: aiSummary.summary,
          recommendations: aiSummary.recommendations,
          reportUrl: `https://${workspace?.whiteLabelConfig?.domain || 'growthengine.ai'}/reports/${report.id}`,
          agencyName: workspace?.name || 'Your Agency',
          agencyLogo: workspace?.whiteLabelConfig?.logoUrl || ''
        }
      })

      await db.report(report.id).update({ sentAt: new Date() })
    }
  })

  // ============================================================================
  // CRON: Competitive Intelligence (Weekly - Friday 10 AM)
  // ============================================================================

  every.friday.at('10:00', async () => {
    const projects = await db.projects.find({ status: 'active' })

    for (const project of projects) {
      const competitors = await db.competitors.find({ projectId: project.id })

      for (const competitor of competitors) {
        // Update domain metrics
        const metrics = await ahrefs.getDomainMetrics(competitor.domain)

        const previousTraffic = competitor.estimatedTraffic
        const trafficChange = percentageChange(metrics.organicTraffic, previousTraffic)

        // Update competitor
        await db.competitor(competitor.id).update({
          domainAuthority: metrics.domainRating,
          estimatedTraffic: metrics.organicTraffic,
          backlinks: metrics.backlinks,
          lastAnalyzed: new Date()
        })

        // Alert if significant changes
        if (Math.abs(trafficChange) > 20) {
          await send.notification({
            userId: project.userId,
            title: `Competitor Alert: ${competitor.domain}`,
            message: `Traffic ${trafficChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(trafficChange)}%`,
            action: {
              label: 'View Analysis',
              url: `https://growthengine.ai/projects/${project.id}/competitors/${competitor.id}`
            }
          })
        }

        // Find new competitor keywords
        const newKeywords = await semrush.getCompetitorKeywords({
          domain: competitor.domain,
          limit: 100
        })

        for (const kw of newKeywords.slice(0, 20)) {
          const existing = await db.keywords.findOne({
            projectId: project.id,
            keyword: kw.keyword
          })

          if (!existing && kw.searchVolume > 500) {
            // New high-value keyword opportunity
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
              source: 'competitor'
            })
          }
        }
      }
    }
  })

  // ============================================================================
  // USER ACTION: Bulk Keyword Import
  // ============================================================================

  on.user.action('bulk-import-keywords', async (params: { projectId: string; keywords: string[] }) => {
    const project = await db.project(params.projectId).get()

    let imported = 0
    let skipped = 0

    for (const keyword of params.keywords) {
      // Check if exists
      const existing = await db.keywords.findOne({ projectId: params.projectId, keyword })

      if (existing) {
        skipped++
        continue
      }

      // Research keyword
      const data = await semrush.researchKeywords({ keyword, limit: 1 })

      if (data.length === 0) {
        skipped++
        continue
      }

      const kw = data[0]

      await db.keywords.create({
        projectId: params.projectId,
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
        source: 'ai-generated'
      })

      imported++
    }

    await send.notification({
      userId: project.userId,
      title: 'Bulk Import Complete',
      message: `Imported ${imported} keywords, skipped ${skipped}`,
      action: {
        label: 'View Keywords',
        url: `https://growthengine.ai/projects/${params.projectId}/keywords`
      }
    })
  })

  // ============================================================================
  // USER ACTION: Generate White-Label Report
  // ============================================================================

  on.user.action('generate-report', async (params: { projectId: string; type: 'weekly' | 'monthly' | 'custom' }) => {
    const project = await db.project(params.projectId).get()
    const workspace = await db.workspaces.findOne({ userId: project.userId })

    // Calculate period
    const end = new Date()
    const start = new Date()

    if (params.type === 'weekly') {
      start.setDate(start.getDate() - 7)
    } else if (params.type === 'monthly') {
      start.setMonth(start.getMonth() - 1)
    }

    // Gather metrics (same as monthly report above)
    const metrics = {
      keywordsTracked: await db.keywords.count({ projectId: params.projectId, tracked: true }),
      avgPosition: 0,
      positionChanges: 0,
      contentPublished: await db.content.count({ projectId: params.projectId, publishedAt: { $gte: start } }),
      backlinksEarned: await db.backlinks.count({ projectId: params.projectId, discoveredAt: { $gte: start } }),
      organicTraffic: 0
    }

    const aiSummary = await aiHelpers.generateReportSummary({ metrics, period: params.type })

    const report = await db.reports.create({
      projectId: params.projectId,
      type: params.type,
      period: { start, end },
      metrics,
      summary: aiSummary.summary,
      recommendations: aiSummary.recommendations,
      generatedAt: new Date(),
      recipients: []
    })

    await send.notification({
      userId: project.userId,
      title: 'Report Generated',
      message: `${params.type} report for ${project.name}`,
      action: {
        label: 'View Report',
        url: `https://growthengine.ai/reports/${report.id}`
      }
    })
  })

  return {
    name: 'GrowthEngine.ai',
    description: 'Autonomous SEO for agencies',
    version: '1.0.0'
  }
}
