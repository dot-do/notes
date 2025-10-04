---
title: Domain Enrichment Report
date: 2025-10-04T13:39:36.165Z
tags: [domains, enrichment, mdx]
---

# Domain Enrichment Report

**Generated:** 2025-10-04T13:39:36.165Z
**Domains Enriched:** 105

## Summary

- ✅ **Successfully enriched:** 105 domains
- ⚠️  **Nameserver mismatches:** 3 domains
- 🚨 **Not working via HTTP:** 37 domains
- 📁 **Output directory:** `sites/[tld]/[domain]/index.mdx`

## Enrichment Details

Each domain MDX file now includes:

- **WHOIS data:** Expiration date, hostname, registrar
- **DNS provider:** Cloudflare (with account ID), Vercel, or other
- **Nameserver configuration:** Assigned vs. actual nameservers
- **Workers routes:** Configured workers routes (if any)
- **Active status:** Verification in Cloudflare/Vercel APIs

## Nameserver Mismatches

3 domains have nameserver configuration issues where the assigned nameservers
don't match the actual nameservers from WHOIS. These domains may not be activating properly
in Cloudflare.

Check individual domain files for details.

## Next Steps

1. Review domains with nameserver mismatches
2. Renew domains expiring in <90 days
3. Set up GitHub Actions to keep MDX files as source of truth
4. Implement webhook integration for automatic updates
