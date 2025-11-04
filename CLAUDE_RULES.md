# Claude Development Rules - MobileApp Project

## 🚨 MANDATORY: Read Before ANY Code Changes

**ALWAYS read `ARCHITECTURE.md` before making changes to backend integration or platform-specific code.**

---

## Core Principles

### 1. Evidence-Based Changes Only

❌ **NEVER** assume:
- "This should work"
- "iOS and Web work the same way"
- "The server probably has this endpoint"
- "This was working before so it still works"

✅ **ALWAYS** verify:
- Check git history: `git diff <file>` before changes
- Test on BOTH platforms (iOS + Web)
- Verify server logs when debugging backend issues
- Check Network tab in DevTools (web) or Charles Proxy (iOS)

### 2. Platform Awareness

**This is a UNIVERSAL React Native app** - iOS and Web have different capabilities:

```typescript
// ALWAYS check platform when dealing with:
- Network requests (CORS in web)
- File system access (different APIs)
- Native modules (may not exist in web)
- Navigation (web has URL routing)

// Example:
if (Platform.OS === 'web') {
  // Web-specific handling
} else {
  // iOS-specific handling
}
```

### 3. Backend Architecture Understanding

**CRITICAL**: There are TWO backend services:

1. **ExtractorT** (`api.standatpd.com`)
   - Primary for X/Twitter processing
   - Direct calls from frontend
   - Endpoint: `/enhanced-media/process`
   - **DO NOT** change URL without verification

2. **ExtractorW** (`server.standatpd.com`)
   - Legacy service
   - Used only for fallbacks
   - **DO NOT** route X/Twitter through this

❌ **NEVER**:
- Create new `backend.ts` or config files without checking existing setup
- Change `EXTRACTORT_URL` source without testing both platforms
- Assume ExtractorW should proxy to ExtractorT

✅ **ALWAYS**:
- Use existing patterns from working code
- Check `src/services/xCompleteService.ts` for backend calls
- Verify URLs in `.env` file before changes

---

## Code Modification Rules

### Rule 1: Check Git Before Editing

```bash
# Before touching any file, run:
git status <file>
git diff <file>

# If file is untracked/new and you didn't create it:
# Someone else created it - understand why first
```

**Example from this session:**
- `backend.ts` was new/untracked
- Changing import broke working iOS code
- Should have checked git first ✅

### Rule 2: Preserve Working Code Patterns

❌ **DON'T** refactor working code without strong reason:
```typescript
// Working code (iOS):
const EXTRACTORT_URL = process.env.EXPO_PUBLIC_EXTRACTORT_URL ?? 'https://api.standatpd.com';

// ❌ BAD refactor (broke iOS):
import { EXTRACTORT_URL } from '../config/backend';
```

✅ **DO** keep working patterns:
```typescript
// If iOS works with direct env access, keep it:
const EXTRACTORT_URL = process.env.EXPO_PUBLIC_EXTRACTORT_URL ?? 'https://api.standatpd.com';
```

### Rule 3: CORS is Web-Only

**Understanding:**
- CORS = Browser security policy
- iOS native = NO CORS restrictions
- React Native networking ≠ Browser fetch

❌ **DON'T** add CORS workarounds to iOS code:
```typescript
// ❌ BAD - breaks iOS
if (Platform.OS === 'ios') {
  // Use proxy to avoid CORS
  url = proxyUrl;
}
```

✅ **DO** handle CORS only for web:
```typescript
// ✅ GOOD - iOS works directly, web bypasses
const shouldSkipDirectFetch = Platform.OS === 'web' && isXTwitter;

if (!shouldSkipDirectFetch) {
  // iOS: fetch HTML directly (no CORS)
  const html = await fetch(url).then(r => r.text());
} else {
  // Web: skip HTML fetch, use backend only
  const html = '';
}
```

### Rule 4: Debugging Flow

When something breaks:

**STEP 1: Identify What Changed**
```bash
git status
git diff
git log --oneline -5
```

