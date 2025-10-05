# CTX Content Distribution Plan
**Date:** 2025-10-04
**Task:** Distribute ctx/ submodule content to appropriate locations
**Status:** In Progress

## Content Analysis Summary

Total files in ctx/: **52 files**
- 10 .velite/ build artifacts (gitignored, won't move)
- 42 content files to distribute

## Content Categories

### 1. Entity Definitions (Sync to specialized repos via submodules)
These should remain in their respective specialized repositories that sync with the database.

**Location:** Entity-specific submodules
**Action:** KEEP in place (already in correct submodules or need submodule setup)

| Current Path | Target Location | Notes |
|--------------|----------------|-------|
| `ctx/agents/*.mdx` (2 files) | `agents/` submodule | AI agent definitions |
| `ctx/brands/*.mdx` (1 file) | `brands/` submodule | Brand identity |
| `ctx/functions/*.mdx` (1 file) | `functions/` submodule | Function definitions |
| `ctx/nouns/*.mdx` (2 files) | `schemas/` submodule | Entity/noun types |
| `ctx/verbs/*.mdx` (1 file) | `functions/` submodule | Action/verb definitions |
| `ctx/workflows/*.mdx` (2 files) | `workflows/` submodule | Workflow patterns |
| `ctx/business-as-code/companies/*.mdx` (2 files) | `business/` submodule | Company definitions |
| `ctx/business-as-code/okrs/*.mdx` (2 files) | `business/` submodule | OKR definitions |
| `ctx/services-as-software/services/*.mdx` (4 files) | `services/` submodule | Service definitions |

**Entity Definition Total:** 17 files

### 2. Research Notes (Archive to research/)
Deep research and analysis documents.

**Location:** `research/[topic]/`
**Action:** MOVE to research directory with topic organization

| Current Path | Target Location | Notes |
|--------------|----------------|-------|
| `ctx/research/semantic-english-typescript.mdx` | `research/semantic-english-typescript/` | Research on grammar-based APIs |
| `ctx/research/okrs-business-experiments-ground-truth-for-rl.md` | `research/okrs-business-experiments/` | Research on OKRs and RL |

**Research Total:** 2 files

### 3. Strategic Reports (Archive to notes/)
High-level strategic analysis and vision documents.

**Location:** `notes/[YYYY-MM-DD]-[topic].md`
**Action:** MOVE to notes with date prefixes

| Current Path | Target Location | Notes |
|--------------|----------------|-------|
| `ctx/reports/services-as-software-strategic-brief.md` | `notes/2025-10-02-services-as-software-strategic-brief.md` | Strategic vision |
| `ctx/reports/recursive-generation-strategic-implications.md` | `notes/2025-10-02-recursive-generation-strategic-implications.md` | Strategic analysis |
| `ctx/reports/recursive-service-generation-implementation.md` | `notes/2025-10-02-recursive-service-generation-implementation.md` | Implementation plan |
| `ctx/reports/implementation-guide-first-service.md` | `notes/2025-10-02-implementation-guide-first-service.md` | Implementation guide |

**Reports Total:** 4 files

### 4. Idea Documents (Archive to ideas/)
Concepts, proposals, and opportunities.

**Location:** `ideas/[topic]/`
**Action:** MOVE to ideas directory (keep existing)

| Current Path | Target Location | Notes |
|--------------|----------------|-------|
| `ctx/ideas/business-as-code-enables-services-as-software.md` | `ideas/business-as-code-enables-services-as-software.md` | Core concept doc |
| `ctx/ideas/recursive-service-generation-at-scale.md` | `ideas/recursive-service-generation-at-scale.md` | Scaling concept |
| `ctx/ideas/gist-to-app.mdx` | `ideas/gist-to-app.mdx` | Quick app concept |
| `ctx/ideas/ai-code-review.mdx` | `ideas/ai-code-review.mdx` | AI review concept |

**Ideas Total:** 4 files

### 5. Templates (Archive to templates/)
Reusable templates for creating new content.

**Location:** `templates/[category]/`
**Action:** MOVE to templates directory with category organization

| Current Path | Target Location | Notes |
|--------------|----------------|-------|
| `ctx/templates/noun-thing-template.mdx` | `templates/mdx/noun-thing-template.mdx` | GraphDL → MDXLD |
| `ctx/templates/verb-function-template.mdx` | `templates/mdx/verb-function-template.mdx` | Function template |
| `ctx/templates/workflow-template.mdx` | `templates/mdx/workflow-template.mdx` | Workflow template |
| `ctx/templates/graph-collection-template.mdx` | `templates/mdx/graph-collection-template.mdx` | Collection template |

**Templates Total:** 4 files

### 6. Standards Documentation (Move to docs/)
Documentation about standards and protocols.

**Location:** `docs/standards/`
**Action:** MOVE to docs directory (or keep reference in ctx if needed)

| Current Path | Target Location | Notes |
|--------------|----------------|-------|
| `ctx/standards/mdxld.mdx` | `docs/standards/mdxld.mdx` | MDXLD standard |
| `ctx/standards/schema.org.ai.mdx` | `docs/standards/schema-org-ai.mdx` | Schema.org AI integration |

**Standards Total:** 2 files

### 7. Meta Documentation (Keep in ctx/)
Documentation about the ctx/ repository itself.

**Location:** Keep in `ctx/`
**Action:** NO MOVE

| Current Path | Status | Notes |
|--------------|--------|-------|
| `ctx/README.md` | Keep | User-facing overview |
| `ctx/CLAUDE.md` | Keep | Developer guidelines |
| `ctx/package.json` | Keep | Dependencies |
| `ctx/tsconfig.json` | Keep | TypeScript config |
| `ctx/business-as-code/README.md` | Keep | Business-as-Code docs |
| `ctx/services-as-software/README.md` | Keep | Services-as-Software docs |
| `ctx/services-as-software/README.mdx` | Keep | Services-as-Software docs |
| `ctx/templates/README.md` | Archive to templates/ | Templates overview |
| `ctx/reports/README.md` | Delete | Empty/minimal |

**Meta Documentation Total:** 7 files (6 keep, 1 move, 1 delete)

## Distribution Strategy

### Phase 1: Entity Definitions (Highest Priority)
- **Status:** Most are already in specialized submodules
- **Action:** Verify submodule initialization and sync
- **Risk:** Low - these are the canonical source

### Phase 2: Archive Historical Content (Medium Priority)
- **Research** → `research/[topic]/`
- **Reports** → `notes/YYYY-MM-DD-[topic].md`
- **Ideas** → `ideas/` (already exists)
- **Risk:** Low - historical reference material

### Phase 3: Move Shared Resources (Low Priority)
- **Templates** → `templates/mdx/`
- **Standards** → `docs/standards/`
- **Risk:** Medium - may have references to update

### Phase 4: Update References (Critical)
- Update any imports or references in other files
- Update documentation to reflect new locations
- **Risk:** High - must verify no broken links

### Phase 5: Cleanup (Final)
- Remove empty directories from ctx/
- Update ctx/CLAUDE.md to reflect new structure
- Remove ctx/ submodule if all content distributed
- **Risk:** Low - final cleanup

## Submodule Status Check

Need to verify these submodules are properly initialized:
- [ ] `agents/` - Check if submodule exists and is initialized
- [ ] `brands/` - Check if submodule exists and is initialized
- [ ] `business/` - Check if submodule exists and is initialized
- [ ] `functions/` - Check if submodule exists and is initialized
- [ ] `schemas/` - Check if submodule exists and is initialized (for nouns)
- [ ] `services/` - Check if submodule exists and is initialized
- [ ] `workflows/` - Check if submodule exists and is initialized

## Data Loss Prevention

### Verification Steps:
1. ✅ Complete inventory of all files
2. ⏳ Copy files to target locations (don't delete originals yet)
3. ⏳ Verify all copies are successful
4. ⏳ Update references and test
5. ⏳ Only delete originals after verification
6. ⏳ Keep ctx/ as archive for 30 days before final removal

### Backup Strategy:
- Git preserves all history
- ctx/ submodule remains in git history even after removal
- Can always recover from git history if needed

## File Count Summary

- **Entity Definitions:** 17 files → Stay in submodules
- **Research:** 2 files → Move to research/
- **Reports:** 4 files → Move to notes/
- **Ideas:** 4 files → Move to ideas/
- **Templates:** 4 files + 1 README → Move to templates/
- **Standards:** 2 files → Move to docs/
- **Meta:** 6 files → Keep in ctx/, 1 delete
- **Build artifacts:** 10 files → Ignore (gitignored)

**Total:** 42 content files categorized

## Next Steps

1. ✅ Create this distribution plan
2. ⏳ Initialize/verify entity submodules
3. ⏳ Create target directories if needed
4. ⏳ Copy files to target locations
5. ⏳ Update references
6. ⏳ Verify no data loss
7. ⏳ Update documentation
8. ⏳ Create completion report

---

**Last Updated:** 2025-10-04
**Author:** Claude Code
**Status:** Planning Complete, Ready for Implementation
