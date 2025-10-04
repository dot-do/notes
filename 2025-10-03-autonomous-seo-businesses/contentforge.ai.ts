/**
 * ContentForge.ai - AI-Powered Content Creation & Monetization
 *
 * Brand: ContentForge.ai
 * ICP: Bloggers, content creators, publishers, influencers
 * Pricing: $99 Creator | $199 Pro | $499 Business
 * Automation: AI-powered content pipeline
 *
 * Features:
 * - AI content ideation & trending topics
 * - Auto-generation with brand voice
 * - Content calendar & scheduling
 * - Multi-channel publishing (blog, social, email)
 * - Monetization tracking & optimization
 * - Audience analytics & engagement
 * - Content repurposing automation
 */

import type { BusinessRuntime } from '@mastra/graphdl'
import { semrushAPI, aiUtils, schemaUtils, llmsTxtUtils, classifyIntent, calculatePriority } from './shared-seo-lib'
import type { User, Project, Keyword, Content } from './db-schema'

export const contentForge = ($: BusinessRuntime) => {
  const { ai, api, db, decide, every, on, send, user } = $

  // Get API integrations
  const semrush = semrushAPI($)
  const aiHelpers = aiUtils($)

  // ============================================================================
  // EVENT: New Creator Account Created
  // ============================================================================

  on.user.created(async (newUser: User) => {
    // Send creator welcome email
    await send.email({
      to: newUser.email,
      subject: '✨ Welcome to ContentForge.ai - Your AI Content Partner',
      template: 'creator-onboarding',
      data: {
        name: newUser.name,
        setupUrl: `https://contentforge.ai/setup?user=${newUser.id}`,
        contentCalendarUrl: `https://contentforge.ai/calendar`,
        templateLibraryUrl: 'https://contentforge.ai/templates'
      }
    })

    // Create creator profile
    await db.profiles.create({
      userId: newUser.id,
      displayName: newUser.name,
      niche: newUser.metadata?.niche || 'general',
      brandVoice: {
        tone: 'professional',
        style: 'conversational',
        personality: 'helpful',
        audience: 'general'
      },
      contentGoals: {
        articlesPerWeek: 3,
        targetWordCount: 1500,
        preferredFormats: ['blog', 'guide', 'how-to']
      },
      monetization: {
        adsEnabled: false,
        affiliatesEnabled: false,
        sponsorshipsEnabled: false,
        revenue: 0
      }
    })

    // Award creator bonus
    await db.credits.create({
      userId: newUser.id,
      type: 'bonus',
      amount: 200,
      balance: 200,
      reason: 'Creator welcome bonus - start creating amazing content!',
      createdAt: new Date()
    })
  })

  // ============================================================================
  // EVENT: Content Project Created
  // ============================================================================

  on.project.created(async (project: Project) => {
    const profile = await db.profiles.findOne({ userId: project.userId })

    // AI-powered niche analysis
    const nicheAnalysis = await ai.generate({
      prompt: `Analyze this content niche and provide a content strategy:

Domain: ${project.domain}
Niche: ${profile?.niche || 'general'}
Primary Keywords: ${project.primaryKeywords.join(', ')}

Provide:
1. Top 10 trending topics in this niche
2. 5 content pillar ideas
3. Recommended content mix (how-tos, lists, guides, etc.)
4. Best publishing frequency
5. Monetization opportunities

Format as structured JSON.`,
      maxTokens: 1500
    })

    try {
      const strategy = JSON.parse(nicheAnalysis)

      // Save content strategy
      await db.strategies.create({
        projectId: project.id,
        trendingTopics: strategy.trendingTopics || [],
        contentPillars: strategy.contentPillars || [],
        contentMix: strategy.contentMix || {},
        publishingFrequency: strategy.publishingFrequency || '3 per week',
        monetizationOpportunities: strategy.monetizationOpportunities || [],
        createdAt: new Date()
      })

      // Generate initial content ideas
      for (const topic of (strategy.trendingTopics || []).slice(0, 10)) {
        await db.contentIdeas.create({
          projectId: project.id,
          topic: topic.title || topic,
          description: topic.description || '',
          targetKeyword: topic.keyword || '',
          estimatedTraffic: topic.searchVolume || 0,
          difficulty: topic.difficulty || 50,
          priority: calculatePriority({
            searchVolume: topic.searchVolume || 1000,
            difficulty: topic.difficulty || 50,
            cpc: topic.cpc || 0
          }),
          status: 'idea',
          createdAt: new Date()
        })
      }
    } catch (e) {
      console.error('Failed to parse niche analysis:', e)
    }

    await send.notification({
      userId: project.userId,
      title: `Content Strategy Ready: ${project.name}`,
      message: `${await db.contentIdeas.count({ projectId: project.id })} trending topics identified`,
      action: {
        label: 'View Ideas',
        url: `https://contentforge.ai/projects/${project.id}/ideas`
      }
    })
  })

  // ============================================================================
  // CRON: Daily Trending Topics Discovery (7 AM)
  // ============================================================================

  every.day.at('07:00', async () => {
    const projects = await db.projects.find({ status: 'active' })

    for (const project of projects) {
      const profile = await db.profiles.findOne({ userId: project.userId })

      // Find trending keywords in the niche
      const seedKeywords = project.primaryKeywords.length > 0
        ? project.primaryKeywords
        : [profile?.niche || 'general']

      for (const seed of seedKeywords.slice(0, 3)) {
        const related = await semrush.researchKeywords({
          keyword: seed,
          limit: 50
        })

        // Find high-potential topics
        const highPotential = related.filter(kw =>
          kw.searchVolume > 500 &&
          kw.difficulty < 50 &&
          kw.trend.length > 0 &&
          kw.trend[kw.trend.length - 1] > kw.trend[0] // Trending up
        )

        for (const kw of highPotential.slice(0, 5)) {
          // Check if idea already exists
          const existing = await db.contentIdeas.findOne({
            projectId: project.id,
            targetKeyword: kw.keyword
          })

          if (!existing) {
            // Generate content angle
            const angle = await ai.generate({
              prompt: `Create a compelling content angle for: "${kw.keyword}"

Requirements:
- Unique perspective
- Target audience: ${profile?.brandVoice?.audience || 'general'}
- Tone: ${profile?.brandVoice?.tone || 'professional'}
- 1-2 sentences

Format: Just the angle, no extra text.`,
              maxTokens: 100
            })

            await db.contentIdeas.create({
              projectId: project.id,
              topic: kw.keyword,
              description: angle.trim(),
              targetKeyword: kw.keyword,
              estimatedTraffic: kw.searchVolume,
              difficulty: kw.difficulty,
              priority: calculatePriority({
                searchVolume: kw.searchVolume,
                difficulty: kw.difficulty,
                cpc: kw.cpc
              }),
              status: 'idea',
              createdAt: new Date()
            })
          }
        }
      }

      // Notify about new trending topics
      const newIdeas = await db.contentIdeas.count({
        projectId: project.id,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })

      if (newIdeas > 0) {
        await send.notification({
          userId: project.userId,
          title: `${newIdeas} New Trending Topics`,
          message: `Fresh content ideas for ${project.name}`,
          action: {
            label: 'Review Ideas',
            url: `https://contentforge.ai/projects/${project.id}/ideas`
          }
        })
      }
    }
  })

  // ============================================================================
  // CRON: Content Calendar Auto-Generation (Monday 8 AM)
  // ============================================================================

  every.monday.at('08:00', async () => {
    const projects = await db.projects.find({ status: 'active' })

    for (const project of projects) {
      const user = await db.user(project.userId).get()
      const profile = await db.profiles.findOne({ userId: project.userId })

      // Check content goals
      const articlesPerWeek = profile?.contentGoals?.articlesPerWeek || 3

      // Get top priority content ideas
      const ideas = await db.contentIdeas.find({
        projectId: project.id,
        status: 'idea',
        priority: { $gte: 60 }
      })

      if (ideas.length === 0) continue

      ideas.sort((a, b) => b.priority - a.priority)

      // Schedule content for the week
      const today = new Date()
      const schedules = []

      for (let i = 0; i < Math.min(articlesPerWeek, ideas.length); i++) {
        const idea = ideas[i]

        // Calculate publish date (spread across the week)
        const publishDate = new Date(today)
        publishDate.setDate(publishDate.getDate() + (i * Math.floor(7 / articlesPerWeek)))

        schedules.push({
          idea,
          publishDate
        })

        // Update idea status
        await db.contentIdea(idea.id).update({
          status: 'scheduled',
          scheduledFor: publishDate
        })
      }

      // Notify creator about weekly plan
      await send.email({
        to: user.email,
        subject: `📅 Your Content Calendar for This Week`,
        template: 'weekly-content-plan',
        data: {
          projectName: project.name,
          scheduledContent: schedules.map(s => ({
            topic: s.idea.topic,
            date: s.publishDate.toLocaleDateString(),
            estimatedTraffic: s.idea.estimatedTraffic
          })),
          calendarUrl: `https://contentforge.ai/projects/${project.id}/calendar`
        }
      })
    }
  })

  // ============================================================================
  // CRON: Automated Content Creation (Daily 9 AM)
  // ============================================================================

  every.day.at('09:00', async () => {
    const scheduledIdeas = await db.contentIdeas.find({
      status: 'scheduled',
      scheduledFor: { $lte: new Date() }
    })

    for (const idea of scheduledIdeas) {
      const project = await db.project(idea.projectId).get()
      const user = await db.user(project.userId).get()
      const profile = await db.profiles.findOne({ userId: project.userId })

      // Check plan limits
      const monthlyLimit = user.plan === 'creator' ? 12 : user.plan === 'pro' ? 40 : 120

      const thisMonth = new Date()
      thisMonth.setDate(1)
      thisMonth.setHours(0, 0, 0, 0)

      const contentThisMonth = await db.content.count({
        projectId: project.id,
        publishedAt: { $gte: thisMonth }
      })

      if (contentThisMonth >= monthlyLimit) {
        // At limit, reschedule
        await db.contentIdea(idea.id).update({
          scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
          status: 'idea'
        })
        continue
      }

      // Generate content with brand voice
      const article = await ai.generate({
        prompt: `Write a ${profile?.contentGoals?.targetWordCount || 1500}-word article:

Topic: ${idea.topic}
Angle: ${idea.description}
Target Keyword: ${idea.targetKeyword}

Brand Voice:
- Tone: ${profile?.brandVoice?.tone || 'professional'}
- Style: ${profile?.brandVoice?.style || 'conversational'}
- Personality: ${profile?.brandVoice?.personality || 'helpful'}
- Audience: ${profile?.brandVoice?.audience || 'general'}

Requirements:
- Authentic and engaging
- Match brand voice precisely
- Natural keyword usage
- Clear structure with H2/H3
- Actionable insights
- Include personal examples if appropriate
- FAQ section
- Call-to-action

Format as markdown.`,
        maxTokens: 4000
      })

      // Extract title
      const titleMatch = article.match(/^#\s+(.+)$/m)
      const title = titleMatch ? titleMatch[1] : idea.topic

      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

      // Generate meta description
      const metaDescription = await aiHelpers.generateMetaDescription({
        title,
        keyword: idea.targetKeyword,
        contentSummary: idea.description
      })

      // Generate schema markup
      const schemaMarkup = schemaUtils.generateArticleSchema({
        title,
        description: metaDescription,
        url: `https://${project.domain}/blog/${slug}`,
        datePublished: new Date().toISOString(),
        author: {
          name: profile?.displayName || user.name,
          url: `https://${project.domain}/about`
        }
      })

      // Create content
      const content = await db.content.create({
        projectId: project.id,
        title,
        slug,
        url: `https://${project.domain}/blog/${slug}`,
        type: 'blog',
        targetKeywords: [idea.targetKeyword],
        metaDescription,
        h1: title,
        wordCount: article.split(/\s+/).length,
        contentBrief: idea.description,
        aiGenerated: true,
        generatedBy: 'gpt-4',
        schemaType: ['Article'],
        schemaMarkup,
        publishedAt: new Date(),
        lastUpdatedAt: new Date(),
        needsUpdate: false,
        status: 'published'
      })

      // Update idea status
      await db.contentIdea(idea.id).update({ status: 'published' })

      // Update user stats
      await db.user(project.userId).update({
        contentGenerated: user.contentGenerated + 1
      })

      // Notify creator
      await send.notification({
        userId: project.userId,
        title: `✍️ New Article Published: ${title}`,
        message: `${content.wordCount} words | Target: ${idea.targetKeyword}`,
        action: {
          label: 'View Article',
          url: content.url
        }
      })

      // Auto-repurpose to social media
      if (user.plan !== 'creator') {
        await repurposeToSocial(content, profile)
      }
    }
  })

  // ============================================================================
  // Helper: Content Repurposing
  // ============================================================================

  async function repurposeToSocial(content: Content, profile: any) {
    // Generate Twitter thread
    const twitterThread = await ai.generate({
      prompt: `Convert this article into a Twitter thread (max 8 tweets):

Title: ${content.title}
Word Count: ${content.wordCount}

Requirements:
- Hook in first tweet
- Key insights in subsequent tweets
- Each tweet: 240 chars max
- End with call-to-action linking to article
- Maintain brand voice: ${profile?.brandVoice?.tone || 'professional'}

Format as numbered tweets.`,
      maxTokens: 500
    })

    // Generate LinkedIn post
    const linkedinPost = await ai.generate({
      prompt: `Convert this article into a LinkedIn post:

Title: ${content.title}

Requirements:
- Professional tone
- 1-2 paragraphs (200-300 words)
- Include 3-5 relevant hashtags
- End with link to full article
- Conversational but authoritative

Format as ready-to-post text.`,
      maxTokens: 400
    })

    // Save social content
    await db.socialContent.create({
      contentId: content.id,
      platform: 'twitter',
      content: twitterThread,
      status: 'draft',
      createdAt: new Date()
    })

    await db.socialContent.create({
      contentId: content.id,
      platform: 'linkedin',
      content: linkedinPost,
      status: 'draft',
      createdAt: new Date()
    })
  }

  // ============================================================================
  // CRON: Monetization Analytics (Daily 10 PM)
  // ============================================================================

  every.day.at('22:00', async () => {
    const profiles = await db.profiles.find({
      'monetization.adsEnabled': true
    })

    for (const profile of profiles) {
      const user = await db.user(profile.userId).get()
      const projects = await db.projects.find({ userId: profile.userId })

      let totalRevenue = 0
      let totalClicks = 0
      let topEarners: any[] = []

      for (const project of projects) {
        // Get content performance
        const content = await db.content.find({
          projectId: project.id,
          status: 'published'
        })

        for (const article of content) {
          const performance = article.metadata?.performance

          if (performance) {
            // Estimate revenue (simplified)
            const estimatedRevenue = performance.clicks * 0.5 // $0.50 per click
            totalRevenue += estimatedRevenue
            totalClicks += performance.clicks

            topEarners.push({
              title: article.title,
              clicks: performance.clicks,
              revenue: estimatedRevenue,
              url: article.url
            })
          }
        }
      }

      // Update profile monetization
      await db.profile(profile.id).update({
        'monetization.revenue': totalRevenue
      })

      // Sort top earners
      topEarners.sort((a, b) => b.revenue - a.revenue)

      // Send monetization report
      await send.email({
        to: user.email,
        subject: `💰 Daily Revenue Report: $${totalRevenue.toFixed(2)}`,
        template: 'monetization-report',
        data: {
          totalRevenue: totalRevenue.toFixed(2),
          totalClicks,
          topEarners: topEarners.slice(0, 5),
          dashboardUrl: 'https://contentforge.ai/monetization'
        }
      })
    }
  })

  // ============================================================================
  // USER ACTION: Request Content Ideas
  // ============================================================================

  on.user.action('request-ideas', async (params: { projectId: string; count: number }) => {
    const project = await db.project(params.projectId).get()
    const profile = await db.profiles.findOne({ userId: project.userId })

    // AI-powered idea generation
    const ideas = await ai.generate({
      prompt: `Generate ${params.count} unique content ideas for:

Niche: ${profile?.niche || 'general'}
Domain: ${project.domain}
Primary Keywords: ${project.primaryKeywords.join(', ')}
Brand Voice: ${profile?.brandVoice?.tone || 'professional'}

For each idea provide:
1. Catchy title
2. Unique angle
3. Target keyword
4. Estimated difficulty (1-100)

Format as JSON array.`,
      maxTokens: 1500
    })

    try {
      const generatedIdeas = JSON.parse(ideas)

      for (const idea of generatedIdeas) {
        await db.contentIdeas.create({
          projectId: params.projectId,
          topic: idea.title,
          description: idea.angle,
          targetKeyword: idea.keyword,
          estimatedTraffic: idea.searchVolume || 1000,
          difficulty: idea.difficulty || 50,
          priority: calculatePriority({
            searchVolume: idea.searchVolume || 1000,
            difficulty: idea.difficulty || 50,
            cpc: 0
          }),
          status: 'idea',
          createdAt: new Date()
        })
      }

      await send.notification({
        userId: project.userId,
        title: `${generatedIdeas.length} New Ideas Generated`,
        message: `Fresh content ideas ready for ${project.name}`,
        action: {
          label: 'Review Ideas',
          url: `https://contentforge.ai/projects/${params.projectId}/ideas`
        }
      })
    } catch (e) {
      console.error('Failed to parse ideas:', e)
    }
  })

  // ============================================================================
  // USER ACTION: Optimize Content for Monetization
  // ============================================================================

  on.user.action('optimize-monetization', async (params: { contentId: string }) => {
    const content = await db.content(params.contentId).get()
    const project = await db.project(content.projectId).get()

    // AI-powered monetization recommendations
    const recommendations = await ai.generate({
      prompt: `Analyze this content and suggest monetization improvements:

Title: ${content.title}
Word Count: ${content.wordCount}
Target Keywords: ${content.targetKeywords.join(', ')}

Provide recommendations for:
1. Affiliate product opportunities (specific products/services)
2. Ad placement optimization (where to place ads)
3. Content upgrades (lead magnets, downloads)
4. Sponsored content angles
5. Email list building strategies

Format as actionable markdown with specific suggestions.`,
      maxTokens: 1000
    })

    await send.notification({
      userId: project.userId,
      title: `Monetization Plan Ready`,
      message: `Optimization recommendations for "${content.title}"`,
      action: {
        label: 'View Recommendations',
        url: `https://contentforge.ai/content/${params.contentId}/monetize`
      },
      metadata: { recommendations }
    })
  })

  return {
    name: 'ContentForge.ai',
    description: 'AI-powered content creation and monetization',
    version: '1.0.0'
  }
}
