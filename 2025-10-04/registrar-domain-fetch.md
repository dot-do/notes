---
title: Registrar Domain Fetching
date: 2025-10-04
tags: [domains, registrars, automation]
---

# Registrar Domain Fetching

Created script to fetch current domain inventory from all registrars.

## Script: `scripts/fetch-registrar-domains.ts`

Fetches domains from all four registrars:
- **Porkbun** - via REST API
- **Dynadot** - via REST API
- **Netim** - via REST API
- **Sav** - via REST API

## Setup

### 1. Configure Credentials

Copy `.env.example` to `.env` and add your API credentials:

```bash
cd scripts
cp .env.example .env
```

Then edit `.env`:

```env
# Porkbun (https://porkbun.com/account/api)
PORKBUN_API_KEY=pk1_...
PORKBUN_SECRET_KEY=sk1_...

# Dynadot (https://www.dynadot.com/account/domain/setting/api.html)
DYNADOT_API_KEY=...

# Netim (https://support.netim.com/en/wiki/API)
NETIM_USERNAME=...
NETIM_PASSWORD=...

# Sav (https://www.sav.com/api)
SAV_API_KEY=...
```

### 2. Run the Script

```bash
bun scripts/fetch-registrar-domains.ts
```

## Output

### Console Output

Shows summary by registrar and TLD:

```
🚀 Fetching domains from all registrars...

📊 Results:
   Porkbun: 42 domains
   Dynadot: 15 domains
   Netim: 8 domains
   Sav: 3 domains

✅ Total: 68 domains

📂 By TLD:
   .com: 35 domains
   .do: 25 domains
   .io: 5 domains
   .ai: 3 domains

🎯 .do domains: 25
   domain1.do (porkbun)
   domain2.do (dynadot)
   ...
```

### JSON Output

Saves detailed data to `data/registrar-domains.json`:

```json
{
  "fetchedAt": "2025-10-04T13:45:00.000Z",
  "totalDomains": 68,
  "byRegistrar": {
    "porkbun": 42,
    "dynadot": 15,
    "netim": 8,
    "sav": 3
  },
  "byTld": {
    "com": [...],
    "do": [...],
    "io": [...],
    "ai": [...]
  },
  "domains": [
    {
      "domain": "example.do",
      "registrar": "porkbun",
      "expirationDate": "2026-01-15T00:00:00Z",
      "autoRenew": true,
      "locked": true,
      "privacy": true
    },
    ...
  ]
}
```

## API Documentation

### Porkbun
- Docs: https://porkbun.com/api/json/v3/documentation
- Endpoint: `POST https://porkbun.com/api/json/v3/domain/listAll`
- Auth: API key + secret key in request body

### Dynadot
- Docs: https://www.dynadot.com/domain/api3.html
- Endpoint: `GET https://api.dynadot.com/api3.json?key={key}&command=list_domain`
- Auth: API key in query parameter

### Netim
- Docs: https://support.netim.com/en/wiki/Category:API_Documentation
- Endpoint: `GET https://rest.netim.com/1.0/domain/list`
- Auth: HTTP Basic (username:password)

### Sav
- Docs: https://www.sav.com/api
- Endpoint: `GET https://api.sav.com/domain/list`
- Auth: Bearer token in Authorization header

## Integration with Domain Enrichment

This script provides the source list for domain enrichment. Workflow:

1. **Fetch from registrars** → `data/registrar-domains.json`
2. **Filter .do domains** → Compare with existing inventory
3. **Enrich with Cloudflare + WHOIS** → `sites/do/[domain]/index.mdx`
4. **Track changes over time** → Git history

## Next Steps

- [ ] Set up credentials for all registrars
- [ ] Run initial fetch to get complete inventory
- [ ] Compare with existing `data/domain-ownership.json`
- [ ] Identify missing domains
- [ ] Add to enrichment pipeline
- [ ] Schedule daily fetches via cron/GitHub Actions
- [ ] Alert on expiring domains (<90 days)
- [ ] Auto-renew critical domains
