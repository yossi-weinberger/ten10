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
}

export function AreaChartInteractive({
  chartData,
  chartConfig,
}: AreaChartInteractiveProps) {
  const DESIRED_SERIES_ORDER: MonthlyDataSeriesKey[] = [
    "income",
    "expenses",
    "donations",
  ];

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

  return (
    <Card>
      {/* CardHeader can be part of the parent component (MonthlyChart) 
          or customized here if this component is always standalone */}
      {/* For now, let's assume title/description might come from parent or be generic */}
      <CardHeader>
        {/* <CardTitle>Interactive Area Chart</CardTitle>
        <CardDescription>Displaying financial trends over time</CardDescription> */}
      </CardHeader>
      <CardContent className="h-[450px]">
        {" "}
        {/* Adjusted height similar to MonthlyChart */}
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-full w-full" // Use h-full to respect CardContent height
        >
          <AreaChart
            accessibilityLayer
            data={chartData} // Use data passed via props
            margin={{
              left: 12,
              right: 12,
              top: 20, // Adjusted margin similar to MonthlyChart
              bottom: 20, // Added bottom margin for legend
            }}
          >
            <CartesianGrid vertical={false} className="stroke-muted" />
            <XAxis
              dataKey="month" // Key for the X-axis data (e.g., "Jan 2023")
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              // tickFormatter={(value) => value.slice(0, 3)} // Example, can be customized further if needed
              className="text-sm font-medium"
              tick={{ fill: "currentColor" }}
            />
            <YAxis
              orientation="right" // Consistent with MonthlyChart
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `₪${Number(value).toLocaleString()}`} // Format as currency
              className="text-sm font-medium"
              tick={{ fill: "currentColor" }}
            />
            <ChartTooltip
              cursor={true} // Show cursor line on hover
              content={<ChartTooltipContent indicator="dot" />} // Standard tooltip
            />
            <ChartLegend
              content={<ChartLegendContent />}
              wrapperStyle={{ paddingTop: "20px" }}
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
                        stopColor={`var(--color-${key})`} // Uses CSS var generated by ChartStyle from chartConfig
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

            {/* Render Area for each series */}
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
                    type="linear" // Changed from "natural" to "linear"
                    fill={`url(#fill-gradient-${key})`}
                    stroke={`var(--color-${key})`}
                    fillOpacity={1} // Opacity is handled by the gradient
                    strokeWidth={2}
                  />
                );
              }
              return null;
            })}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
