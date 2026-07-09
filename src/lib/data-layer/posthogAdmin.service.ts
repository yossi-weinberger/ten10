import { supabase } from "@/lib/supabaseClient";
import { logger } from "@/lib/logger";

export type PostHogAdminAnalytics = {
  available: boolean;
  error?: string;
  dau7d: number | null;
  wau30d: number | null;
  pageviews7d: number | null;
  signupCompleted7d: number | null;
  transactionCreated7d: number | null;
  importStarted7d: number | null;
  importCompleted7d: number | null;
  importSuccessRate7d: number | null;
  exceptions7d: number | null;
  surveyResponses30d: number | null;
  topPaths7d: Array<{ path: string; views: number }>;
  eventCounts7d: Array<{ event: string; count: number }>;
  links: {
    project: string;
    webAnalytics: string;
    surveys: string;
    errorTracking: string;
  };
  timestamp: string;
};

export async function fetchPostHogAdminAnalytics(): Promise<PostHogAdminAnalytics | null> {
  try {
    logger.log("PostHogAdminService: Fetching analytics");

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      logger.error("PostHogAdminService: No access token available");
      return null;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(
      `${supabaseUrl}/functions/v1/get-posthog-analytics`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error(
        "PostHogAdminService: Error response",
        response.status,
        errorData
      );
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = (await response.json()) as PostHogAdminAnalytics;
    logger.log("PostHogAdminService: Data fetched successfully");
    return data;
  } catch (error) {
    logger.error("PostHogAdminService: Failed to fetch analytics:", error);
    throw error;
  }
}
