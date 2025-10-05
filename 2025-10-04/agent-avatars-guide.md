# Agent Avatar Requirements & Recommendations

**Date:** 2025-10-04
**Status:** Planning phase
**Context:** Need pictures for all 7 named agents (Amy, Alex, Morgan, Riley, Jordan, Taylor, Sam)

## Current State

All 7 named agent MDX files already have avatar configuration:

```yaml
avatar:
  image: /avatars/[name].png
  background: gradient-[color]
```

**Files needing images:**
- `/avatars/amy.png` - Sales Development Representative (warm, consultative)
- `/avatars/alex.png` - Data Scientist (analytical, precise)
- `/avatars/morgan.png` - Content Strategist (creative, expressive)
- `/avatars/riley.png` - Technical Support (patient, thorough)
- `/avatars/jordan.png` - Strategic Business Advisor (insightful, direct)
- `/avatars/taylor.png` - Operations Coordinator (organized, efficient)
- `/avatars/sam.png` - Financial Analyst (detail-oriented, pragmatic)

## Avatar Specifications

### Technical Requirements
- **Format:** PNG with transparency
- **Dimensions:** 512x512px (minimum), 1024x1024px (recommended)
- **File size:** < 200KB per image
- **Style:** Professional, modern, consistent across all agents

### Personality Alignment

Each avatar should visually reflect the agent's personality:

**Amy** (gradient-pink background):
- Warm, approachable expression
- Professional but friendly
- Sales-oriented, confident

**Alex** (gradient-blue background):
- Analytical, thoughtful expression
- Technical, precise
- Data scientist vibe

**Morgan** (gradient-orange background):
- Creative, expressive
- Energetic, innovative
- Content creator aesthetic

**Riley** (gradient-green background):
- Patient, calm expression
- Supportive, empathetic
- Technical support professional

**Jordan** (gradient-navy background):
- Confident, strategic expression
- Executive presence
- Business advisor authority

**Taylor** (gradient-teal background):
- Organized, efficient expression
- Systematic, professional
- Operations coordinator polish

**Sam** (gradient-purple background):
- Detail-oriented, focused expression
- Analytical, pragmatic
- Financial analyst precision

## Recommended Solutions

### Option 1: AI Avatar Generation (Fastest)

**Tools to use:**
1. **Midjourney** (Best quality)
   - Prompt template: "Professional headshot portrait of a [personality] [role], [expression], modern corporate style, clean background, studio lighting, 8k quality --ar 1:1"
   - Cost: $10/month for 200 images
   - Time: ~30 minutes for all 7

2. **DALL-E 3** (Via ChatGPT Plus)
   - Similar prompts as Midjourney
   - Cost: $20/month (includes ChatGPT Plus)
   - Time: ~1 hour for all 7

3. **Stable Diffusion XL** (Free)
   - Run locally or use Replicate.com
   - Cost: Free (local) or $0.10 per image
   - Time: ~2 hours for all 7

**Recommended Prompts:**

```
Amy (Sales): "Professional headshot of a warm, consultative sales representative, friendly smile, confident expression, modern office background, studio lighting, 8k --ar 1:1"

Alex (Data): "Professional headshot of an analytical data scientist, thoughtful expression, precise demeanor, modern tech office, studio lighting, 8k --ar 1:1"

Morgan (Content): "Professional headshot of a creative content strategist, expressive and innovative, energetic vibe, modern agency office, studio lighting, 8k --ar 1:1"

Riley (Support): "Professional headshot of a patient technical support specialist, calm and empathetic expression, supportive demeanor, modern help desk, studio lighting, 8k --ar 1:1"

Jordan (Strategy): "Professional headshot of a confident strategic business advisor, executive presence, authoritative expression, modern boardroom, studio lighting, 8k --ar 1:1"

Taylor (Operations): "Professional headshot of an organized operations coordinator, efficient and systematic expression, professional polish, modern office, studio lighting, 8k --ar 1:1"

Sam (Finance): "Professional headshot of a detail-oriented financial analyst, focused and pragmatic expression, analytical demeanor, modern finance office, studio lighting, 8k --ar 1:1"
```

### Option 2: Stock Photos (Good balance)

**Resources:**
1. **Unsplash** - Free, high quality
2. **Pexels** - Free, good selection
3. **Getty Images/iStock** - Premium, $10-50 per image

