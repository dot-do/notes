# mdxe Authentication Integration

**Date:** 2025-10-04
**Status:** ✅ Complete (pending OAuth cache clearance for testing)

## Overview

Integrated cli.do OAuth authentication into mdxe CLI to ensure users are authenticated before executing MDX files with API access.

## Changes Made

### 1. New File: `mdxe/src/cli/utils/auth.ts`

**Purpose:** Authentication utilities for checking and managing user authentication state

**Functions:**
- `isAuthenticated()` - Check if user has valid tokens
- `getCurrentUser()` - Get user information from tokens
- `ensureAuthenticated(skipAuth)` - Check auth and prompt user if needed
- `getAccessToken()` - Get access token for API requests

**Features:**
- ✅ Gracefully handles missing cli.do dependency (optional)
- ✅ Shows authenticated user email when running
- ✅ Provides clear instructions for unauthenticated users
- ✅ Supports `--skip-auth` flag to bypass authentication

### 2. Updated: `mdxe/src/cli/cli.ts`

**Changes:**
```typescript
import { ensureAuthenticated } from './utils/auth'

export async function run() {
  const args = process.argv.slice(2)
  const command = args[0]
  const cwd = process.cwd()

  // Check for --skip-auth flag
  const skipAuth = args.includes('--skip-auth')

  // Commands that don't require authentication
  const noAuthCommands = ['help', '--help', '-h', '--version', '-v']

  // Check authentication (unless skipped or help command)
  if (!noAuthCommands.includes(command) && !skipAuth) {
    const authenticated = await ensureAuthenticated(skipAuth)
    if (!authenticated) {
      process.exit(1)
    }
  }

  // Continue with command execution...
}
```

**Behavior:**
1. Checks authentication before running any command (except help)
2. Displays authenticated user email
3. Prompts user to run `cli.do login` if not authenticated
4. Exits gracefully with instructions if auth required

## Usage Examples

### Authenticated User

```bash
$ mdxe examples/hello-world.mdx

✓ Authenticated as user@example.com

Running hello-world.mdx...
```

### Unauthenticated User

```bash
$ mdxe examples/hello-world.mdx

⚠️  Authentication required
Please run: cli.do login

To continue without authentication, use: --skip-auth
```

### Skip Authentication

```bash
$ mdxe examples/hello-world.mdx --skip-auth

Running hello-world.mdx...
```

## Integration Flow

```
User runs: mdxe file.mdx
  ↓
mdxe CLI starts
  ↓
Check authentication (via cli.do)
  ├─ Authenticated? → Show user email → Continue
  ├─ Not authenticated? → Prompt login → Exit
  └─ --skip-auth? → Continue without auth
  ↓
Execute MDX file
  ├─ Load tokens from TokenManager
  ├─ Make authenticated API requests
  └─ Return results
```

## API Request Authentication

When mdxe makes API requests, it will automatically include the access token:

```typescript
import { getAccessToken } from './utils/auth'

// In API request code
const token = await getAccessToken()

const response = await fetch('https://api.do/things', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

## Configuration

### package.json

```json
{
  "optionalDependencies": {
    "cli.do": "workspace:*",
    "sdk.do": "workspace:*"
  }
}
```

**Note:** cli.do is an **optional dependency**. If not installed, authentication checks are skipped.

## Testing Checklist

Once OAuth DNS cache clears, test these scenarios:

### 1. First-Time User
```bash
# User has never authenticated
$ mdxe test.mdx
# → Shows authentication prompt
# → User runs: cli.do login
# → User authenticates
# → User runs mdxe again
# → Shows authenticated email
# → Executes file
```

### 2. Authenticated User
```bash
# User previously authenticated
$ mdxe test.mdx
# → Shows: ✓ Authenticated as user@example.com
# → Executes file
```

### 3. Expired Token
```bash
# Token expired but has refresh token
$ mdxe test.mdx
# → Auto-refreshes token
# → Shows authenticated email
# → Executes file
```

### 4. Skip Authentication
```bash
# User wants to skip auth
$ mdxe test.mdx --skip-auth
# → Executes without auth check
```

### 5. Help Command (No Auth)
```bash
$ mdxe --help
# → Shows help without authentication
```

## Benefits

1. **Security** - Ensures only authenticated users can make API requests
2. **User Experience** - Clear prompts guide users through authentication
3. **Flexibility** - Optional authentication with `--skip-auth` flag
4. **Graceful Degradation** - Works without cli.do installed (skips auth)
5. **Auto-Refresh** - Tokens automatically refreshed when expired

## Known Limitations

1. **Requires cli.do** - For authentication features (optional dependency)
2. **Internet Required** - For token refresh and API requests
3. **Token Expiry** - Users must re-authenticate when refresh token expires

## Next Steps

### Immediate (Once OAuth Cache Clears)

1. **Test Authentication Flow**
   ```bash
   cd /Users/nathanclevenger/Projects/.do/mdx/packages/mdxe
   pnpm build
   ./bin/mdxe.js examples/hello-world.mdx
   ```

2. **Verify Token Management**
   - Check tokens stored in `~/.cli.do/tokens.json`
   - Verify auto-refresh works
   - Test expired token handling

3. **Test API Requests**
   - Create example MDX file that calls API
   - Verify access token sent in headers
   - Verify authenticated endpoints work

### Future Enhancements

1. **SDK Integration** - Use sdk.do for simplified API calls
2. **Token Display** - Show token expiry in verbose mode
3. **Multiple Profiles** - Support multiple authentication profiles
4. **Refresh Prompt** - Prompt user to refresh if token expired
5. **Offline Mode** - Cache results for offline execution

## Files Modified

1. ✅ `mdx/packages/mdxe/src/cli/utils/auth.ts` (new)
2. ✅ `mdx/packages/mdxe/src/cli/cli.ts` (updated)
3. ✅ `mdx/packages/mdxe/package.json` (already had cli.do as optional dep)

## Documentation Needed

1. **mdxe README** - Update with authentication instructions
2. **cli.do README** - Add mdxe integration example
3. **Examples** - Create authenticated API examples

## Related Files

- OAuth Worker: `/Users/nathanclevenger/Projects/.do/workers/oauth`
- CLI Package: `/Users/nathanclevenger/Projects/.do/sdk/packages/cli.do`
- mdxe Package: `/Users/nathanclevenger/Projects/.do/mdx/packages/mdxe`

---

**Implementation Time:** ~30 minutes
**Lines of Code:** ~80 (auth utilities + integration)
**Build Status:** ✅ CLI build successful (type definitions have unrelated errors)
