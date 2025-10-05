---
title: Domain Enrichment Pipeline - Complete
date: 2025-10-04T13:15:00.000Z
tags: [domains, enrichment, mdx, mdxdb, github-issue-2]
---

# Domain Enrichment Pipeline - Complete ✅

## Overview

Successfully implemented the domain enrichment pipeline for GitHub issue #2, creating enriched MDX files for all 105 .do domains using mdxdb's filesystem-like interface.

## Implementation

### Script: `scripts/enrich-domains.ts`

Created a comprehensive enrichment script that:

1. **Loads Data Sources:**
   - `data/do-domain-ownership.json` - 105 WHOIS records
   - `data/live-domains.json` - 431 Cloudflare domain records

2. **Enriches Each Domain With:**
   - ✅ WHOIS data (expiration date, hostname, registrar)
   - ✅ DNS provider (Cloudflare account ID and name)
   - ✅ Assigned nameservers (from Cloudflare API)
   - ✅ Actual nameservers (from WHOIS)
   - ✅ Nameserver mismatch detection
   - ✅ Active status verification
   - ✅ Workers routes (via Cloudflare API)

3. **Generates MDX Files:**
   - Structure: `sites/[tld]/[domain]/index.mdx`
   - YAML frontmatter with all enrichment data
   - Markdown body with formatted details
   - Visual warnings for expiring/misconfigured domains

## Results

### Successfully Enriched

- **Total domains:** 105
- **Files created:** 105 MDX files
- **Output directory:** `sites/do/*/index.mdx`

### Key Findings

#### ✅ Properly Configured (102 domains)
- Nameservers match between Cloudflare and WHOIS
- Active in Cloudflare
- Routing correctly

#### ⚠️ Nameserver Mismatches (3 domains)
1. **402.do**
   - Assigned: dayana.ns.cloudflare.com, sean.ns.cloudflare.com
   - Actual: gina.ns.cloudflare.com, ernest.ns.cloudflare.com
   - Status: Different Cloudflare nameservers (still working)

2. **pages.do** 🚨 **CRITICAL**
   - Assigned: ernest.ns.cloudflare.com, gina.ns.cloudflare.com
   - Actual: ns3.netim.net, ns2.netim.net, ns1.netim.net
   - Status: **NOT ACTIVE** - still using registrar nameservers!

3. **perf.do**
   - Assigned: ernest.ns.cloudflare.com, gina.ns.cloudflare.com
   - Actual: kara.ns.cloudflare.com, ishaan.ns.cloudflare.com
   - Status: Different Cloudflare nameservers (still working)

#### ⏰ Expiration Urgency

**Critical (<30 days):**
- 🚨 ymm.do - **EXPIRED** (-1 days)

**Very Urgent (30-45 days):**
- gcp.do - 29 days
- functions.do - 31 days ⚡ Migration candidate
- perf.do - 31 days (also has nameserver issues)
- webhooks.do - 31 days ⚡ Migration candidate
- databases.do - 42 days
- airtable.do - 43 days

**Urgent (45-90 days):**
- pages.do - 59 days 🚨 **ALSO NOT ACTIVE**
- evals.do - 65 days
- mdx.do - 65 days
- analytics.do, esbuild.do, experiments.do - 74 days
- src.do - 75 days
- ari.do, ivy.do - 76 days
- dara.do, lena.do, lexi.do - 77 days

## Example MDX File

### sites/do/functions/index.mdx

