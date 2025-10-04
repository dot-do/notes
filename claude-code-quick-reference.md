# Claude Code GitHub Actions - Quick Reference

**Last Updated:** 2025-10-01

---

## Quick Start

### Creating a Claude Code Issue

```bash
# Format: [Priority] Title
gh issue create \
  --repo dot-do/REPO_NAME \
  --title "[P1] Your task description here" \
  --body "Detailed description of what needs to be done" \
  --label "claude-code"
```

### Priority Levels

| Tag | Priority | Description | Use When |
|-----|----------|-------------|----------|
| `[P0]` | Critical | Immediate attention required | Production issues, security fixes, critical bugs |
| `[P1]` | High | Should be addressed soon | Important features, significant bugs |
| `[P2]` | Normal | Standard timeline | Regular features, minor improvements, documentation |

---

## Issue Examples

### Example 1: Bug Fix
```bash
gh issue create \
  --repo dot-do/api \
  --title "[P0] Fix authentication endpoint returning 500 error" \
  --body "The /auth/login endpoint is throwing a 500 error when users try to log in with valid credentials.

Steps to reproduce:
1. Call POST /auth/login with valid credentials
2. Observe 500 error response

Expected: 200 OK with auth token
Actual: 500 Internal Server Error

Error logs show: 'Cannot read property email of undefined'" \
  --label "claude-code"
```

### Example 2: Feature Implementation
```bash
gh issue create \
  --repo dot-do/app \
  --title "[P1] Add user profile page with edit functionality" \
  --body "Create a user profile page that displays user information and allows editing.

Requirements:
- Display user's name, email, avatar
- Edit button to toggle edit mode
- Save button to persist changes
- Cancel button to discard changes
- Form validation for email format
- Loading states for save operation

Technical notes:
- Use existing useUser hook
- Follow existing form patterns in codebase
- Add to /app/profile route" \
  --label "claude-code"
```

### Example 3: Documentation
```bash
gh issue create \
  --repo dot-do/docs \
  --title "[P2] Document new API endpoints in deployment guide" \
  --body "Add documentation for the newly created /api/v2/analytics endpoints to the deployment guide.

Include:
- Endpoint descriptions
- Request/response examples
- Authentication requirements
- Rate limiting information
- Error codes

Reference: See /api/routes/analytics.ts for implementation details" \
  --label "claude-code"
```

### Example 4: Refactoring
```bash
gh issue create \
  --repo dot-do/db \
  --title "[P1] Refactor database connection pool to use singleton pattern" \
  --body "The current database connection implementation creates multiple connection pools across different modules.

Current problem:
- Multiple db.ts files with duplicate connection logic
- Connection leaks in some edge cases
- Difficult to manage connection lifecycle

Proposed solution:
- Create a singleton connection manager
- Centralize all connection logic
- Add proper connection lifecycle management
- Add connection pool monitoring

Files to refactor:
- /src/db/connection.ts
- /src/services/*/db.ts
- /src/utils/database.ts" \
  --label "claude-code"
```

---

## Monitoring Workflow

### Check Workflow Status
```bash
# List recent runs
gh run list --repo dot-do/REPO_NAME

# Watch specific run
gh run watch RUN_ID --repo dot-do/REPO_NAME

# View run logs
gh run view RUN_ID --log --repo dot-do/REPO_NAME
```

### Check Created PRs
```bash
# List PRs created by Claude Code
gh pr list --repo dot-do/REPO_NAME --label "automated"

# View specific PR
gh pr view PR_NUMBER --repo dot-do/REPO_NAME

# Check PR status
gh pr checks PR_NUMBER --repo dot-do/REPO_NAME
```

---

## Workflow Behavior

### What Happens When You Create an Issue

1. **Issue Created** with `claude-code` label
2. **Workflow Triggers** within seconds
3. **Priority Detected** from issue title
4. **Repository Type Detected** (root with submodules, or sub without)
5. **Code Checked Out** with appropriate settings
6. **Claude Code Analyzes** the issue and codebase
7. **Changes Implemented** on new branch `claude-code/issue-NUMBER`
8. **Branch Pushed** to repository
9. **PR Created** with metadata and issue link
10. **Issue Commented** with PR link or status

### Success Indicators

✅ **PR Created**: Look for PR link in issue comments
✅ **Proper Labels**: PR has `automated` and `priority:PX` labels
✅ **Issue Linked**: PR description contains "Closes #NUMBER"
✅ **Branch Named**: Branch follows `claude-code/issue-NUMBER` format

### When No Changes Are Made

If Claude Code determines no changes are needed:
- Comment added to issue: "No changes necessary"
- No PR created
- Issue remains open for clarification

### Error Handling

If workflow fails:
- Error comment added to issue
- `claude-code-error` label applied
- Workflow logs available for debugging
- Issue remains open

---

## Repository-Specific Notes

### Root Repository (.do)
- **Special Handling**: Checks out with submodules
- **Use For**: Cross-repo coordination, documentation updates
- **Note**: Changes only affect root repo, not submodules

### api.services (Monolith)
- **Status**: Migration source
- **Use For**: Bug fixes, urgent patches
- **Note**: Consider if change should go to extracted repos instead

### Extracted Repos (api, db, ai)
- **Status**: Migration targets
- **Use For**: New features in specific domains
- **Note**: Preferred location for new development

### Application Repos (agent, app, site)
- **Status**: Active development
- **Use For**: Frontend features, UI improvements
- **Note**: May have framework-specific requirements

### Supporting Repos (sdk, docs, do.industries)
- **Status**: Supporting infrastructure
- **Use For**: SDK updates, documentation, content
- **Note**: Often simpler, well-defined tasks

