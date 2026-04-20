import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";

interface ChartPoint {
  label: string;
  value: number;
}

const chartConfig = {
  value: {
    label: "Value",
    color: "hsl(var(--chart-2))",
  },
};

export function ExperimentChart() {
  const { user } = useAuth();
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchChart() {
      try {
        const { data: res, error: fnError } = await supabase.functions.invoke(
          "get-experiment-chart",
          {}
        );

        if (cancelled) return;

        if (fnError) {
          setError(fnError.message ?? "Failed to load chart");
          return;
        }

        const series = (res?.data ?? []) as ChartPoint[];
        setData(Array.isArray(series) ? series : []);
      } catch (err) {
        if (!cancelled) {
          logger.error("Experiment chart fetch error:", err);
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchChart();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Experiment chart</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Loading…</p>
        </CardContent>
      </Card>
    );
  }
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Experiment chart</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-sm">{error}</p>
        </CardContent>
      </Card>
    );
  }
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Experiment chart</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Experiment chart</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart data={data} margin={{ left: 12, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
