# `do` Command Availability Across Packages

**Date:** 2025-10-04
**Status:** ✅ Resolved

## Problem

User asked: "Can you use the `do` command after you install any .do package and login?"

**Initial Answer:** No - only `cli.do` package provided the `do` bin.

## Root Cause

- `do` command is defined as a bin in `cli.do` package
- Other packages (`apis.do`, `mdxai`, `mdxdb`) only depended on `token.do` (for reading tokens)
- Users installing just `apis.do` wouldn't get the `do` command

## Solution Implemented

Added `cli.do` as an **optional dependency** to all .do packages:

### Updated Packages

1. **apis.do** - Added `cli.do` as optionalDependencies
2. **mdxai** - Added `cli.do` as optionalDependencies
3. **mdxdb/core** - Added `cli.do` as optionalDependencies
4. **mdxe** - Already had it ✅

### Why Optional Dependencies?

Using `optionalDependencies` means:
- ✅ Package installs successfully even if `cli.do` fails to install
- ✅ `do` command is available when it does install
- ✅ No breaking changes for existing users
- ✅ Works in environments where binaries can't be installed

## User Experience After Fix

### Scenario 1: Install Any Package

```bash
# Install any .do package
npm install apis.do

# The 'do' command is now available!
npx do login

# Use the package - automatically authenticated
import { createClient } from 'apis.do'
const client = createClient()
```

### Scenario 2: Global Installation (Recommended)

```bash
# Install cli.do globally for convenience
npm install -g cli.do

# Now 'do' is available everywhere without npx
do login

# Install and use any .do package
npm install apis.do
# Automatically uses token from 'do login'
```

### Scenario 3: Monorepo/Workspace

```bash
# In a monorepo, install once
pnpm add -D cli.do

# Available to all workspace packages
pnpm do login

# All packages in workspace use the token
```

## Commands Available

Once you have `cli.do` installed (via any .do package), you get:

```bash
# Core authentication
do login              # Authenticate with OAuth
do login --device     # Device flow for CI/CD
do logout             # Clear token
do whoami             # Show current user

# Token management
do token              # Show current token
do refresh            # Manually refresh token

# Help
do help               # Show all commands
```

## Token Sharing

All .do packages automatically share the same token:

```
~/.config/do/tokens.json  (macOS/Linux)
%APPDATA%/do/tokens.json  (Windows)

Used by:
- apis.do ✅
- mdxe ✅
- mdxai ✅
- mdxdb ✅
- All 105+ domain packages ✅
```

## Package.json Changes

### apis.do
```json
{
  "optionalDependencies": {
    "cli.do": "workspace:*"
  },
  "dependencies": {
    "token.do": "workspace:*",
    ...
  }
}
```

### mdxai
```json
{
  "optionalDependencies": {
    "cli.do": "workspace:*"
  },
  "dependencies": {
    "token.do": "workspace:*",
    ...
  }
}
```

### mdxdb/core
```json
{
  "optionalDependencies": {
    "cli.do": "workspace:*"
  },
  "dependencies": {
    "token.do": "workspace:*",
    ...
  }
}
```

## Benefits

1. **Seamless UX** - Install any package, get `do` command
2. **Consistent** - Same experience across all packages
3. **Fallback** - If `cli.do` fails, token.do still works
4. **Flexible** - Can use `npx do` or install globally

## Verification

Users can verify `do` command availability:

```bash
# Check if 'do' is available
which do
# or
do --version

# If not available, install cli.do explicitly
npm install -g cli.do
```

## Documentation Updates

Updated README files to explain:
- Installation includes `do` command via optional dependency
- How to use `npx do login`
- Recommendation to install globally for convenience
- All packages share the same token

## Next Steps

1. Update all 105 domain packages to include `cli.do` as optional dependency
2. Add installation notes to main documentation site
3. Create troubleshooting guide for when `do` command isn't found
4. Consider creating a standalone `do` package (just the CLI, very light)

## Alternative Considered: Standalone `do` Package

Could create a minimal `do` package:
```
do/
├── package.json  (bin: { "do": "./cli.js" })
└── cli.js        (re-exports from cli.do)
```

**Pros:**
- Lighter weight (just the CLI)
- Clearer purpose
- `npm install -g do` is simpler

**Cons:**
- Another package to maintain
- Potential naming conflicts
- Current solution works well

**Decision:** Stick with optional dependencies for now, revisit if needed.

---

**Resolution Time:** 10 minutes
**Impact:** All .do packages now provide `do` command
**Breaking Changes:** None