**STEP 2: Check Platform Difference**
```typescript
console.log('[Debug] Platform:', Platform.OS);
console.log('[Debug] URL:', actualUrl);
console.log('[Debug] Headers:', headers);
```

**STEP 3: Verify Backend Connectivity**
```bash
# From terminal:
curl -X POST https://api.standatpd.com/enhanced-media/process \
  -H "Content-Type: application/json" \
  -d '{"url":"https://x.com/test","transcribe":true}'

# Check response and status code
```

**STEP 4: Check Server Logs**
```bash
# SSH to server and check if request arrived
ssh server "docker logs extractor_api --tail 50"
```

**STEP 5: Only Then Fix Code**
- Don't guess
- Don't assume
- Fix based on evidence

### Rule 5: Testing Requirements

❌ **NEVER** commit without testing:
- [ ] iOS Simulator test
- [ ] Web browser test (localhost:8081)
- [ ] Check Network tab (no localhost calls in prod)
- [ ] Verify server logs (requests arriving)
- [ ] Check engagement data displays

✅ **Test both platforms for:**
- Backend URL changes
- Network request modifications
- Platform-specific conditionals
- Cache modifications
- Store updates

---

## File-Specific Rules

### `src/services/xCompleteService.ts`

**⚠️ HIGH RISK FILE - Test carefully**

Rules:
1. Keep `EXTRACTORT_URL` as direct `process.env` access
2. Don't add platform conditionals here (handle upstream)
3. Cache key format: `complete:${url}` - don't change
4. Timeout: 30s default - only increase with reason

### `src/api/improved-link-processor.ts`

**⚠️ COMPLEX FILE - Platform differences handled here**

Rules:
1. Lines 1398-1445: CORS bypass logic - don't touch without understanding
2. Platform detection (line 1398+): Test after any changes
3. Don't remove `shouldSkipDirectFetch` logic
4. Each platform case (`twitter`, `instagram`) must work on both iOS/Web

### `src/config/backend.ts`

**⚠️ IF THIS FILE EXISTS - BE CAREFUL**

Rules:
1. Check git status - is it tracked?
2. If untracked, someone created it - understand why
3. Don't import from here if direct `process.env` worked before
4. Platform-specific URLs must be tested on both platforms

### `src/state/savedStore.ts`

**⚠️ CORE STATE - Breaking this breaks everything**

Rules:
1. Don't modify `addSavedItem` flow without full understanding
2. Duplicate prevention logic is critical - don't break it
3. Auto-analysis for X/Twitter runs here - verify still works
4. Pending URLs tracking prevents race conditions - keep it

---

## Common Mistakes to Avoid

### Mistake 1: "Let me refactor this config"

❌ Problem:
```typescript
// Create new backend.ts with "better" config management
export const EXTRACTORT_URL = isWeb
  ? 'http://localhost:8080'
  : 'https://api.standatpd.com';
```

✅ Solution:
- Don't create new config files
- Use existing patterns
- If config exists, check git history first

### Mistake 2: "Web has CORS, so proxy everything"

❌ Problem:
```typescript
// Route web through localhost proxy
const url = Platform.OS === 'web'
  ? 'http://localhost:3010/proxy'
  : 'https://api.standatpd.com';
```

✅ Solution:
- Web CAN call api.standatpd.com directly (HTTPS with CORS headers)
- Only skip browser fetch to x.com (not to your API)
- iOS needs no special handling

### Mistake 3: "404 means endpoint doesn't exist"

❌ Wrong conclusion:
```
Response: 404 Not Found
Conclusion: "ExtractorT doesn't have this endpoint"
```

✅ Correct investigation:
1. Check nginx config on server (proxy_pass might be wrong)
2. Verify endpoint exists in ExtractorT code
3. Test with curl from server itself
4. Check if iOS works (if yes, issue is nginx routing)

### Mistake 4: "iOS works so I'll change it to match web"

❌ Problem:
```typescript
// iOS was calling directly, let me make it use proxy like web
const url = EXTRACTORW_URL + '/proxy'; // breaks iOS
```

✅ Solution:
- If iOS works, LEAVE IT ALONE
- Fix web to match iOS, not the other way around
- Working code > "consistent" broken code

