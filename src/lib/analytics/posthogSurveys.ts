import posthog from "posthog-js";
import { isPostHogSupported } from "@/lib/analytics/posthogClient";

/** PostHog survey: Ten10 Home Feedback (API type). */
export const HOME_FEEDBACK_SURVEY_ID =
  "019f46de-28a2-0000-6426-155935ed61c6";

export const HOME_FEEDBACK_QUESTION_IDS = {
  source: "eded79ef-a44e-4e1f-98b1-44d6ec032325",
  satisfaction: "d9777353-2128-487d-9bb9-56f8abbbe14d",
  recommend: "f6736f31-895f-4673-8ec1-3e7e1bc0c720",
  suggestions: "51f454c5-eeef-45ff-8e9b-f3c81a7545f4",
} as const;

/** Show feedback only after the user has more than this many transactions. */
export const FEEDBACK_MIN_TRANSACTIONS = 10;

/** Stable keys stored in PostHog; UI labels come from i18n. */
export const FEEDBACK_SOURCE_KEYS = [
  "friend_family",
  "groups",
  "google_search",
  "social_media",
  "mailing_list",
  "forums",
  "other",
] as const;

export type FeedbackSourceKey = (typeof FEEDBACK_SOURCE_KEYS)[number];

const COMPLETED_STORAGE_KEY = `ph_survey_completed_${HOME_FEEDBACK_SURVEY_ID}`;
const SEEN_STORAGE_KEY = `ph_survey_seen_${HOME_FEEDBACK_SURVEY_ID}`;

/** True after the user has opened the feedback dialog at least once. */
export function isHomeFeedbackSeenLocally(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SEEN_STORAGE_KEY) === "1";
}

export function markHomeFeedbackSeenLocally(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SEEN_STORAGE_KEY, "1");
}

export type HomeFeedbackAnswers = {
  source: FeedbackSourceKey;
  /** Free-text detail when source is `other`. */
  sourceOther?: string;
  satisfaction: number;
  recommend: number;
  suggestions?: string;
};

export function isHomeFeedbackCompletedLocally(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(COMPLETED_STORAGE_KEY) === "1";
}

export function markHomeFeedbackCompletedLocally(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(COMPLETED_STORAGE_KEY, "1");
}

export function captureHomeFeedbackShown(): void {
  if (!isPostHogSupported()) return;
  posthog.capture("survey shown", {
    $survey_id: HOME_FEEDBACK_SURVEY_ID,
  });
}

export function captureHomeFeedbackDismissed(): void {
  if (!isPostHogSupported()) return;
  posthog.capture("survey dismissed", {
    $survey_id: HOME_FEEDBACK_SURVEY_ID,
  });
}

export function submitHomeFeedback(answers: HomeFeedbackAnswers): void {
  if (!isPostHogSupported()) return;

  const submissionId = crypto.randomUUID();
  const sourceOther = answers.sourceOther?.trim();
  posthog.capture("survey sent", {
    $survey_id: HOME_FEEDBACK_SURVEY_ID,
    $survey_submission_id: submissionId,
    $survey_completed: true,
    // Keep stable key for breakdowns; free text lives in source_other_text.
    [`$survey_response_${HOME_FEEDBACK_QUESTION_IDS.source}`]: answers.source,
    ...(answers.source === "other" && sourceOther
      ? { source_other_text: sourceOther }
      : {}),
    [`$survey_response_${HOME_FEEDBACK_QUESTION_IDS.satisfaction}`]:
      answers.satisfaction,
    [`$survey_response_${HOME_FEEDBACK_QUESTION_IDS.recommend}`]:
      answers.recommend,
    ...(answers.suggestions?.trim()
      ? {
          [`$survey_response_${HOME_FEEDBACK_QUESTION_IDS.suggestions}`]:
            answers.suggestions.trim(),
        }
      : {}),
    $survey_questions: [
      {
        id: HOME_FEEDBACK_QUESTION_IDS.source,
        question: "Where did you hear about us?",
      },
      {
        id: HOME_FEEDBACK_QUESTION_IDS.satisfaction,
        question: "How satisfied are you?",
      },
      {
        id: HOME_FEEDBACK_QUESTION_IDS.recommend,
        question: "Would you recommend Ten10?",
      },
      {
        id: HOME_FEEDBACK_QUESTION_IDS.suggestions,
        question: "Suggestions for improvement",
      },
    ],
  });

  markHomeFeedbackCompletedLocally();
}
