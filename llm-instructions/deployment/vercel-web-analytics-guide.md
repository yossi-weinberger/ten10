# Vercel Web Analytics Integration Guide

## Overview

This guide documents how Vercel Web Analytics is configured and used in the Ten10 project. The analytics integration enables tracking of visitor metrics, page views, and custom events to monitor application performance and user engagement.

## Prerequisites

- A Vercel account (free plan includes Web Analytics)
- A Vercel project linked to this repository
- The project is deployed to Vercel

## Current Implementation

### Dependencies

The project includes the following analytics packages in `package.json`:

```json
{
  "dependencies": {
    "@vercel/analytics": "^1.6.1",
    "@vercel/speed-insights": "^1.2.0"
  }
}
```

### Analytics Setup

Both Vercel Analytics and Speed Insights are already integrated into the main application entry point in `src/main.tsx`:

```tsx
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="Ten10-ui-theme">
      <PlatformProvider>
        <TWAProvider>
          <AuthProvider>
            <RouterProvider router={router} />
            <Toaster position="top-center" />
            <SpeedInsights />
            <Analytics />
          </AuthProvider>
        </TWAProvider>
      </PlatformProvider>
    </ThemeProvider>
  </StrictMode>
);
```

### What This Means

1. **Analytics Component**: The `<Analytics />` component from `@vercel/analytics/react` automatically tracks:
   - Page views
   - Visitor metrics
   - Route changes (via TanStack Router)
   - Custom events (when configured)

2. **Speed Insights Component**: The `<SpeedInsights />` component from `@vercel/speed-insights/react` monitors:
   - Core Web Vitals (LCP, FCP, CLS, TTFB, INP)
   - Performance metrics for optimization

3. **No Additional Configuration Needed**: Both components work out of the box. They communicate with Vercel's backend at `/_vercel/insights/*` endpoints after deployment.

## Enabling Web Analytics in Vercel Dashboard

To start collecting analytics data:

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select the Ten10 project
3. Navigate to the **Analytics** tab
4. Click **Enable** if it's not already enabled
5. Accept the dialog confirming that new routes will be added at `/_vercel/insights/*`

> **Note**: Enabling Web Analytics adds new routes (scoped at `/_vercel/insights/*`) after your next deployment.

## Deployment

To start tracking analytics:

1. Push your code to the main branch
2. Vercel will automatically deploy the application
3. Alternatively, deploy manually using the Vercel CLI:

```bash
vercel deploy
```

Once deployed, the application will:
- Automatically send analytics data to Vercel
- Display fetch/XHR requests to `/_vercel/insights/view` in the browser's Network tab
- Begin collecting visitor and page view metrics

## Viewing Analytics Data

Once your application is deployed and users have visited the site:

1. Navigate to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select the Ten10 project
3. Click the **Analytics** tab
4. View metrics including:
   - Total visitors
   - Page views by path
   - Core Web Vitals
   - Response times

Data collection begins immediately after deployment, but meaningful insights require several days of visitor traffic.

## Custom Events

To track custom user interactions (button clicks, form submissions, purchases, etc.), use the `trackEvent` function from `@vercel/analytics/react`:

```tsx
import { trackEvent } from "@vercel/analytics/react";

// Example: Track a button click
<button
  onClick={() => {
    trackEvent("button_clicked", { label: "add_transaction" });
    // ... rest of your button logic
  }}
>
  Add Transaction
</button>

// Example: Track form submission
const handleSubmit = (data) => {
  trackEvent("form_submitted", { form_name: "transaction_form" });
  // ... rest of your submission logic
};
```

### Custom Event Best Practices

1. **Event Names**: Use snake_case for event names (e.g., `add_transaction`, `form_submitted`)
2. **Properties**: Include relevant context as properties (user segment, form type, etc.)
3. **Meaningful Events**: Only track events that provide actionable insights
4. **Avoid Overly Specific Events**: Balance granularity with data volume to avoid hitting Vercel's custom event limits

## Filtering and Analysis

The Vercel Analytics dashboard provides filtering capabilities:

- **By Path**: Focus on specific pages
- **By Device**: Desktop vs. Mobile analytics
- **By Browser**: Understand which browsers your users prefer
- **By Country**: Geographic distribution of users
- **By Custom Event**: Track user interactions across your application

Users on **Pro and Enterprise** plans can add custom events beyond the default page view metrics.

## Privacy and Data Compliance

Vercel Web Analytics is designed with privacy in mind:

- **No Cookies**: Analytics work without setting cookies
- **GDPR Compliant**: No personal data is collected or stored
- **No User Tracking**: Cannot identify individual users across sessions
- **Data Retention**: Analytics data is stored according to [Vercel's data retention policy](https://docs.astro.build/en/guides/integrations-guide/vercel/#webanalytics)

For complete information on privacy and compliance standards, see [Vercel's Privacy Policy](https://vercel.com/legal/privacy-policy).

## Troubleshooting

### Analytics Not Appearing in Dashboard

1. **Check Deployment**: Ensure the application is deployed to Vercel, not running locally
2. **Verify Enable State**: Confirm Web Analytics is enabled in the project settings
3. **Browser Network Tab**: Open DevTools → Network tab and look for requests to `/_vercel/insights/view`
4. **Wait for Data**: Allow several hours for initial data collection; real-time metrics may take a few minutes to appear

### Custom Events Not Tracking

1. **Verify Function Called**: Ensure `trackEvent()` is called with correct parameters
2. **Check Event Properties**: Make sure event names and property formats are valid
3. **Plan Limits**: Verify you haven't exceeded custom event limits on your plan

## Next Steps

1. **Monitor Core Web Vitals**: Use Speed Insights data to identify performance bottlenecks
2. **Add Custom Events**: Implement event tracking for key user interactions (e.g., transaction creation)
3. **Set Up Alerts**: Configure Vercel notifications for critical performance degradations
4. **Regular Reviews**: Schedule weekly reviews of analytics trends to inform product decisions

## Related Documentation

- [Vercel Web Analytics Overview](https://vercel.com/docs/analytics)
- [Web Analytics Package Documentation](https://vercel.com/docs/analytics/package)
- [Custom Events Guide](https://vercel.com/docs/analytics/custom-events)
- [Web Vitals Explained](https://vercel.com/docs/analytics/web-vitals)
- [Vercel Speed Insights Documentation](https://vercel.com/docs/speed-insights)

## References

- Project dependencies: `package.json`
- Analytics configuration: `src/main.tsx`
- Vercel configuration: `vercel.json`
