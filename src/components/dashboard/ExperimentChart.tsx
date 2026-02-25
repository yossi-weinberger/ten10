/**
 * Branch experiment: chart that fetches data from RPC + Edge Function.
 * Use a separate branch and Supabase Branching to see it work on preview before merging.
 */
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { getPlatform } from "@/lib/platformManager";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface ChartPoint {
  label: string;
  value: number;
}

interface EdgePayload {
  message?: string;
  source?: string;
  timestamp?: string;
}

export function ExperimentChart() {
  const { user } = useAuth();
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [edgePayload, setEdgePayload] = useState<EdgePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const platform = getPlatform();

  useEffect(() => {
    if (platform !== "web" || !user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [rpcRes, edgeRes] = await Promise.all([
          supabase.rpc("get_experiment_chart_data", { p_user_id: user!.id }),
          SUPABASE_URL && ANON_KEY
            ? fetch(`${SUPABASE_URL}/functions/v1/get-experiment-chart`, {
                headers: { Authorization: `Bearer ${ANON_KEY}` },
              })
            : Promise.resolve(null),
        ]);

        if (cancelled) return;

        if (rpcRes.error) {
          setError(rpcRes.error.message);
          return;
        }
        setChartData((rpcRes.data as ChartPoint[]) ?? []);

        if (edgeRes?.ok) {
          const json = (await edgeRes.json()) as EdgePayload;
          setEdgePayload(json);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [user?.id, platform]);

  if (platform !== "web") return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">ניסוי בראנץ׳ (Branch experiment)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && <p className="text-sm text-muted-foreground">טוען...</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {edgePayload && (
          <p className="text-sm text-muted-foreground">
            {edgePayload.message} • {edgePayload.source} • {edgePayload.timestamp}
          </p>
        )}
        {!loading && !error && chartData.length > 0 && (
          <ChartContainer
            config={{ value: { label: "תנועות" } }}
            className="h-[200px] w-full"
          >
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
        {!loading && !error && chartData.length === 0 && (
          <p className="text-sm text-muted-foreground">אין נתונים ל־6 החודשים האחרונים</p>
        )}
      </CardContent>
    </Card>
  );
}