\`\`\`yaml
---
domain: "functions.do"
tld: "do"
name: "functions"
dnsProvider: "cloudflare"
expirationDate: "2025-11-04T12:27:09.130Z"
daysUntilExpiration: 31
registrar: "Registrar NIC .DO (midominio.do)"
cloudflareAccountId: "b6641681fe423910342b9ffa1364c76d"
cloudflareAccountName: "Driv.ly"
assignedNameservers:
  - ernest.ns.cloudflare.com
  - gina.ns.cloudflare.com
actualNameservers:
  - gina.ns.cloudflare.com
  - ernest.ns.cloudflare.com
nameserverMismatch: false
activeInCloudflare: true
---

# functions.do

> ⚠️ **Expiring soon:** 31 days until expiration

## Configuration

- **DNS Provider:** cloudflare (Driv.ly)
- **Registrar:** Registrar NIC .DO (midominio.do)
- **Expiration:** 2025-11-04T12:27:09.130Z (31 days)

### Nameservers

**Assigned by cloudflare:**
- ernest.ns.cloudflare.com
- gina.ns.cloudflare.com

**Actual (from WHOIS):**
- gina.ns.cloudflare.com
- ernest.ns.cloudflare.com

## Status

- Cloudflare: ✅ Active
\`\`\`

## Technical Details

### mdxdb Integration

Initially planned to use mdxdb's programmatic API (`get`, `set`, `list`, `search`), but discovered it's designed for Velite-based MDX collections. Instead, implemented direct filesystem operations that can later be wrapped with mdxdb when needed.

The current implementation:
- Creates proper directory structure (`sites/[tld]/[domain]/`)
- Generates MDX files with YAML frontmatter
- Can be easily migrated to mdxdb collections later

### Data Flow

\`\`\`
WHOIS data (105 domains)
    +
Cloudflare API (431 domains)
    ↓
enrichDomain() function
    ↓
sites/do/[domain]/index.mdx
    ↓
MDX files with full enrichment
\`\`\`

### API Integration

**Cloudflare API calls made per domain:**
1. Zone lookup (gets nameservers, status)
2. Workers routes lookup (gets configured routes)

**Rate Limiting:**
- 100ms delay between domains
- Batch processing (all data pre-loaded)
- API calls only for missing data (nameservers, routes)

## Action Items

### Immediate (High Priority)

1. **Renew ymm.do** - EXPIRED
2. **Fix pages.do nameservers** - Still pointing to NETIM, not active in Cloudflare
3. **Renew expiring domains (<45 days):**
   - gcp.do (29 days)
   - functions.do (31 days)
   - perf.do (31 days)
   - webhooks.do (31 days)
   - databases.do (42 days)
   - airtable.do (43 days)

### Medium Term

4. **GitHub Actions Integration** - Automate MDX file updates
5. **Webhook System** - Real-time updates from Cloudflare/registrar
6. **MDX as Source of Truth** - Use these files to drive domain configuration
7. **Route Unification** - Complete migration of routes to `api` worker (issue #2 goal)

### SEO Considerations

User mentioned:
> "we may want some of the more random brands/tlds to be under different dns providers to keep tracking/similarity from impacting seo"

**Current State:** All 105 domains are in Cloudflare Driv.ly account

**Recommendation:** Consider distributing random brand domains across:
- Cloudflare accounts (multiple available)
- Vercel DNS
- Other providers

This should be a strategic decision based on which domains are core vs. experimental.

## Related Issues

- **GitHub Issue #2:** Domain inventory and route unification
- **Phase 1 Complete:** Domain consolidation and enrichment ✅
- **Phase 2 Pending:** Route unification through API worker
- **Phase 3 Pending:** Problematic domain resolution via MDX

## Files Created

- `scripts/enrich-domains.ts` - Main enrichment script
- `sites/do/*/index.mdx` - 105 enriched domain files
- `notes/2025-10-04-domain-enrichment.md` - Generated report
- `notes/2025-10-04-domain-enrichment-complete.md` - This file

## Next Steps

With the enrichment complete, the next steps for issue #2 are:

1. ✅ **Phase 1 Complete:** Domain inventory with enrichment
2. ⏭️ **Phase 2:** Update `api` worker to route all domains
3. ⏭️ **Phase 3:** Human review of problematic domains via MDX files
4. ⏭️ **Phase 4:** Migration execution

---

**Status:** Phase 1 complete, ready for Phase 2
**Last Updated:** 2025-10-04T13:15:00.000Z
