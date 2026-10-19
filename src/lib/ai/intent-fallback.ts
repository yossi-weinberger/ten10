import { supabase } from "@/lib/supabaseClient";
import { INTAKE_INTENTS, type IntakeIntent } from "@/lib/ai/classify-intake";

export async function classifyIntentFallback(text: string): Promise<IntakeIntent | null> {
  const { data, error } = await supabase.functions.invoke("ai-classify-intent", {
    body: { text },
  });
  if (error || !data || typeof data !== "object") return null;
  const intent = (data as { intent?: unknown }).intent;
  if (typeof intent !== "string" || !(INTAKE_INTENTS as readonly string[]).includes(intent)) return null;
  return intent as IntakeIntent;
}
