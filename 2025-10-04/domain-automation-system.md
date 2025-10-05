---
title: Domain Automation System
date: 2025-10-04
tags: [domains, automation, github-actions, cloudflare]
---

# Domain Automation System

Automated domain management with GitHub Actions, Workers Assets, and CI/CD pipeline.

## Overview

The domain automation system maintains an always-up-to-date inventory of all .do domains with automatic enrichment, configuration management, and deployment.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions (Scheduled)                │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
    ┌──────────┐        ┌──────────┐       ┌──────────┐
    │ Hourly   │        │ Weekly   │       │ On Push  │
    │ Status   │        │ WHOIS    │       │ Apply    │
    └────┬─────┘        └────┬─────┘       └────┬─────┘
         │                   │                   │
         │ HTTP + DNS        │ Registrar APIs    │ MDX Changes
         │ Cloudflare        │ WHOIS Data        │
         │                   │                   │
         ▼                   ▼                   ▼
    ┌────────────────────────────────────────────────┐
    │         sites/do/*/index.mdx (105 domains)     │
    │         Source of Truth for Configuration      │
    └────────┬───────────────────────────────────────┘
             │
             │ Git Push
             │
             ▼
    ┌────────────────────────────────────────────────┐
    │         Apply Changes Workflow (CD)            │
    │    - Update Cloudflare DNS/Routes              │
    │    - Rebuild routes worker assets              │
    │    - Deploy to production                      │
    └────────┬───────────────────────────────────────┘
             │
             ▼
    ┌────────────────────────────────────────────────┐
    │         routes.do/domains (Workers Assets)     │
    │         Static JSON + HTML Dashboard           │
    └────────────────────────────────────────────────┘
```

## Components

### 1. Scheduled Enrichment

**Hourly Status Check** (`.github/workflows/domains-hourly-status.yml`)
- Runs every hour at :15 past the hour
- Checks HTTP status for all domains
- Verifies DNS configuration
- Updates Cloudflare/Vercel active status
- Validates nameserver configuration
- **Skips WHOIS** (too slow for hourly)
- Force pushes changes to main

**Weekly WHOIS Refresh** (`.github/workflows/domains-weekly-whois.yml`)
- Runs every Monday at 3 AM UTC
- Fetches from all registrars (Porkbun, Dynadot, Netim, Sav)
- Updates expiration dates
- Refreshes registrar information
- Generates expiration report
- Sends alerts for domains <30 days
- Force pushes changes to main

### 2. Configuration Management

**Apply Changes Workflow** (`.github/workflows/domains-apply-changes.yml`)
- Triggers on push to main (MDX file changes)
- **Loop prevention**: Skips if commit is from github-actions[bot]
- Detects changed domain files
- Applies DNS/route updates to Cloudflare
- Rebuilds routes worker assets
- Deploys to production
- Verifies changes live

**Apply Script** (`scripts/apply-domain-changes.ts`)
- Parses domain MDX frontmatter
- Updates Cloudflare workers routes
- Supports dry-run mode
- Validates nameserver configuration

### 3. Routes Worker API

**Refresh Endpoint** (`POST /api/refresh`)
- Authenticated with Bearer token
- Triggered by GitHub Actions after enrichment
- Logs refresh source and type
- Returns success/error response

**Usage:**
```bash
curl -X POST https://routes.do/api/refresh \
  -H "Authorization: Bearer $ROUTES_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"source": "github-actions", "type": "hourly-status"}'
```

### 4. Manual Triggers

All workflows support `workflow_dispatch` for manual execution:

```bash
# Trigger hourly status check
gh workflow run domains-hourly-status.yml

# Trigger weekly WHOIS refresh
gh workflow run domains-weekly-whois.yml

# Trigger via routes API
curl -X POST https://routes.do/api/refresh \
  -H "Authorization: Bearer $ROUTES_API_KEY" \
  -d '{"source": "manual"}'
```

## Loop Prevention

### Problem

Without loop prevention, the system could create infinite loops:

```
MDX Change → Apply Workflow → Cloudflare Update → ???
     ↑                                              │
     └──────────────────────────────────────────────┘
```

### Solution

**Commit Message Detection:**
```yaml
if: "!contains(github.event.head_commit.message, 'github-actions[bot]')"
```

All automated commits include `github-actions[bot]` in the message, so the apply workflow skips them.

**Bot User Identity:**
```yaml
git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"
```

This clearly identifies automated commits.

**Force Push Strategy:**

Automated enrichment force pushes to main, ensuring clean history without accumulating bot commits:

```yaml
git push origin main --force
```

### Edge Cases

1. **Manual edit → Auto-enrichment conflict**
   - Solution: Enrichment force pushes, manual changes lost
   - Mitigation: Edit via PR, not directly on main

2. **Multiple workflows running simultaneously**
   - Solution: GitHub Actions queues conflicting workflows
   - Mitigation: Different schedules (hourly vs weekly)

3. **Apply workflow modifying MDX**
   - Solution: Apply workflow only updates Cloudflare, not MDX
   - Mitigation: Only enrichment workflows write to MDX

## Secrets Configuration

### Required Secrets

**Cloudflare:**
- `CLOUDFLARE_TOKEN` - API token with DNS and Workers permissions
- `CLOUDFLARE_ACCOUNT_ID` - Account ID (b6641681fe423910342b9ffa1364c76d)

**Vercel:**
- `VERCEL_TOKEN` - API token for Vercel projects

**Registrars:**
- `PORKBUN_API_KEY` + `PORKBUN_SECRET_KEY`
- `DYNADOT_API_KEY`
- `NETIM_API_KEY` + `NETIM_USERNAME` + `NETIM_PASSWORD`
- `SAV_API_KEY`

**Routes Worker:**
- `ROUTES_API_KEY` - API key for refresh endpoint

### Setting Secrets

```bash
# GitHub repository secrets
gh secret set CLOUDFLARE_TOKEN --body "xxx"
gh secret set ROUTES_API_KEY --body "xxx"

# Cloudflare Workers secret
cd workers/routes
npx wrangler secret put ROUTES_API_KEY
# Enter secret when prompted
```

## MDX as Source of Truth

Domain MDX files are the **single source of truth** for configuration:

```yaml
---
domain: "fetch.do"
dnsProvider: "cloudflare"
cloudflareAccountId: "b6641681fe423910342b9ffa1364c76d"
assignedNameservers:
  - ernest.ns.cloudflare.com
  - gina.ns.cloudflare.com
workersRoutes:
  - "fetch.do/*"
  - "*/api/*"
httpWorking: true
expectedBehavior: "Proxy/fetch utility"
---
```

**Changes flow in one direction:**

1. Enrichment scripts → Update MDX files → Commit
2. MDX changes → Apply workflow → Update Cloudflare
3. Cloudflare changes NOT written back to MDX (prevents loops)

## Monitoring & Alerts

### Expiration Alerts

Weekly WHOIS refresh generates reports and alerts:

```bash
# Domains expiring <30 days
URGENT=$(find sites/do -name "index.mdx" -exec grep -l "daysUntilExpiration.*[0-2][0-9]$" {} \; | wc -l)

if [ "$URGENT" -gt 0 ]; then
  # Send notification
  echo "⚠️  URGENT: $URGENT domains expiring in <30 days!"
fi
```

**TODO:** Add Slack/email notifications

### Status Changes

Hourly checks detect HTTP status changes:

```bash
# Compare before/after
git diff HEAD~1 HEAD sites/do/*/index.mdx | grep "httpStatus:"
```

**TODO:** Alert on newly broken domains

### GitHub Actions Dashboard

View workflow runs:
- https://github.com/dot-do/domains/actions

Monitor:
- Success/failure rate
- Execution time
- Changes detected

## Deployment Process

### Initial Setup

1. **Create domains repository:**
   ```bash
   gh repo create dot-do/domains --public
   cd domains
   git remote add origin https://github.com/dot-do/domains.git
   ```

2. **Copy files from .do repo:**
   ```bash
   cp -r .github/workflows/domains-*.yml ../domains/.github/workflows/
   cp -r scripts/ ../domains/
   cp -r sites/ ../domains/
   cp -r config/ ../domains/
   ```

3. **Configure secrets:**
   ```bash
   gh secret set CLOUDFLARE_TOKEN --repo dot-do/domains
   gh secret set ROUTES_API_KEY --repo dot-do/domains
   # ... set all other secrets
   ```

4. **Enable workflows:**
   ```bash
   gh workflow enable domains-hourly-status.yml --repo dot-do/domains
   gh workflow enable domains-weekly-whois.yml --repo dot-do/domains
   gh workflow enable domains-apply-changes.yml --repo dot-do/domains
   ```

### Ongoing Maintenance

**Daily:**
- Monitor GitHub Actions runs
- Check for failed enrichments
- Review status changes

**Weekly:**
- Review expiration report
- Renew domains <90 days
- Check for nameserver mismatches

**Monthly:**
- Audit registrar costs
- Review unused domains
- Update test configurations

## Troubleshooting

### Enrichment Failed

**Symptom:** Workflow fails, no changes committed

**Check:**
```bash
# View logs
gh run view --repo dot-do/domains

