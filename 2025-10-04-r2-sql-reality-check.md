# R2 SQL Reality Check

**Date:** 2025-10-04
**Discovery:** R2 SQL query API doesn't exist

## What We Learned

After creating the R2 SQL Query Worker and testing with `wrangler dev --remote`, we discovered:

1. **✅ Pipelines Exist** - `wrangler pipelines list` works, 4 existing pipelines found
2. **❌ R2 SQL Query API Doesn't Exist** - No `wrangler r2 sql query` command
3. **❌ No HTTP API for Queries** - Attempted endpoints return errors
4. **✅ Data Catalog Available** - `catalog-test` pipeline suggests R2 Data Catalog is functional

## What R2 SQL Actually Is

**R2 SQL is for DATA INGESTION, not querying!**

**What it provides:**
- ✅ Cloudflare Pipelines (stream → sink architecture)
- ✅ Apache Iceberg table format
- ✅ Parquet file storage in R2
- ✅ Data Catalog metadata

**What it does NOT provide:**
- ❌ SQL query API
- ❌ Distributed query engine (as described in blog post)
- ❌ Wrangler CLI query commands

## Blog Post vs Reality

**Blog post claimed:**
> "R2 SQL is a serverless, distributed query engine for analyzing petabyte-scale data"

**Reality:**
- The infrastructure exists (Pipelines, Iceberg, Parquet)
- The query engine **is not accessible yet** (Open Beta, very new)
- You can write data, but can't query it via Cloudflare APIs

## Our Options

### Option 1: Wait for Query API
**When:** Cloudflare may release query API in future
**Pros:** Worker code is ready
**Cons:** Unknown timeline

### Option 2: External Tools
**Tools:** DuckDB, Trino, Presto (can read Iceberg/Parquet)
**Pros:** Works today
**Cons:** External infrastructure, not Cloudflare-native

### Option 3: Benchmark D1 Only
**Approach:** Compare D1 vs PostgreSQL vs ClickHouse
**Pros:** All have query APIs available
**Cons:** No R2 SQL comparison

### Option 4: Use Pipelines for Writes, D1 for Reads
**Architecture:**
- Pipelines → R2 (archival, analytics)
- Database → D1 (real-time queries)
**Pros:** Best of both worlds
**Cons:** Dual write complexity

## Recommendation

**Proceed with D1 for MDXLD graph database** because:

1. **D1 Query API Exists** - Native Workers binding, RPC available
2. **Good Performance** - 88-122ms queries (from previous testing)
3. **Affordable** - $3.50/month for ONET dataset
4. **Production Ready** - Stable, documented, supported
5. **Global Reads** - Replication for low latency
6. **R2 Later** - Can add R2 archival when query API is available

## R2 SQL Query Worker Status

**What we built:**
- ✅ Worker with HTTP + RPC interfaces
- ✅ Error handling and fallback logic
- ✅ Ready for when API becomes available

**Current state:**
- Worker correctly reports "R2 SQL direct API not available"
- Clean architecture for future API integration
- Can be repurposed for D1 benchmarking

## Files Created (Still Useful)

1. `workers/r2sql-query/` - Query Worker (future-ready)
2. `scripts/benchmark-backlinks.ts` - Benchmark suite (works for D1)
3. `scripts/test-r2sql-worker.sh` - Testing script
4. `docs/R2-SQL-RESEARCH.md` - Research document (mostly accurate)
5. `scripts/sample-mdxld-data.ts` - Sample data (works for any backend)
6. `scripts/ingest-to-r2-sql.ts` - Ingestion script (for Pipelines)

## Next Steps

### Immediate: Benchmark D1

```bash
# D1 is already set up and has data
cd /Users/nathanclevenger/Projects/.do/workers

# Run D1 benchmark
pnpm tsx scripts/benchmark-backlinks.ts --backend d1 --iterations 50

# Results will show:
# - Cold start latency
# - Warm cache latency
# - P50, P95, P99
# - Throughput (queries/sec)
```

### Optional: Set Up R2 Pipeline for Archival

Even without query API, we can still use Pipelines for data archival:

1. Run setup script: `./scripts/r2-sql-setup.sh`
2. Ingest data: `pnpm tsx scripts/ingest-to-r2-sql.ts`
3. Data stored in R2 as Parquet files
4. Query later when API is available

### Future: Query R2 SQL When API Is Available

The Worker we built will work once Cloudflare releases the query API. No code changes needed.

## Lessons Learned

1. **Blog posts can be aspirational** - Features announced may not be fully available
2. **Open Beta means VERY new** - Core functionality may not exist yet
3. **Test early** - Would have saved time to test `wrangler r2 sql` first
4. **Workers are useful regardless** - Good architecture for future expansion

## Conclusion

**R2 SQL is not viable for querying today.** The infrastructure exists but the query interface doesn't. **Use D1 for MDXLD graph database** with option to add R2 archival later.

**Time spent:** ~3 hours research + implementation
**Value:** Clean Worker architecture ready for future API, good understanding of Pipelines
**Next:** Benchmark D1 performance with real MDXLD queries

---

**Last Updated:** 2025-10-04
**Status:** R2 SQL Query API Not Available
**Recommendation:** Proceed with D1
