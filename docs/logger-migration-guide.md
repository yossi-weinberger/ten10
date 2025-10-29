# Logger Migration Guide

## Overview

This project uses a centralized logger utility (`src/lib/logger.ts`) to manage all console output. The logger automatically disables non-critical logs in production builds while maintaining full functionality in development.

## Why Use the Logger?

✅ **Benefits:**

- Automatically disabled in production (reduces bundle size, improves performance)
- Consistent logging interface across the entire codebase
- Easy to add features like log levels, timestamps, or remote logging in the future
- Better debugging with structured logging
- Critical errors (`.error()`) still log in production

## Quick Start

### Import the Logger

```typescript
import { logger } from "@/lib/logger";
```

### Replace console._ with logger._

**Before:**

```typescript
console.log("User logged in:", user);
console.error("Failed to fetch data:", error);
console.warn("Deprecation warning");
console.info("App initialized");
```

**After:**

```typescript
logger.log("User logged in:", user);
logger.error("Failed to fetch data:", error);
logger.warn("Deprecation warning");
logger.info("App initialized");
```

## API Reference

### logger.log(...args)

Standard log message. **Disabled in production.**

```typescript
logger.log("Message", variable, { data: "object" });
```

### logger.error(...args)

Error message. **Always logs, even in production** (for critical errors).

```typescript
logger.error("Error occurred:", error);
```

### logger.warn(...args)

Warning message. **Disabled in production.**

```typescript
logger.warn("Deprecation warning:", oldApi);
```

### logger.info(...args)

Info message. **Disabled in production.**

```typescript
logger.info("App initialized successfully");
```

### logger.debug(...args)

Debug message. **Disabled in production.**

```typescript
logger.debug("Debug data:", debugInfo);
```

### logger.group(label) / logger.groupEnd()

Group related logs together. **Disabled in production.**

```typescript
logger.group("User Authentication");
logger.log("Checking credentials...");
logger.log("Token validated");
logger.groupEnd();
```

### logger.table(data)

Display data as a table. **Disabled in production.**

```typescript
logger.table([
  { name: "John", age: 30 },
  { name: "Jane", age: 25 },
]);
```

### logger.time(label) / logger.timeEnd(label)

Measure execution time. **Disabled in production.**

```typescript
logger.time("Data Fetch");
await fetchData();
logger.timeEnd("Data Fetch"); // Logs: "Data Fetch: 123ms"
```

## Migration Instructions

### Automated Migration (Recommended)

You can use find-and-replace to migrate files quickly:

**Find:** `console\.(log|warn|info|debug)`  
**Replace:** `logger.$1`

Then add the import at the top:

```typescript
import { logger } from "@/lib/logger";
```

### Manual Migration

For each file with console statements:

1. Add the import:

   ```typescript
   import { logger } from "@/lib/logger";
   ```

2. Replace console calls:
   - `console.log` → `logger.log`
   - `console.error` → `logger.error`
   - `console.warn` → `logger.warn`
   - `console.info` → `logger.info`
   - `console.debug` → `logger.debug`

## Files Already Migrated

- ✅ `src/App.tsx`
- ✅ `src/lib/i18n.ts`
- ✅ `src/lib/store.ts`
- ✅ `src/lib/logger.ts`

## Files Pending Migration

Run this command to see remaining console statements:

```bash
grep -r "console\." src/ --exclude-dir=node_modules
```

Current count: **~316 remaining** across **~34 files**

## ESLint Rule (Optional)

To prevent new direct console usage, add this to `.eslintrc.cjs`:

```javascript
rules: {
  'no-console': ['warn', { allow: ['error'] }], // Only allow console.error
}
```

This will warn developers to use the logger instead of console directly.

## Best Practices

### ✅ DO:

```typescript
// Use logger for all logging
logger.log("User action:", action);

// Use logger.error for errors (even in production)
logger.error("Critical error:", error);

// Use meaningful log messages
logger.log("[AuthContext] User session initialized:", userId);
```

### ❌ DON'T:

```typescript
// Don't use console directly
console.log("Something happened"); // ❌

// Don't use logger for sensitive data in production
logger.log("Password:", password); // ❌ Never log sensitive data

// Don't over-log
logger.log("1"); // ❌ Not descriptive
```

## Future Enhancements

The logger can be extended to support:

- Log levels (trace, debug, info, warn, error)
- Timestamps
- Remote logging (send errors to a service)
- Log filtering by component
- Structured logging with metadata

## Questions?

If you have questions about the logger or need help migrating a complex case, please ask!
