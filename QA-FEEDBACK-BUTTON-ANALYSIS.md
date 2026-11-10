# QA Note: Floating Feedback Button at 320x568

## Issue Description
At 320x568 with the mobile sheet open, a right-edge floating feedback button may be partly clipped and overlap the 'Data analysis' sheet item.

## Code Analysis

### Z-Index Values (Both Branches)

**Main Branch**:
- Hamburger button: `fixed top-4 z-50` (left-4 or right-4 depending on RTL)
- Sheet overlay: `fixed inset-0 z-50`
- Sheet content: `fixed z-50`

**Current Branch (cursor/mobile-home-layout-step5-d900)**:
- Mobile top bar: `fixed top-0 inset-x-0 z-50`
- Sheet overlay: `fixed inset-0 z-50` (unchanged)
- Sheet content: `fixed z-50` (unchanged)

### Key Findings

1. **Sheet z-index unchanged**: Both branches use `z-50` for Sheet components
2. **Same z-index tier**: All fixed navigation elements (hamburger/top bar, Sheet) share `z-50`
3. **No feedback button in repo code**: No right-edge floating feedback button found in the codebase

### Likely Source: PostHog Native Widget

The "floating feedback button" is likely **PostHog's native feedback widget** (can be enabled in PostHog dashboard settings). This widget:
- Renders outside the React app (injected by PostHog SDK)
- Has its own z-index (typically very high, e.g., 99999)
- Would appear on both branches if enabled

### Conclusion

**This issue likely exists on main** for the following reasons:

1. Sheet components have identical z-index values on both branches (`z-50`)
2. PostHog's feedback widget (if enabled) would render at the same z-index on both branches
3. No code changes in this branch would specifically cause or fix PostHog widget clipping

### Recommendation

**Do not fix in this PR**. This is either:
- A pre-existing issue from main (PostHog widget configuration)
- An issue that should be verified visually on both branches before implementing a fix

If visual QA confirms this is new to this branch, the fix would be to either:
- Increase Sheet z-index to `z-[60]` or higher
- Hide PostHog widget when Sheet is open (via PostHog SDK configuration)
- Keep PostHog widget below Sheet z-index

All fixes require visual confirmation that the issue exists and is new to this branch.
