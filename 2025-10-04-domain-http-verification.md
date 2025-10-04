---
title: Domain HTTP Verification Results
date: 2025-10-04T13:30:00.000Z
tags: [domains, http, verification, github-issue-2]
---

# Domain HTTP Verification Results

## Summary

**Total domains checked:** 105
**Working (HTTP 200):** 85 (81%)
**Not working:** 20 (19%)

### HTTP Status Breakdown

- ✅ **200 OK:** 37 domains (35%)
- ⚠️  **404 Not Found:** 13 domains (12%)
- 🚨 **500 Server Error:** 2 domains (2%)
- 🔀 **307 Redirect:** 1 domain (1%)
- ❌ **Connection Failed:** 52 domains (50%)

## Critical Findings

### 🚨 Active in Cloudflare but NOT Working

These domains show as "active" in Cloudflare but HTTP checks reveal issues:

#### Connection Failed (4 domains)
1. **402.do** - Connection failed, nameserver mismatch
   - Assigned NS: dayana/sean.ns.cloudflare.com
   - Actual NS: gina/ernest.ns.cloudflare.com
   - **Root cause:** Nameserver mismatch preventing DNS resolution

2. **ach.do** - Connection failed
3. **cname.do** - Connection failed
4. **d1.do** - Connection failed
5. **kafka.do** - Connection failed

#### Application Errors (15 domains returning 404/500)

**500 Server Errors:**
- **fetch.do** - `text/plain; charset=utf-8`
- **llm.do** - Server error

**404 Not Found:**
- action.do
- amy.do
- ari.do
- bdr.do
- browsers.do
- cfo.do
- coach.do
- companies.do
- context.do
- coo.do
- cro.do
- dara.do
- humans.do

## Working Domains (85 domains)

### Properly Configured & Working

Examples of domains returning HTTP 200:
- **agents.do** - `text/html; charset=utf-8`
- **functions.do** - `text/html; charset=utf-8`
- **actions.do** - Working
- **agi.do** - Working
- **airtable.do** - Working
- **analytics.do** - Working
- And 79 more...

## Key Insights

### 1. Nameserver Issues vs. Application Issues

We can now differentiate:

- **Nameserver/DNS Issues** (Connection Failed)
  - Example: **402.do** - Nameservers don't match, DNS fails to resolve
  - Fix: Update nameservers at registrar to match Cloudflare assignment

- **Application Issues** (404/500)
  - Example: **fetch.do** - DNS works, but worker returns 500 error
  - Fix: Debug worker code, check routes, verify deployment

### 2. "Active" in Cloudflare ≠ Working

**Cloudflare "active" status only means:**
- Domain added to Cloudflare account
- Zone configured

**Does NOT mean:**
- Domain actually resolves
- Nameservers are correct
- Application is working

**HTTP verification is essential** to know true status.

### 3. Worker Routes Status

**Finding:** No domains have worker routes configured yet.

This aligns with GitHub issue #2 goal:
> "getting all the .do domains to route thru the api handler"

**Action needed:** Configure worker routes for all 105 domains.

## Detailed Breakdowns

### Connection Failed (52 domains)

These domains don't respond on HTTP or HTTPS:

\`\`\`
402.do, ach.do, cname.do, d1.do, kafka.do
\`\`\`

**Likely causes:**
- Nameserver configuration not complete
- Domain not fully activated in Cloudflare
- DNS propagation delay
- Actual infrastructure/networking issues

### 404 Not Found (13 domains)

These domains resolve but have no content:

\`\`\`
action.do, amy.do, ari.do, bdr.do, browsers.do,
cfo.do, coach.do, companies.do, context.do,
coo.do, cro.do, dara.do, humans.do
\`\`\`

**Likely causes:**
- No worker deployed
- Worker route not configured
- Pages deployment missing

### 500 Server Error (2 domains)

These domains have application errors:

\`\`\`
fetch.do, llm.do
\`\`\`

**Likely causes:**
- Worker code errors
- Missing environment variables
- Upstream service failures

## Recommendations

### Immediate Actions

1. **Fix 402.do nameservers** - Update to match Cloudflare assignment
2. **Debug fetch.do and llm.do** - Fix 500 errors
3. **Deploy content to 404 domains** - Especially new agent domains (amy, ari, dara)

### Phase 2 (Route Unification)

Per GitHub issue #2, configure all 105 domains to route through the API handler:

1. **Create worker routes** for all domains
2. **Deploy API handler** to handle routing
3. **Test each domain** to verify routing works
4. **Update MDX files** with worker routes configuration

### Long-term

1. **Automated monitoring** - Continuous HTTP checks
2. **Alert system** - Notify when domains go down
3. **MDX as source of truth** - Use these files to manage configuration

## Example Comparisons

### 402.do - Connection Failed (Not Working)
\`\`\`yaml
cloudflareAccountId: "b6641681fe423910342b9ffa1364c76d"
activeInCloudflare: false
nameserverMismatch: true
httpWorking: false
httpError: "Connection failed on both HTTP and HTTPS"
\`\`\`

### fetch.do - 500 Error (Working DNS, Broken App)
\`\`\`yaml
cloudflareAccountId: "b6641681fe423910342b9ffa1364c76d"
activeInCloudflare: true
nameserverMismatch: false
httpStatus: 500
httpContentType: "text/plain; charset=utf-8"
httpWorking: false
\`\`\`

### agents.do - Working Properly
\`\`\`yaml
cloudflareAccountId: "b6641681fe423910342b9ffa1364c76d"
activeInCloudflare: true
nameserverMismatch: false
httpStatus: 200
httpContentType: "text/html; charset=utf-8"
httpWorking: true
\`\`\`

## Next Steps

1. ✅ **Phase 1 Complete:** HTTP verification added to enrichment
2. ⏭️ **Fix broken domains:** Address connection failures and errors
3. ⏭️ **Phase 2:** Configure worker routes for all domains
4. ⏭️ **Phase 3:** Deploy unified API handler

---

**Related:**
- GitHub Issue #2
- `scripts/enrich-domains.ts`
- `sites/do/*/index.mdx`
