import { useState, useEffect } from "react";
import { usePlatform } from "@/contexts/PlatformContext";
import { useAuth } from "@/contexts/AuthContext";
import { fetchUserProfileDisplay } from "@/lib/data-layer/profile.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { logger } from "@/lib/logger";

export function UserInfoDisplay() {
  const { platform } = usePlatform();
  const { session, loading: authLoading, signOut } = useAuth();
  const [fullName, setFullName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<boolean>(false);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(["auth", "common", "navigation"]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate({ to: "/login", replace: true });
    } catch (e) {
      logger.error("Logout caught in UserInfoDisplay:", e);
    }
  };

  useEffect(() => {
    if (platform !== "web" || authLoading) {
      setProfileLoading(false);
      return;
    }
    if (!session?.user) {
      setProfileLoading(false);
      return;
    }

    let isMounted = true;
    setError(null);
    setProfileLoading(true);

    async function fetchProfile() {
      try {
        const { fullName, avatarUrl } = await fetchUserProfileDisplay(session!.user.id);

        if (isMounted) {
          setFullName(fullName);
          setAvatarError(false); // Reset error state
          setAvatarUrl(avatarUrl);
        }
      } catch (err: unknown) {
        logger.error("Error fetching profile:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : t("profile.loadError"));
        }
      } finally {
        if (isMounted) {
          setProfileLoading(false);
        }
      }
    }

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [platform, session, authLoading]);

  if (platform !== "web") {
    return null;
  }

  const isLoading = authLoading || profileLoading;

  return (
    <Card className="mb-6" dir={i18n.dir()}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("profile.userInfo.title")}</CardTitle>
        {session?.user && (
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-400/20 hover:text-red-700 dark:hover:text-red-300 border-red-300 dark:border-red-600"
            onClick={handleLogout}
            disabled={isLoading}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isLoading
              ? t("common:labels.loading")
              : t("navigation:menu.logout")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          {isLoading ? (
            <Skeleton className="h-16 w-16 rounded-full" />
          ) : avatarUrl && !avatarError ? (
            <img
              src={avatarUrl}
              alt={fullName || "User avatar"}
              className="h-16 w-16 rounded-full object-cover border border-border"
              onError={() => {
                setAvatarError(true);
              }}
              onLoad={() => {
                setAvatarError(false);
              }}
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="space-y-1">
            <div>
              <span className="font-semibold">
                {t("profile.userInfo.fullName")}:{" "}
              </span>
              {isLoading ? (
                <Skeleton className="h-4 w-[150px] inline-block" />
              ) : error && !fullName ? (
                <span className="text-destructive">{error}</span>
              ) : (
                <span>{fullName ?? t("profile.userInfo.notAvailable")}</span>
              )}
            </div>
            <div>
              <span className="font-semibold">
                {t("profile.userInfo.email")}:{" "}
              </span>
              {isLoading ? (
                <Skeleton className="h-4 w-[200px] inline-block" />
              ) : (
                <span>
                  {session?.user?.email ?? t("profile.userInfo.notAvailable")}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
