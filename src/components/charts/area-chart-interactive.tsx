"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"; // Using existing chart primitives
import { cn } from "@/lib/utils";

// Define a more specific type for our data series keys from MonthlyChart
export type MonthlyDataSeriesKey = "income" | "donations" | "expenses";

// Define the expected structure for a single data point in chartData
export interface MonthlyChartDataPoint {
  month: string; // Formatted month string e.g., "Jan 2023"
  income?: number;
  donations?: number;
  expenses?: number;
  // Can include other keys if needed, but the chart will focus on the above
}

interface AreaChartInteractiveProps {
  chartData: MonthlyChartDataPoint[];
  chartConfig: ChartConfig;
  // Expects chartConfig to have entries for 'income', 'donations', 'expenses'
  // e.g., chartConfig.income = { label: "הכנסות", color: "hsl(var(--chart-1))" }
  withCard?: boolean;
  className?: string;
  currencySymbol?: string;
  locale?: string;
}

export function AreaChartInteractive({
  chartData,
  chartConfig,
  withCard = true,
  className,
  currencySymbol = "₪",
  locale = "he-IL",
}: AreaChartInteractiveProps) {
  const [isSmallScreen, setIsSmallScreen] = React.useState(false);
  const [isLandscape, setIsLandscape] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const landscapeMql = window.matchMedia("(pointer: coarse) and (max-height: 500px)");
    
    const onChange = () => {
      setIsSmallScreen(mql.matches);
      setIsLandscape(landscapeMql.matches);
    };
    
    onChange();
    mql.addEventListener("change", onChange);
    landscapeMql.addEventListener("change", onChange);
    
    return () => {
      mql.removeEventListener("change", onChange);
      landscapeMql.removeEventListener("change", onChange);
    };
  }, []);

  const DESIRED_SERIES_ORDER: MonthlyDataSeriesKey[] = [
    "income",
    "expenses",
    "donations",
  ];

  const formatYAxisTick = React.useCallback((value: number): string => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "";
    
    if (isSmallScreen) {
      const compact = new Intl.NumberFormat(locale, {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(num);
      return `${currencySymbol}${compact}`;
    }
    
    return `${currencySymbol}${num.toLocaleString(locale)}`;
  }, [isSmallScreen, currencySymbol, locale]);

  const xAxisInterval = React.useMemo(() => {
    if (!isSmallScreen) return undefined;
    return "preserveStartEnd";
  }, [isSmallScreen]);

  const seriesToDisplay = React.useMemo(() => {
    const availableSeries = (
      Object.keys(chartConfig) as MonthlyDataSeriesKey[]
    ).filter((key) => {
      const config = chartConfig[key];
      // Ensure the key is one of our expected data series keys
      if (key === "income" || key === "donations" || key === "expenses") {
        return !!(config.color || ("theme" in config && config.theme));
      }
      return false;
    });

    // Sort the available series according to DESIRED_SERIES_ORDER
    return availableSeries.sort((a, b) => {
      return DESIRED_SERIES_ORDER.indexOf(a) - DESIRED_SERIES_ORDER.indexOf(b);
    });
  }, [chartConfig]); // DESIRED_SERIES_ORDER is stable, so not needed in deps array

  if (!chartData || chartData.length === 0) {
    if (!withCard) {
      return (
        <div
          className={cn(
            "flex min-h-[250px] items-center justify-center",
            className
          )}
        >
          <p>No data available to display the chart.</p>
        </div>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Area Chart - Interactive</CardTitle>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center">
          <p>No data available to display the chart.</p>
        </CardContent>
      </Card>
    );
  }

  const landscapeHeightStyle = isLandscape ? {
    height: "clamp(160px, calc(100svh - 170px), 200px)"
  } : undefined;

  const chart = (
    <ChartContainer
      config={chartConfig}
      className={cn("aspect-auto w-full", className)}
      style={landscapeHeightStyle}
    >
      <AreaChart
        accessibilityLayer
        data={chartData}
        margin={{
          left: isSmallScreen ? 4 : 12,
          right: isSmallScreen ? 4 : 12,
          top: isSmallScreen ? 8 : 20,
          bottom: isSmallScreen ? (isLandscape ? 8 : 12) : 20,
        }}
      >
        <CartesianGrid vertical={false} className="stroke-muted" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={isSmallScreen ? 4 : 8}
          interval={xAxisInterval}
          minTickGap={isSmallScreen ? 24 : undefined}
          padding={isSmallScreen ? { left: 12, right: 12 } : undefined}
          className="text-sm font-medium"
          tick={{ fill: "currentColor", fontSize: isSmallScreen ? 11 : undefined }}
        />
        <YAxis
          orientation="right"
          tickLine={false}
          axisLine={false}
          tickMargin={isSmallScreen ? 4 : 8}
          width={isSmallScreen ? 50 : undefined}
          tickFormatter={formatYAxisTick}
          className="text-sm font-medium"
          tick={{ fill: "currentColor" }}
        />
        <ChartTooltip
          cursor={true}
          content={<ChartTooltipContent indicator="dot" />}
          wrapperStyle={isSmallScreen ? { zIndex: 1000 } : undefined}
          allowEscapeViewBox={isSmallScreen ? { x: false, y: false } : undefined}
        />
        <ChartLegend
          content={<ChartLegendContent />}
          align={isSmallScreen ? "center" : undefined}
          verticalAlign={isSmallScreen ? "bottom" : undefined}
          layout={isSmallScreen ? "horizontal" : undefined}
          wrapperStyle={{ paddingTop: isSmallScreen ? "4px" : "20px" }}
        />
        <defs>
          {seriesToDisplay.map((key) => {
            const seriesConfig = chartConfig[key];
            if (
              seriesConfig.color ||
              ("theme" in seriesConfig && seriesConfig.theme)
            ) {
              return (
                <linearGradient
                  key={`fill-gradient-${key}`}
                  id={`fill-gradient-${key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={`var(--color-${key})`}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={`var(--color-${key})`}
                    stopOpacity={0.1}
                  />
                </linearGradient>
              );
            }
            return null;
          })}
        </defs>

        {seriesToDisplay.map((key) => {
          const seriesConfig = chartConfig[key];
          if (
            seriesConfig.color ||
            ("theme" in seriesConfig && seriesConfig.theme)
          ) {
            return (
              <Area
                key={key}
                dataKey={key}
                type="monotoneX"
                fill={`url(#fill-gradient-${key})`}
                stroke={`var(--color-${key})`}
                fillOpacity={1}
                strokeWidth={2}
              />
            );
          }
          return null;
        })}
      </AreaChart>
    </ChartContainer>
  );

  if (!withCard) {
    return chart;
  }

  return (
    <Card>
      <CardHeader>
        {/* intentionally empty - header lives in parent */}
      </CardHeader>
      <CardContent className="h-[450px]">{chart}</CardContent>
    </Card>
  );
}
