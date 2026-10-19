import { normalizeArrivalCode } from "./arrival-code";
import {
  firstTouchUtmOrEmpty,
  readFirstTouch,
  type FirstTouchAttribution,
  type SignupUtm,
} from "./capture";

export type SignupAuthMetadata = {
  full_name: string;
  arrival_code?: string;
  signup_utm?: SignupUtm;
};

export type SignupProfileCoreUpdate = {
  full_name: string;
  mailing_list_consent: boolean;
};

export type SignupAttributionUpdate = {
  arrival_code: string;
  signup_utm: SignupUtm | null;
  arrival_code_set_at: string;
};

export type EmailSignupPayload = {
  authMetadata: SignupAuthMetadata;
  profileUpdate: SignupProfileCoreUpdate;
  attributionUpdate: SignupAttributionUpdate | null;
};

function utmOrNull(utm: SignupUtm): SignupUtm | null {
  if (!utm.utm_source && !utm.utm_medium && !utm.utm_campaign) return null;
  return utm;
}

export function buildEmailSignupPayload(input: {
  fullName: string;
  mailingListConsent: boolean;
  arrivalCode: string;
  firstTouch?: FirstTouchAttribution | null;
  now?: Date;
}): EmailSignupPayload {
  const full_name = input.fullName.trim();
  const code = normalizeArrivalCode(input.arrivalCode);
  const touch = input.firstTouch ?? readFirstTouch();
  const utm = utmOrNull(firstTouchUtmOrEmpty(touch));

  const authMetadata: SignupAuthMetadata = { full_name };
  let attributionUpdate: SignupAttributionUpdate | null = null;

  if (code) {
    authMetadata.arrival_code = code;
    if (utm) authMetadata.signup_utm = utm;
    attributionUpdate = {
      arrival_code: code,
      signup_utm: utm,
      arrival_code_set_at: (input.now ?? new Date()).toISOString(),
    };
  }

  return {
    authMetadata,
    profileUpdate: {
      full_name,
      mailing_list_consent: input.mailingListConsent,
    },
    attributionUpdate,
  };
}
