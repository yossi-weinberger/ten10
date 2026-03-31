import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
  PieChart, Pie, Legend, Tooltip,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { PieCustomTooltip } from "./PieCustomTooltip";

/**
 * Generate evenly-distributed, muted HSL colors for pie/donut slices.
 * Spreads hues across 360° so colors never repeat regardless of slice count.
 * Saturation ~50% and lightness ~57% keep colors readable without being harsh.
 */
function getPieSliceColor(index: number, total: number): string {
  const hue = Math.round((index * 360) / Math.max(total, 1)) % 360;
  return `hsl(${hue}, 50%, 57%)`;
}

export interface BreakdownDataItem {
  label: string;
  total_amount: number;
  fill?: string;
}

interface BreakdownBarPieChartProps {
  data: BreakdownDataItem[];
  totalAmount: number;
  chartConfig: ChartConfig;
  chartView: "bar" | "pie";
  /** Prefix for AnimatePresence keys — use a unique value when the same view
   *  should re-animate on data-category change (e.g. expense→income tabs). */
  motionKeyPrefix?: string;
  pieHeight: number;
  scrollHeight: number;
  fullBarHeight: number;
  fmt: (v: number) => string;
  yAxisWidth?: number;
  outerRadius?: number;
  innerRadius?: number;
}

export function BreakdownBarPieChart({
  data,
  totalAmount,
  chartConfig,
  chartView,
  motionKeyPrefix = "",
  pieHeight,
  scrollHeight,
  fullBarHeight,
  fmt,
  yAxisWidth = 95,
  outerRadius = 90,
  innerRadius = 50,
}: BreakdownBarPieChartProps) {
  return (
    <AnimatePresence mode="wait">
      {chartView === "bar" ? (
        <motion.div
          key={`${motionKeyPrefix}bar`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full"
          dir="ltr"
        >
          <div style={{ maxHeight: scrollHeight, overflowY: "auto", width: "100%" }}>
            <ChartContainer
              config={chartConfig}
              className="w-full"
              style={{ height: fullBarHeight, minHeight: fullBarHeight }}
            >
              <BarChart data={data} layout="vertical" margin={{ top: 0, right: 70, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <YAxis
                  dataKey="label"
                  type="category"
                  width={yAxisWidth}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => fmt(v)}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmt(Number(value))} />} />
                <Bar dataKey="total_amount" radius={[0, 4, 4, 0]} isAnimationActive maxBarSize={22}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key={`${motionKeyPrefix}pie`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full"
          dir="ltr"
        >
          <ChartContainer
            config={chartConfig}
            className="w-full"
            style={{ height: pieHeight, minHeight: pieHeight }}
          >
            <PieChart>
              <Pie
                data={data}
                dataKey="total_amount"
                nameKey="label"
                cx="50%"
                cy="45%"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                isAnimationActive
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill ?? getPieSliceColor(index, data.length)}
                  />
                ))}
              </Pie>
              <Tooltip content={<PieCustomTooltip total={totalAmount} fmt={fmt} />} />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span style={{ fontSize: 11 }}>{value}</span>}
              />
            </PieChart>
          </ChartContainer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
