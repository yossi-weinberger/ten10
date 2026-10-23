import { useTranslation } from "react-i18next";
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatTrendBucketLabel } from "@/lib/admin/trend-chart.utils";
import type { AdminAiCounts, AdminAiSpend } from "@/lib/data-layer/aiAdmin.service";

const MODEL_COLORS = [
  "--chart-teal",
  "--chart-purple",
  "--chart-green",
  "--chart-yellow",
  "--chart-red",
  "--chart-orange",
  "--chart-blue",
];

function hasNumber(rows: Array<Record<string, unknown>>, keys: string[]): boolean {
  return rows.some((row) => keys.some((key) => Number(row[key]) > 0));
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <Alert>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function TimeChart({
  title,
  data,
  config,
  bars,
  line,
  lineAxis,
  empty,
  daily,
  locale,
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  config: ChartConfig;
  bars: Array<{ key: string; stack?: string }>;
  line?: string;
  lineAxis?: string;
  empty: string;
  daily: boolean;
  locale: string;
}) {
  const label = (value: unknown) => formatTrendBucketLabel(String(value), locale, daily);
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent><ChartEmpty message={empty} /></CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-auto h-[280px] w-full" dir="ltr">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} tickFormatter={label} />
            <YAxis yAxisId="left" tickLine={false} axisLine={false} width={48} />
            {lineAxis ? <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} width={40} /> : null}
            <ChartTooltip content={<ChartTooltipContent labelFormatter={label} />} />
            <ChartLegend
              content={(props) => (
                <ChartLegendContent payload={props.payload ?? []} verticalAlign={props.verticalAlign} />
              )}
            />
            {bars.map((bar) => (
              <Bar
                key={bar.key}
                dataKey={bar.key}
                yAxisId="left"
                stackId={bar.stack}
                fill={`var(--color-${bar.key})`}
              />
            ))}
            {line ? (
              <Line
                dataKey={line}
                yAxisId={lineAxis ?? "left"}
                stroke={`var(--color-${line})`}
                strokeWidth={2}
                dot={false}
              />
            ) : null}
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function AdminAiCharts({
  counts,
  spend,
}: {
  counts: AdminAiCounts | null;
  spend: AdminAiSpend | null;
}) {
  const { t, i18n } = useTranslation("admin");
  const locale = i18n.language === "he" ? "he-IL" : "en-US";
  const empty = t("ai.noData");
  const daily = (counts?.grain ?? spend?.grain) !== "month";

  const activity = counts?.buckets ?? [];
  const activityData = activity.map((row) => ({
    bucket: row.bucket,
    committed: row.committed,
    rejected: row.rejected,
    reverted: row.reverted,
    drafts: row.drafts,
  }));
  const inputData = activity.map((row) => ({
    bucket: row.bucket,
    text: row.text,
    receipt: row.receipt,
    speech: row.speech,
  }));
  const outcomeLabel = (key: string) => (
    key === "asked_family" || key === "searched_description" || key === "asked_again" || key === "answered" || key === "none"
      ? t(`ai.outcomes.${key}`)
      : key
  );
  const outcomes = Object.entries(counts?.question_outcomes ?? {})
    .filter(([, count]) => count > 0)
    .map(([key, value]) => ({ bucket: outcomeLabel(key), value }));

  const modelNames = [...new Set((spend?.modelBuckets ?? []).map((row) => row.model))];
  const modelConfig = {
    requests: { label: t("ai.requests"), color: "hsl(var(--chart-blue))" },
  } satisfies ChartConfig;
  const modelData = (spend?.days ?? []).map((day) => {
    const point: Record<string, string | number> = { bucket: day.bucket, requests: day.requestCount };
    modelNames.forEach((model, index) => {
      const match = spend?.modelBuckets.find((row) => row.bucket === day.bucket && row.model === model);
      point[`m${index}`] = match?.totalCost ?? 0;
    });
    return point;
  });
  modelNames.forEach((model, index) => {
    (modelConfig as ChartConfig)[`m${index}`] = {
      label: model,
      color: `hsl(var(${MODEL_COLORS[index % MODEL_COLORS.length]}))`,
    };
  });

  const perSave = spend?.appBuckets && counts
    ? counts.buckets
      .filter((row) => row.committed > 0)
      .map((row) => ({
        bucket: row.bucket,
        perSave: (spend.appBuckets?.find((item) => item.bucket === row.bucket)?.totalCost ?? 0) / row.committed,
      }))
    : null;

  return (
    <div className="space-y-4">
      <TimeChart
        title={t("ai.chartActivity")}
        data={hasNumber(activityData, ["committed", "rejected", "reverted", "drafts"]) ? activityData : []}
        config={{
          committed: { label: t("ai.committed"), color: "hsl(var(--chart-green))" },
          rejected: { label: t("ai.rejected"), color: "hsl(var(--chart-red))" },
          reverted: { label: t("ai.reverted"), color: "hsl(var(--chart-yellow))" },
          drafts: { label: t("ai.drafts"), color: "hsl(var(--chart-blue))" },
        }}
        bars={[
          { key: "committed", stack: "status" },
          { key: "rejected", stack: "status" },
          { key: "reverted", stack: "status" },
        ]}
        line="drafts"
        empty={empty}
        daily={daily}
        locale={locale}
      />
      <TimeChart
        title={t("ai.chartInput")}
        data={hasNumber(inputData, ["text", "receipt", "speech"]) ? inputData : []}
        config={{
          text: { label: t("ai.inputText"), color: "hsl(var(--chart-teal))" },
          receipt: { label: t("ai.inputReceipt"), color: "hsl(var(--chart-purple))" },
          speech: { label: t("ai.inputSpeech"), color: "hsl(var(--chart-orange))" },
        }}
        bars={[{ key: "text", stack: "input" }, { key: "receipt", stack: "input" }, { key: "speech", stack: "input" }]}
        empty={empty}
        daily={daily}
        locale={locale}
      />
      {spend?.available ? (
        <TimeChart
          title={t("ai.chartCost")}
          data={hasNumber(modelData, ["requests", ...modelNames.map((_, index) => `m${index}`)]) ? modelData : []}
          config={modelConfig}
          bars={modelNames.map((_, index) => ({ key: `m${index}`, stack: "cost" }))}
          line="requests"
          lineAxis="right"
          empty={empty}
          daily={spend.grain !== "month"}
          locale={locale}
        />
      ) : null}
      {perSave ? (
        <TimeChart
          title={t("ai.chartPerSave")}
          data={perSave.some((row) => row.perSave > 0) ? perSave : []}
          config={{ perSave: { label: t("ai.chartPerSave"), color: "hsl(var(--chart-green))" } }}
          bars={[{ key: "perSave" }]}
          empty={empty}
          daily={daily}
          locale={locale}
        />
      ) : null}
      <Card>
        <CardHeader><CardTitle>{t("ai.chartOutcomes")}</CardTitle></CardHeader>
        <CardContent>
          {outcomes.length === 0 ? <ChartEmpty message={empty} /> : (
            <ChartContainer
              config={{ value: { label: t("ai.questions"), color: "hsl(var(--chart-purple))" } }}
              className="aspect-auto h-[240px] w-full"
              dir="ltr"
            >
              <ComposedChart data={outcomes}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} width={40} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" />
              </ComposedChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
