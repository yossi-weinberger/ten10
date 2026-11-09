import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatform } from "@/contexts/PlatformContext";
import { isAiIntakeEnabled } from "@/lib/ai/flags";
import { refreshOnVisible } from "@/lib/ai/refresh-after-intake";

export function RefreshOnReturn() {
  const { platform } = usePlatform();
  const { user } = useAuth();

  useEffect(() => {
    if (platform !== "web" || !user) return;

    const onChange = () => {
      if (!isAiIntakeEnabled()) return;
      refreshOnVisible(document.visibilityState);
    };
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, [platform, user]);

  return null;
}
