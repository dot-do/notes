---
title: Registrar Domain Fetch Implementation
date: 2025-10-04
tags: [domains, registrars, automation, github-issue-2]
---

# Registrar Domain Fetch Implementation

## Summary

Implemented multi-registrar domain fetching system to complement the existing domain enrichment pipeline.

## Work Completed

### 1. Created Registrar Fetch Script (`scripts/fetch-registrar-domains.ts`)

**Features:**
- Fetches domains from all four registrars: Porkbun, Dynadot, Netim, and Sav
- Parallel API calls for performance
- Comprehensive error handling with graceful degradation
- Rich output with TLD grouping and statistics
- Saves to JSON for integration with enrichment pipeline

**API Integrations:**
- **Porkbun**: REST API with API key + secret key authentication
- **Dynadot**: REST API with query parameter authentication
- **Netim**: REST API with HTTP Basic authentication
- **Sav**: REST API with Bearer token authentication

**Output:**
```typescript
{
  fetchedAt: string,           // ISO timestamp
  totalDomains: number,
  byRegistrar: {
    porkbun: number,
    dynadot: number,
    netim: number,
    sav: number
  },
  byTld: {
    [tld: string]: DomainInfo[]
  },
  domains: DomainInfo[]       // All domains with metadata
}
```

### 2. Updated Environment Configuration

Added registrar API credentials to `scripts/.env.example`:
```env
PORKBUN_API_KEY=...
PORKBUN_SECRET_KEY=...
DYNADOT_API_KEY=...
NETIM_USERNAME=...
NETIM_PASSWORD=...
SAV_API_KEY=...
```

### 3. Commits Created

**Commit 1: `2c58fd0`** - Add domain enrichment and registrar fetching tools
- New external config system (config/domain-test-configs.json)
- Updated enrich-domains.ts to use external configs
- New fetch-registrar-domains.ts script
- Updated .env.example

**Commit 2: `6a79795`** - Update domain MDX files with HTTP verification
- All 105 .do domains enriched with HTTP status
- 15 utility domains configured with custom test paths
- Clear documentation of working vs broken domains

## Integration Flow

```
┌─────────────────────────────────────────────────────────┐
│                  Domain Inventory System                 │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │  Registrar APIs Fetch     │
              │  (Porkbun, Dynadot,       │
              │   Netim, Sav)             │
              └───────────┬───────────────┘
                          │
                          ▼
              ┌───────────────────────────┐
              │  registrar-domains.json   │
              │  - All domains            │
              │  - Expiration dates       │
              │  - Auto-renew status      │
              └───────────┬───────────────┘
                          │
                          ▼
              ┌───────────────────────────┐
              │  Domain Enrichment        │
              │  (WHOIS + Cloudflare +    │
              │   HTTP verification)      │
              └───────────┬───────────────┘
                          │
                          ▼
              ┌───────────────────────────┐
              │  sites/do/[domain]/       │
              │  index.mdx                │
              │  - Complete metadata      │
              │  - Health status          │
              └───────────────────────────┘
```

## Next Steps

### Immediate (User Action Required)
1. **Set up registrar API credentials**
   - Get API keys from all four registrars
   - Add to `scripts/.env` file
   - Test with: `bun scripts/fetch-registrar-domains.ts`

### Phase 2 (Automation)
1. **Initial Domain Inventory**
   - Run fetch script with real credentials
   - Compare output with existing domain-ownership.json
   - Identify any missing domains

2. **GitHub Actions Automation**
   - Schedule daily fetches from registrars
   - Auto-trigger enrichment for new/changed domains
   - Alert on expiring domains (<90 days)
   - Auto-renew critical domains

3. **Integration with Issue #2**
   - Use complete domain list for worker route configuration
   - Ensure all owned domains route through api worker
   - Track which domains are active vs dormant

### Phase 3 (Monitoring & Alerts)
1. **Expiration Monitoring**
   - Weekly reports of domains expiring in <90 days
   - Automatic renewal for critical domains
   - Slack/email notifications

2. **Health Monitoring**
   - Track HTTP status changes over time
   - Alert on newly broken domains
   - Monitor nameserver configuration changes

3. **Cost Optimization**
   - Identify unused domains for non-renewal
   - Track renewal costs by registrar
   - Suggest consolidation opportunities

## Technical Notes

### API Rate Limits
- **Porkbun**: No documented rate limits, but be reasonable
- **Dynadot**: 100 requests per minute
- **Netim**: Varies by account type
- **Sav**: Check API documentation

### Error Handling
Script gracefully handles:
- Missing credentials (warns and continues with other registrars)
- API errors (logs error and returns empty array)
- Network timeouts (falls back to empty data)
- Invalid responses (catches and logs)

### Security Considerations
- API credentials should NEVER be committed
- Use GitHub Secrets for Actions automation
- Rotate API keys periodically
- Use least-privilege API keys when possible

## Files Modified

```
.
├── config/
│   └── domain-test-configs.json          [NEW]
├── data/
│   └── registrar-domains.json            [NEW]
├── scripts/
│   ├── .env.example                      [MODIFIED]
│   ├── enrich-domains.ts                 [MODIFIED]
│   └── fetch-registrar-domains.ts        [NEW]
├── sites/do/
│   └── */index.mdx                       [MODIFIED - 105 files]
└── notes/
    └── 2025-10-04-registrar-fetch-implementation.md [THIS FILE]
```

## Related Documentation

- [Domain Enrichment Report](./2025-10-04-domain-enrichment.md) - Initial enrichment results
- [Domain HTTP Verification](./2025-10-04-domain-http-verification.md) - HTTP check implementation
- [GitHub Issue #2](https://github.com/dot-do/.do/issues/2) - Domain inventory and routing

## Session Stats

- **Files Created**: 3
- **Files Modified**: 110
- **Lines Added**: ~500
- **Domains Processed**: 105
- **Registrars Integrated**: 4
- **Commits**: 2
- **Status**: ✅ Complete and pushed to GitHub
