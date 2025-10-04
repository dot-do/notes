/**
 * SEOBots.do - Autonomous SEO for Solopreneurs
 *
 * Brand: SEOBots.do
 * ICP: Solopreneurs, indie hackers, small business owners
 * Pricing: $29 Starter | $49 Growth | $99 Pro
 * Automation: Fully autonomous AI-powered SEO
 *
 * Features:
 * - Auto keyword discovery from competitors
 * - AI-powered content generation
 * - Automated publishing & schema markup
 * - Backlink monitoring & outreach
 * - Weekly performance reports
 * - Free credits program for backlinks
 */

import type { BusinessRuntime } from '@mastra/graphdl'
import { semrushAPI, ahrefsAPI, gscAPI, aiUtils, schemaUtils, llmsTxtUtils, classifyIntent, calculatePriority } from './shared-seo-lib'
import type { User, Project, Keyword, Content, Backlink, Report } from './db-schema'

export const seoBots = ($: BusinessRuntime) => {
  const { ai, api, db, decide, every, on, send, user } = $

  // Get API integrations
  const semrush = semrushAPI($)
  const ahrefs = ahrefsAPI($)
  const gsc = gscAPI($)
  const aiHelpers = aiUtils($)

  // ============================================================================
  // EVENT: New User Onboarding
  // ============================================================================

  on.user.created(async (newUser: User) => {
    // Send welcome email with setup guide
    await send.email({
      to: newUser.email,
      subject: '🤖 Welcome to SEOBots.do - Your AI SEO Assistant',
      template: 'onboarding',
      data: {
        name: newUser.name,
        setupUrl: `https://seobots.do/setup?user=${newUser.id}`,
        guideUrl: 'https://seobots.do/guide/getting-started'
      }
    })

    // Create default project if domain provided during signup
    if (user.metadata?.domain) {
      await db.projects.create({
        userId: newUser.id,
        name: `${newUser.metadata.domain} SEO`,
        domain: newUser.metadata.domain,
        targetMarket: 'US',
        primaryKeywords: [],
        competitorDomains: []
      })
    }

    // Award signup bonus credits
    await db.credits.create({
      userId: newUser.id,
      type: 'bonus',
      amount: 100,
      balance: 100,
      reason: 'Welcome bonus - share SEOBots with others to earn backlinks!',
      createdAt: new Date()
    })
  })

  // ============================================================================
  // EVENT: New Project Created
  // ============================================================================

  on.project.created(async (project: Project) => {
    // Discover initial keywords from competitors
    if (project.competitorDomains.length > 0) {
      await ai.generate({
        prompt: `Analyzing competitors for ${project.domain}...`,
        callback: async () => {
          for (const competitor of project.competitorDomains.slice(0, 3)) {
            const keywords = await semrush.getCompetitorKeywords({
              domain: competitor,
              limit: 50
            })

            // Filter and save top keywords
            const topKeywords = keywords
              .filter(k => k.searchVolume > 100 && k.difficulty < 60)
              .slice(0, 20)

            for (const kw of topKeywords) {
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
      })
    }

    // Generate llms.txt for the domain
    const llmsTxt = llmsTxtUtils.generate({
      siteName: project.name,
      description: `SEO-optimized content for ${project.domain} powered by SEOBots.do`,
      mainPages: [
        { title: 'Home', url: `https://${project.domain}`, description: 'Homepage' },
        { title: 'Blog', url: `https://${project.domain}/blog`, description: 'Latest articles' }
      ],
      contactEmail: user.current?.email
    })

    // Notify user
    await send.notification({
      userId: project.userId,
      title: 'Project Setup Complete',
      message: `Found ${await db.keywords.count({ projectId: project.id })} potential keywords for ${project.domain}`,
      action: {
        label: 'View Keywords',
        url: `https://seobots.do/projects/${project.id}/keywords`
      }
    })
  })

  // ============================================================================
  // CRON: Daily Keyword Discovery (9 AM)
  // ============================================================================

  every.day.at('09:00', async () => {
    const projects = await db.projects.find({ status: 'active' })

    for (const project of projects) {
      const user = await db.user(project.userId).get()

      // Check plan limits
      const keywordLimit = user.plan === 'starter' ? 100 : user.plan === 'growth' ? 500 : 2000

      const currentCount = await db.keywords.count({ projectId: project.id })

      if (currentCount >= keywordLimit) {
        continue // Skip if at limit
      }

      // AI-powered keyword expansion
      const existingKeywords = await db.keywords.find({ projectId: project.id, priority: { $gte: 70 } })

      if (existingKeywords.length > 0) {
        const seedKeywords = existingKeywords.slice(0, 5).map(k => k.keyword)

        for (const seed of seedKeywords) {
          const related = await semrush.researchKeywords({
            keyword: seed,
            limit: 20
          })

          for (const kw of related) {
            // Check if keyword already exists
            const existing = await db.keywords.find({ projectId: project.id, keyword: kw.keyword })

            if (existing.length === 0) {
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
                source: 'ai-generated'
              })
            }
          }
        }
      }
    }
  })

  // ============================================================================
  // CRON: Auto Content Generation (10 AM)
  // ============================================================================

  every.day.at('10:00', async () => {
    const projects = await db.projects.find({ status: 'active' })

    for (const project of projects) {
      const user = await db.user(project.userId).get()

      // Check plan limits
      const monthlyContentLimit = user.plan === 'starter' ? 4 : user.plan === 'growth' ? 12 : 40

      const thisMonth = new Date()
      thisMonth.setDate(1)
      thisMonth.setHours(0, 0, 0, 0)

      const contentThisMonth = await db.content.count({
        projectId: project.id,
        publishedAt: { $gte: thisMonth }
      })

      if (contentThisMonth >= monthlyContentLimit) {
        continue // At monthly limit
      }

      // Find top priority keywords without content
      const keywords = await db.keywords.find({
        projectId: project.id,
        tracked: false,
        priority: { $gte: 60 }
      })

      if (keywords.length === 0) continue

      // Sort by priority
      keywords.sort((a, b) => b.priority - a.priority)

      const targetKeyword = keywords[0]

      // Generate content brief
      const brief = await aiHelpers.generateContentBrief({
        primaryKeyword: targetKeyword.keyword,
        relatedKeywords: keywords.slice(1, 6).map(k => k.keyword),
        intent: targetKeyword.intent
      })

      // Generate full article
      const article = await ai.generate({
        prompt: `Write a comprehensive, SEO-optimized ${targetKeyword.intent === 'how-to' ? 'how-to guide' : 'article'} about: ${targetKeyword.keyword}

Content Brief:
${brief}

Requirements:
- 1500-2000 words
- Natural keyword usage
- Clear H2/H3 structure
- Include actionable tips
- Conversational tone
- Include FAQs section

Format as markdown.`,
        maxTokens: 4000
      })

      // Generate meta description
      const metaDescription = await aiHelpers.generateMetaDescription({
        title: targetKeyword.keyword,
        keyword: targetKeyword.keyword,
        contentSummary: brief
      })

      // Extract title from article (first # heading)
      const titleMatch = article.match(/^#\s+(.+)$/m)
      const title = titleMatch ? titleMatch[1] : targetKeyword.keyword

      // Create slug
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

      // Determine schema type
      const schemaType = targetKeyword.intent === 'how-to' ? ['Article', 'HowTo'] : ['Article']

      // Generate schema markup
      let schemaMarkup: any = schemaUtils.generateArticleSchema({
        title,
        description: metaDescription,
        url: `https://${project.domain}/blog/${slug}`,
        datePublished: new Date().toISOString(),
        author: { name: 'SEOBots AI', url: 'https://seobots.do' }
      })

      // Add HowTo schema if applicable
      if (targetKeyword.intent === 'how-to') {
        // Extract steps from article
        const stepMatches = article.matchAll(/###?\s+Step\s+\d+:?\s+(.+)$/gim)
        const steps = Array.from(stepMatches).map(match => ({
          name: match[1],
          text: match[1]
        }))

        if (steps.length > 0) {
          schemaMarkup = [
            schemaMarkup,
            schemaUtils.generateHowToSchema({
              name: title,
              description: metaDescription,
              steps
            })
          ]
        }
      }

      // Save content
      const content = await db.content.create({
        projectId: project.id,
        title,
        slug,
        url: `https://${project.domain}/blog/${slug}`,
        type: targetKeyword.intent === 'how-to' ? 'how-to' : 'blog',
        targetKeywords: [targetKeyword.keyword],
        metaDescription,
        h1: title,
        wordCount: article.split(/\s+/).length,
        contentBrief: brief,
        aiGenerated: true,
        generatedBy: 'gpt-4',
        schemaType,
        schemaMarkup,
        publishedAt: new Date(),
        lastUpdatedAt: new Date(),
        needsUpdate: false,
        status: 'published'
      })

      // Mark keyword as tracked
      await db.keyword(targetKeyword.id).update({ tracked: true, targetUrl: content.url })

      // Increment user stats
      await db.user(project.userId).update({
        contentGenerated: user.contentGenerated + 1
      })

      // Notify user
      await send.notification({
        userId: project.userId,
        title: '✨ New Content Published',
        message: `${title} (${content.wordCount} words)`,
        action: {
          label: 'View Article',
          url: content.url
        }
      })
    }
  })

  // ============================================================================
  // CRON: Backlink Monitoring (Every 3 days at 2 PM)
  // ============================================================================

  every.days(3).at('14:00', async () => {
    const projects = await db.projects.find({ status: 'active' })

    for (const project of projects) {
      // Get current backlinks
      const newBacklinks = await ahrefs.getBacklinks({
        domain: project.domain,
        mode: 'domain',
        limit: 100
      })

      for (const link of newBacklinks) {
        // Check if backlink already exists
        const existing = await db.backlinks.find({
          projectId: project.id,
          sourceUrl: link.sourceUrl
        })

        if (existing.length === 0) {
          // New backlink discovered!
          const backlink = await db.backlinks.create({
            projectId: project.id,
            sourceUrl: link.sourceUrl,
            sourceDomain: link.sourceDomain,
            targetUrl: link.targetUrl,
            anchorText: link.anchorText,
            domainAuthority: link.domainRating,
            domainRating: link.domainRating,
            linkType: link.linkType,
            discoveredAt: new Date(),
            lastChecked: new Date(),
            status: 'active',
            strategy: 'organic'
          })

          // Check if this qualifies for credit reward
          if (link.domainRating >= 30 && link.linkType === 'dofollow') {
            const creditsToAward = Math.min(Math.floor(link.domainRating), 100)

            await db.credits.create({
              userId: project.userId,
              type: 'earned',
              amount: creditsToAward,
              balance: (await db.user(project.userId).get()).credits + creditsToAward,
              reason: `Quality backlink from ${link.sourceDomain} (DR ${link.domainRating})`,
              relatedEntityType: 'backlink',
              relatedEntityId: backlink.id,
              createdAt: new Date()
            })

            await db.user(project.userId).update({
              backlinksEarned: (await db.user(project.userId).get()).backlinksEarned + 1
            })

            // Notify user
            await send.notification({
              userId: project.userId,
              title: '🎉 New Backlink + Credits Earned!',
              message: `${link.sourceDomain} linked to you. Earned ${creditsToAward} credits!`,
              action: {
                label: 'View Backlink',
                url: `https://seobots.do/projects/${project.id}/backlinks`
              }
            })
          }
        }
      }

      // Check for lost backlinks
      const existingBacklinks = await db.backlinks.find({
        projectId: project.id,
        status: 'active'
      })

      for (const existing of existingBacklinks) {
        const stillExists = newBacklinks.find(nb => nb.sourceUrl === existing.sourceUrl)

        if (!stillExists) {
          // Backlink lost
          await db.backlink(existing.id).update({ status: 'lost' })

          await send.notification({
            userId: project.userId,
            title: '⚠️ Backlink Lost',
            message: `${existing.sourceDomain} removed their link`,
            action: {
              label: 'View Details',
              url: `https://seobots.do/projects/${project.id}/backlinks/${existing.id}`
            }
          })
        }
      }
    }
  })

  // ============================================================================
  // CRON: Weekly Performance Reports (Monday 8 AM)
  // ============================================================================

  every.monday.at('08:00', async () => {
    const users = await db.users.find({ subscriptionStatus: 'active' })

    for (const user of users) {
      const projects = await db.projects.find({ userId: user.id })

      if (projects.length === 0) continue

      // Calculate period (last 7 days)
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 7)

      for (const project of projects) {
        // Gather metrics
        const keywordsTracked = await db.keywords.count({ projectId: project.id, tracked: true })
        const contentPublished = await db.content.count({
          projectId: project.id,
          publishedAt: { $gte: start, $lte: end }
        })
        const backlinksEarned = await db.backlinks.count({
          projectId: project.id,
          discoveredAt: { $gte: start, $lte: end }
        })

        // Get average position (if GSC connected)
        let avgPosition = 0
        let organicTraffic = 0

        if (project.googleSearchConsole?.connected) {
          const gscData = await gsc.getSearchAnalytics({
            siteUrl: project.googleSearchConsole.siteUrl,
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            dimensions: ['query']
          })

          if (gscData.length > 0) {
            avgPosition = gscData.reduce((sum, d) => sum + d.position, 0) / gscData.length
            organicTraffic = gscData.reduce((sum, d) => sum + d.clicks, 0)
          }
        }

        const metrics = {
          keywordsTracked,
          avgPosition: Math.round(avgPosition * 10) / 10,
          positionChanges: 0, // TODO: Track from previous week
          contentPublished,
          backlinksEarned,
          organicTraffic
        }

        // Generate AI summary
        const aiSummary = await aiHelpers.generateReportSummary({
          metrics,
          period: 'the past week'
        })

        // Create report
        const report = await db.reports.create({
          projectId: project.id,
          type: 'weekly',
          period: { start, end },
          metrics,
          summary: aiSummary.summary,
          recommendations: aiSummary.recommendations,
          generatedAt: new Date(),
          recipients: [user.email]
        })

        // Send email report
        await send.email({
          to: user.email,
          subject: `📊 Weekly SEO Report - ${project.name}`,
          template: 'weekly-report',
          data: {
            projectName: project.name,
            period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
            metrics,
            summary: aiSummary.summary,
            recommendations: aiSummary.recommendations,
            reportUrl: `https://seobots.do/reports/${report.id}`
          }
        })

        await db.report(report.id).update({ sentAt: new Date() })
      }
    }
  })

  // ============================================================================
  // EVENT: User Upgrades Plan
  // ============================================================================

  on.user.plan.upgraded(async (userId: string, newPlan: string) => {
    await send.email({
      to: (await db.user(userId).get()).email,
      subject: `🚀 Welcome to SEOBots ${newPlan}!`,
      template: 'plan-upgrade',
      data: {
        plan: newPlan,
        features: newPlan === 'pro' ? [
          '2,000 keywords tracked',
          '40 articles/month',
          'Priority support',
          'Advanced analytics'
        ] : [
          '500 keywords tracked',
          '12 articles/month',
          'Email support'
        ]
      }
    })
  })

  // ============================================================================
  // USER ACTION: Request Backlink Outreach
  // ============================================================================

  on.user.action('request-backlink', async (params: { projectId: string; targetDomain: string }) => {
    const project = await db.project(params.projectId).get()
    const user = await db.user(project.userId).get()

    // Check if user has enough credits (50 credits per outreach)
    if (user.credits < 50) {
      await send.notification({
        userId: user.id,
        title: 'Not Enough Credits',
        message: 'You need 50 credits to request backlink outreach. Earn more by getting backlinks!',
        action: {
          label: 'Learn More',
          url: 'https://seobots.do/credits'
        }
      })
      return
    }

    // Deduct credits
    await db.credits.create({
      userId: user.id,
      type: 'spent',
      amount: -50,
      balance: user.credits - 50,
      reason: `Backlink outreach to ${params.targetDomain}`,
      createdAt: new Date()
    })

    await db.user(user.id).update({ credits: user.credits - 50 })

    // Create outreach campaign
    const outreach = await db.outreach.create({
      projectId: params.projectId,
      userId: user.id,
      targetDomain: params.targetDomain,
      targetUrl: `https://${params.targetDomain}`,
      contactEmail: '', // TODO: Find contact email
      creditsOffered: 100,
      offerType: 'developer-advocate',
      emailSent: false,
      opened: false,
      clicked: false,
      replied: false,
      status: 'pending',
      createdAt: new Date()
    })

    // AI-powered email generation
    const email = await ai.generate({
      prompt: `Write a friendly outreach email to ${params.targetDomain} offering them 100 free credits to SEOBots.do in exchange for a backlink.

Context:
- Our domain: ${project.domain}
- Their domain: ${params.targetDomain}
- Offer: $100 worth of free SEO automation credits
- Call-to-action: Include a link to our content

Keep it:
- Short (under 150 words)
- Friendly and authentic
- Focused on value exchange
- Non-spammy`,
      maxTokens: 300
    })

    await send.notification({
      userId: user.id,
      title: 'Outreach Campaign Created',
      message: `Email draft ready for ${params.targetDomain}`,
      action: {
        label: 'Review & Send',
        url: `https://seobots.do/outreach/${outreach.id}`
      }
    })
  })

  return {
    name: 'SEOBots.do',
    description: 'Autonomous SEO for solopreneurs',
    version: '1.0.0'
  }
}
