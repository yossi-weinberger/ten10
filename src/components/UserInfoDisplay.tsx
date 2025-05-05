import React, { useState, useEffect } from "react";
import { usePlatform } from "@/contexts/PlatformContext"; // Assuming path
import { useAuth } from "@/contexts/AuthContext"; // Assuming path, check if useAuth hook exists
import { supabase } from "@/lib/supabaseClient"; // Assuming path
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton"; // For loading state

export function UserInfoDisplay() {
  const { platform } = usePlatform();
  const { session, loading: authLoading } = useAuth(); // Get session and auth loading state
  const [fullName, setFullName] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only run on web platform and when auth is potentially ready
    if (platform !== "web" || authLoading) {
      setProfileLoading(false); // Not applicable or auth still loading
      return;
    }

    // If no session, no profile to fetch
    if (!session?.user) {
      setProfileLoading(false);
      setError("No active session."); // Or handle silently
      return;
    }

    let isMounted = true;
    setError(null); // Reset error on new fetch attempt
    setProfileLoading(true);

    async function fetchProfile() {
      try {
        const {
          data,
          error: fetchError,
          status,
        } = await supabase
          .from("profiles")
          .select(`full_name`)
          .eq("id", session!.user.id) // Use non-null assertion as we checked session.user
          .single();

        if (fetchError && status !== 406) {
          // 406: No row found, handle potentially
          throw fetchError;
        }

        if (isMounted) {
          setFullName(data?.full_name || "N/A"); // Set name or indicate not available
        }
      } catch (err: any) {
        console.error("Error fetching profile:", err);
        if (isMounted) {
          setError(err.message || "Failed to load profile name.");
          setFullName("Error"); // Indicate error state
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
  }, [platform, session, authLoading]); // Re-run if platform, session, or authLoading changes

  // Don't render anything if not on web platform
  if (platform !== "web") {
    return null;
  }

  // Display loading skeletons while auth or profile is loading
  const isLoading = authLoading || profileLoading;

  return (
    <Card className="mb-6">
      {" "}
      {/* Add margin bottom for spacing */}
      <CardHeader>
        <CardTitle>פרטי משתמש נוכחי</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <span className="font-semibold">דואר אלקטרוני: </span>
          {isLoading ? (
            <Skeleton className="h-4 w-[200px] inline-block" />
          ) : (
            <span>{session?.user?.email || "N/A"}</span>
          )}
        </div>
        <div>
          <span className="font-semibold">שם מלא: </span>
          {isLoading ? (
            <Skeleton className="h-4 w-[150px] inline-block" />
          ) : error ? (
            <span className="text-destructive">{error}</span>
          ) : (
            <span>{fullName ?? "טוען..."}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