---

## Tips and Best Practices

### Writing Good Issue Descriptions

**Do:**
✅ Be specific and detailed
✅ Include context and background
✅ Reference related files or code
✅ Provide examples or screenshots
✅ Specify acceptance criteria
✅ Include technical constraints

**Don't:**
❌ Be vague ("make it better")
❌ Skip important details
❌ Assume context is obvious
❌ Make multiple unrelated requests
❌ Forget to specify priority

### Effective Issue Titles

**Good Examples:**
- `[P0] Fix memory leak in WebSocket connection handler`
- `[P1] Add pagination to user list API endpoint`
- `[P2] Update README with new deployment instructions`

**Poor Examples:**
- `Fix bug` (too vague)
- `Update stuff` (no context)
- `[P1] Do everything` (too broad)

### When to Use Claude Code

**Good Use Cases:**
✅ Well-defined feature additions
✅ Bug fixes with clear reproduction steps
✅ Code refactoring with specific goals
✅ Documentation updates
✅ Test additions
✅ Configuration changes

**Not Ideal For:**
❌ Architectural decisions requiring human judgment
❌ Multi-repo changes (use separate issues)
❌ Changes requiring external service setup
❌ Ambiguous or exploratory tasks
❌ Changes requiring security review first

---

## Troubleshooting

### Issue: Workflow Not Starting

1. Check label is exactly `claude-code` (case-sensitive)
2. Verify workflow file exists in `.github/workflows/`
3. Check repository Actions are enabled
4. Review workflow permissions in settings

### Issue: PR Not Created

1. Check workflow logs for errors
2. Verify `ANTHROPIC_API_KEY` secret is set
3. Ensure issue description is actionable
4. Check if "no changes" comment was added

### Issue: Wrong Priority Label

1. Verify priority tag in title: `[P0]`, `[P1]`, or `[P2]`
2. Check tag is at the beginning of title
3. Ensure tag format matches exactly (square brackets, uppercase)

### Issue: Submodule Errors (Root Repo)

1. Verify `.gitmodules` file exists
2. Check submodule URLs are accessible
3. Review workflow logs for specific submodule errors
4. Test manual submodule checkout

---

## Advanced Usage

### Custom Workflow Modifications

Each repository can customize its `claude-code.yml`:

**Increase Timeout:**
```yaml
timeout-minutes: 60  # Default is 30
```

**Add Custom Labels:**
```yaml
--label "automated,${{ steps.priority.outputs.label }},backend"
```

**Add Notifications:**
```yaml
- name: Notify Team
  run: |
    # Send Slack notification, email, etc.
```

### Integration with Existing CI/CD

Trigger other workflows after PR creation:

```yaml
- name: Run Tests on PR
  run: |
    gh workflow run tests.yml \
      --ref ${{ steps.claude.outputs.branch }}
```

### Batch Issue Processing

Process multiple related issues:

```bash
# Create related issues
for feature in "auth" "logging" "metrics"; do
  gh issue create \
    --repo dot-do/api \
    --title "[P1] Add $feature to new endpoints" \
    --body "Implementation for $feature" \
    --label "claude-code"
done
```

---

## Getting Help

### Documentation
- **Main Guide**: `/CLAUDE.md`
- **Setup Guide**: `/notes/2025-10-01-github-actions-setup.md`
- **Workflow File**: `/.github/workflows/claude-code.yml`

### Support Channels
- **GitHub Issues**: For workflow bugs or improvements
- **Team Slack**: For usage questions
- **Docs Site**: For detailed guides

### Useful Commands

```bash
# View workflow file
gh api repos/dot-do/REPO_NAME/contents/.github/workflows/claude-code.yml \
  --jq '.content' | base64 -d

# Check secrets
gh secret list --repo dot-do/REPO_NAME

# List labels
gh label list --repo dot-do/REPO_NAME

# View recent issues
gh issue list --repo dot-do/REPO_NAME --label claude-code
```

---

## Appendix: Complete Command Reference

### Issue Management
```bash
# Create issue
gh issue create --repo dot-do/REPO --title "TITLE" --body "BODY" --label "claude-code"

# List issues
gh issue list --repo dot-do/REPO --label "claude-code"

# View issue
gh issue view NUMBER --repo dot-do/REPO

# Add comment
gh issue comment NUMBER --repo dot-do/REPO --body "COMMENT"

# Close issue
gh issue close NUMBER --repo dot-do/REPO
```

### PR Management
```bash
# List PRs
gh pr list --repo dot-do/REPO --label "automated"

# View PR
gh pr view NUMBER --repo dot-do/REPO

# Check PR status
gh pr checks NUMBER --repo dot-do/REPO

# Merge PR
gh pr merge NUMBER --repo dot-do/REPO --squash

# Close PR
gh pr close NUMBER --repo dot-do/REPO
```

### Workflow Management
```bash
# List runs
gh run list --repo dot-do/REPO --workflow=claude-code.yml

# Watch run
gh run watch RUN_ID --repo dot-do/REPO

# View logs
gh run view RUN_ID --log --repo dot-do/REPO

# Cancel run
gh run cancel RUN_ID --repo dot-do/REPO

# Re-run
gh run rerun RUN_ID --repo dot-do/REPO
```

### Label Management
```bash
# List labels
gh label list --repo dot-do/REPO

# Create label
gh label create "NAME" --repo dot-do/REPO --color "COLOR" --description "DESC"

# Delete label
gh label delete "NAME" --repo dot-do/REPO
```

---

**End of Quick Reference**

For detailed setup instructions, see: `/notes/2025-10-01-github-actions-setup.md`