# Re-run manually
gh workflow run domains-hourly-status.yml --repo dot-do/domains
```

**Common causes:**
- Cloudflare API rate limit (wait and retry)
- Missing secrets (check secrets configuration)
- Network timeout (re-run workflow)

### Apply Changes Not Triggering

**Symptom:** MDX changes pushed but Cloudflare not updated

**Check:**
```bash
# Verify workflow triggered
gh run list --workflow domains-apply-changes.yml --repo dot-do/domains

# Check if bot commit (would be skipped)
git log -1 --format="%an %s"
```

**Fix:**
- If bot commit, changes won't apply (by design)
- If human commit, check workflow logs for errors

### Infinite Loop Detected

**Symptom:** Apply workflow running repeatedly

**Emergency fix:**
```bash
# Disable apply workflow
gh workflow disable domains-apply-changes.yml --repo dot-do/domains

# Investigate and fix
git log --oneline -20

# Re-enable when fixed
gh workflow enable domains-apply-changes.yml --repo dot-do/domains
```

**Root cause:** Loop prevention bypassed (check commit message logic)

## Future Enhancements

### Short-term

- [ ] Slack notifications for expiration alerts
- [ ] Email alerts for broken domains
- [ ] Dashboard showing recent changes
- [ ] Dry-run mode for apply workflow

### Medium-term

- [ ] Auto-renewal for critical domains
- [ ] Cost tracking and reporting
- [ ] Domain health scoring
- [ ] Historical data tracking

### Long-term

- [ ] Multi-TLD support (.com, .ai, .io)
- [ ] Automatic DNS optimization
- [ ] Predictive expiration planning
- [ ] Integration with domain marketplace

## Related Documentation

- [Domain Enrichment](./2025-10-04-domain-enrichment.md)
- [Registrar Fetching](./2025-10-04-registrar-fetch-implementation.md)
- [Routes Worker README](../workers/routes/README.md)
- [GitHub Issue #2](https://github.com/dot-do/.do/issues/2)

---

**Last Updated:** 2025-10-04
**Status:** ✅ Complete - Ready for production
**Maintained By:** Automated GitHub Actions + Manual oversight