---

## Git Workflow

### Before Commit

```bash
# 1. Check what changed
git status
git diff

# 2. Identify if changes affect platform-specific code
grep -r "Platform.OS" $(git diff --name-only)

# 3. Verify no accidental config changes
git diff src/config/
git diff src/services/xCompleteService.ts

# 4. If backend URLs changed, STOP and verify both platforms
```

### Commit Message Format

```
feat: Description of change

- iOS: Specific behavior/changes for iOS
- Web: Specific behavior/changes for Web
- Backend: Any backend URL or endpoint changes
- Breaking: List any breaking changes

Tested:
- [x] iOS Simulator
- [x] Web (localhost:8081)
- [x] Backend logs verified
```

### When to Ask for Help

**ASK** before proceeding if:
- [ ] Backend URLs need to change
- [ ] Platform-specific code is unclear
- [ ] Server returns unexpected status codes
- [ ] iOS works but Web doesn't (or vice versa)
- [ ] Need to add new backend service integration
- [ ] CORS errors appear in web
- [ ] Network requests timeout consistently

**DON'T** proceed blindly - breaking working code costs time.

---

## Performance Rules

### Caching

✅ **DO** use existing cache:
```typescript
// Check cache first
const cached = getXDataFromCache(cacheKey);
if (cached) return cached;

// After fetch, save to cache
setXDataToCache(cacheKey, data);
```

❌ **DON'T** bypass cache without reason:
```typescript
// ❌ Always fetching, ignoring cache
const data = await fetchXComplete(url);
```

### Request Deduplication

✅ **DO** prevent duplicate requests:
```typescript
// savedStore.ts has pendingUrls Set
if (this.pendingUrls.has(url)) {
  console.log('Already processing this URL');
  return;
}
```

❌ **DON'T** allow concurrent requests for same URL:
```typescript
// ❌ Multiple fetches for same URL
const [data1, data2] = await Promise.all([
  fetchXComplete(url),
  fetchXComplete(url), // duplicate!
]);
```

---

## Security Rules

1. **Never commit `.env` with real API keys**
   ```bash
   # Check before commit:
   git diff .env
   # If real keys are there, reset:
   git checkout .env
   ```

2. **Always use HTTPS in production**
   ```typescript
   // ❌ Never:
   const PROD_URL = 'http://api.standatpd.com';

   // ✅ Always:
   const PROD_URL = 'https://api.standatpd.com';
   ```

3. **Bearer tokens must not be logged**
   ```typescript
   // ❌ Don't log full token:
   console.log('Token:', bearerToken);

   // ✅ Log preview only:
   console.log('Token:', bearerToken?.slice(0, 10) + '...');
   ```

---

## Emergency Recovery

If you broke something:

### Quick Rollback

```bash
# Revert last commit
git revert HEAD

# Revert specific file
git checkout HEAD -- src/services/xCompleteService.ts

# Revert to specific commit
git checkout <commit-hash> -- <file>
```

### Verify Fix

```bash
# 1. Clear cache
rm -rf node_modules/.cache

# 2. Restart metro
npm start -- --reset-cache

# 3. Test both platforms
npm run ios
# And open http://localhost:8081 in browser

# 4. Check server logs
ssh server "docker logs extractor_api --tail 100"
```

---

## Summary Checklist

Before ANY backend or platform-specific change:

- [ ] Read `ARCHITECTURE.md`
- [ ] Check `git diff` to see current changes
- [ ] Understand iOS vs Web differences
- [ ] Verify backend URLs and endpoints
- [ ] Test on BOTH platforms
- [ ] Check Network tab / server logs
- [ ] Commit with clear message

**Remember**: Working code that's "ugly" > Broken code that's "clean"

---

**Last Updated**: 2025-10-31
**Project**: MobileApp (VibeCode)
**Critical Files**:
- `ARCHITECTURE.md` (read first)
- `src/services/xCompleteService.ts`
- `src/api/improved-link-processor.ts`
- `src/state/savedStore.ts`