**Search terms:**
- "professional headshot"
- "[role] portrait"
- "modern business portrait"
- "corporate headshot"

### Option 3: Professional Photography

**When to use:**
- Brand consistency critical
- Budget available ($500-2000 for shoot)
- Need custom poses/expressions
- Multi-use licensing required

### Option 4: Illustrated Avatars (Alternative style)

**Tools:**
1. **Humaaans** (humaaans.com) - Free illustrated people
2. **Open Peeps** (openpeeps.com) - Free hand-drawn avatars
3. **avataaars** (getavataaars.com) - Free customizable avatars

**Pros:**
- Consistent style guaranteed
- No licensing issues
- Easy to modify
- Scalable vector format

**Cons:**
- Less realistic
- May feel less premium
- Limited emotional range

## Implementation Steps

### 1. Generate/Source Images
Choose one option above and create all 7 images.

### 2. Optimize Images
```bash
# Install optimization tools
brew install imageoptim-cli

# Optimize all avatars
imageoptim --quality 85 /avatars/*.png
```

### 3. Create Avatar Directory
```bash
mkdir -p examples/agents/public/avatars
cp *.png examples/agents/public/avatars/
```

### 4. Verify in MDX Files
All agent files already reference `/avatars/[name].png`, so once images are in place, they'll automatically load.

### 5. Add Gradient Backgrounds (CSS)
Each agent has a gradient background specified. Example implementation:

```css
/* In your CSS/Tailwind config */
.gradient-pink { background: linear-gradient(135deg, #FFB6C1 0%, #FF69B4 100%); }
.gradient-blue { background: linear-gradient(135deg, #87CEEB 0%, #4682B4 100%); }
.gradient-orange { background: linear-gradient(135deg, #FFA500 0%, #FF8C00 100%); }
.gradient-green { background: linear-gradient(135deg, #90EE90 0%, #3CB371 100%); }
.gradient-navy { background: linear-gradient(135deg, #4169E1 0%, #000080 100%); }
.gradient-teal { background: linear-gradient(135deg, #40E0D0 0%, #008B8B 100%); }
.gradient-purple { background: linear-gradient(135deg, #DDA0DD 0%, #9370DB 100%); }
```

## Licensing Considerations

### Commercial Use
All avatars must be licensed for:
- ✅ Commercial use
- ✅ Digital products
- ✅ Web display
- ✅ Marketing materials
- ✅ Modifications allowed

### AI-Generated Images
- Midjourney: You own images (with paid plan)
- DALL-E: You own images (with ChatGPT Plus)
- Stable Diffusion: Open license, you own images

### Stock Photos
- Read license carefully
- Extended license often required for software
- Model releases required for faces

### Illustrated Avatars
- Check specific tool licenses
- Many are CC0 (public domain)
- Some require attribution

## Budget Estimates

| Option | Cost | Time | Quality |
|--------|------|------|---------|
| Midjourney | $10 | 30min | ⭐⭐⭐⭐⭐ |
| DALL-E 3 | $20 | 1hr | ⭐⭐⭐⭐⭐ |
| Stable Diffusion | Free | 2hr | ⭐⭐⭐⭐ |
| Stock Photos | Free-$350 | 2-4hr | ⭐⭐⭐⭐ |
| Illustrated | Free | 3-5hr | ⭐⭐⭐ |
| Photography | $500-2000 | 1-2 weeks | ⭐⭐⭐⭐⭐ |

## Next Steps

1. **Choose approach** (Recommended: Midjourney or DALL-E 3)
2. **Generate all 7 avatars** using personality-aligned prompts
3. **Optimize images** (compress to <200KB each)
4. **Place in `/avatars/` directory**
5. **Test in development** (verify all agents display correctly)
6. **Update todo list** when complete

## Related Files

- Agent MDX files: `examples/agents/named/*.do.mdx`
- Avatar directory: `examples/agents/public/avatars/`
- Website template: TBD (next phase after avatars)

---

**Recommendation:** Use **Midjourney** for highest quality professional headshots that match each agent's personality. Total cost: $10, total time: ~30 minutes.

If Midjourney is not available, use **DALL-E 3 via ChatGPT Plus** as second choice.
