<script setup lang="ts">
import { VisXYContainer, VisLine, VisAxis, VisBrush } from "@unovis/vue";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/vue";
import {
  ChartContainer,
  ChartCrosshair,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  componentToString,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { onMounted, ref, computed } from "vue";
import autoAnimate from "@formkit/auto-animate";
import { SensorData } from "@/services/ProtocolParser";

type Point = { x: number; y: number };
type RegressionResult = {
  slope: number;
  intercept: number;
  rSquared: number;
  minX: number;
  maxX: number;
};

const props = defineProps<{
  title: string;
  dataKey: "co2" | "temperature" | "humidity";
  chartConfig: ChartConfig;
  data: SensorData[];
  yMax: number;
  chartHeight: string;
  activeTool?: string;
  brushSelection?: [number, number] | null;
}>();

const processedData = computed(() => {
  const regression = regressionResult.value;
  if (!regression || props.activeTool !== "linear_regression") {
    return props.data.map((d) => ({ ...d, regression: Number.NaN }));
  }

  const min = Math.min(regression.minX, regression.maxX);
  const max = Math.max(regression.minX, regression.maxX);

  return props.data.map((d) => {
    const ts = Number(d.timestamp);
    const inSelection = Number.isFinite(ts) && ts >= min && ts <= max;
    return {
      ...d,
      regression: inSelection
        ? regression.slope * ts + regression.intercept
        : Number.NaN,
    };
  });
});

const regressionResult = computed<RegressionResult | null>(() => {
  if (props.activeTool !== "linear_regression") return null;
  if (!props.brushSelection) return null;

  const [rawStart, rawEnd] = props.brushSelection;
  const min = Math.min(rawStart, rawEnd);
  const max = Math.max(rawStart, rawEnd);

  const selected = props.data
    .filter((d) => {
      const ts = Number(d.timestamp);
      const y = Number(d[props.dataKey]);
      return (
        Number.isFinite(ts) && Number.isFinite(y) && ts >= min && ts <= max
      );
    })
    .map((d) => ({
      x: Number(d.timestamp),
      y: Number(d[props.dataKey]),
    }));

  if (selected.length < 2) return null;
  return linearRegression(selected);
});

const formattedSlope = computed(
  () => regressionResult.value?.slope.toFixed(6) ?? "—"
);
const formattedIntercept = computed(
  () => regressionResult.value?.intercept.toFixed(2) ?? "—"
);
const formattedRSquared = computed(
  () => regressionResult.value?.rSquared.toFixed(4) ?? "—"
);

const emit = defineEmits<{
  (e: "open-table"): void;
  (e: "update:brushSelection", value: [number, number] | null): void;
}>();

function linearRegression(data: Point[]): RegressionResult {
  const n = data.length;

  const meanX = data.reduce((acc, p) => acc + p.x, 0) / n;
  const meanY = data.reduce((acc, p) => acc + p.y, 0) / n;

  let ssXX = 0;
  let ssXY = 0;

  // Use centered values for numerical stability with large timestamps.
  for (const p of data) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    ssXX += dx * dx;
    ssXY += dx * dy;
  }

  let slope = 0;
  let intercept = meanY;

  if (ssXX === 0) {
    slope = 0;
    intercept = meanY;
  } else {
    slope = ssXY / ssXX;
    intercept = meanY - slope * meanX;
  }

  let ssTot = 0;
  let ssRes = 0;
  for (const p of data) {
    const yHat = slope * p.x + intercept;
    const totalDelta = p.y - meanY;
    const residual = p.y - yHat;
    ssTot += totalDelta * totalDelta;
    ssRes += residual * residual;
  }

  // Standard R² definition. If y is constant, treat perfect reconstruction as 1.
  const rawRSquared = ssTot === 0 ? (ssRes === 0 ? 1 : 0) : 1 - ssRes / ssTot;
  const rSquared = Math.max(0, Math.min(1, rawRSquared));

  const xs = data.map((d) => d.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);

  return { slope, intercept, rSquared, minX, maxX };
}
//function renderRegressionLine(snappedStart: number, snappedEnd: number) { }

function getNearestTimestamp(target: number): number {
  if (!props.data.length) return target;

  const timestamps = props.data
    .map((d) => Number(d.timestamp))
    .filter((t) => Number.isFinite(t));
  if (!timestamps.length) return target;

  if (target <= timestamps[0]) return timestamps[0];
  if (target >= timestamps[timestamps.length - 1])
    return timestamps[timestamps.length - 1];

  let left = 0;
  let right = timestamps.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const current = timestamps[mid];
    if (current === target) return current;
    if (current < target) left = mid + 1;
    else right = mid - 1;
  }

  const lower = timestamps[Math.max(0, right)];
  const upper = timestamps[Math.min(timestamps.length - 1, left)];
  return Math.abs(target - lower) <= Math.abs(upper - target) ? lower : upper;
}

function handleBrushMove(
  selection: [number, number],
  _event: any,
  userDriven: boolean
) {
  if (!userDriven || !selection) return;
  const [rawStart, rawEnd] = selection;
  const snappedStart = getNearestTimestamp(rawStart);
  const snappedEnd = getNearestTimestamp(rawEnd);

  emit("update:brushSelection", [snappedStart, snappedEnd]);

  //if (props.activeTool === 'linear_regression') renderRegressionLine(snappedStart, snappedEnd)
}

const chartContainer = ref<HTMLElement | null>(null);

onMounted(() => {
  if (chartContainer.value) autoAnimate(chartContainer.value);
});
</script>

<template>
  <div
    class="rounded-lg border bg-card p-3 sm:p-4 shadow-sm space-y-3 sm:space-y-3"
    ref="chartContainer"
  >
    <div class="flex items-center justify-between">
      <div
        class="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {{ title }}
      </div>
      <Button variant="outline" size="sm" @click="emit('open-table')">
        <Icon icon="lucide:eye" class="w-4 h-4" />
      </Button>
    </div>

    <div class="chart-container mb-8">
      <ChartContainer
        :config="chartConfig"
        class="aspect-auto w-full"
        :style="{ height: chartHeight }"
        :cursor="false"
      >
        <VisXYContainer
          :data="processedData"
          :margin="{ left: -32 }"
          :y-domain="[0, yMax]"
        >
          <VisLine
            :x="(d: any) => d.timestamp"
            :y="(d: any) => d[dataKey]"
            :color="chartConfig[dataKey]?.color"
            :line-width="2"
          />
          <VisLine
            v-if="activeTool === 'linear_regression'"
            :x="(d: any) => d.timestamp"
            :y="(d: any) => d.regression"
            color="#f97316"
            :line-width="2"
          />

          <VisBrush
            v-if="activeTool === 'linear_regression' || activeTool === 'delete'"
            :selectionMinLength="2"
            :selection="brushSelection"
            :draggable="true"
            :onBrushEnd="handleBrushMove"
          />

          <VisAxis
            type="x"
            :x="(d: any) => d.timestamp"
            :tick-line="false"
            :domain-line="false"
            :grid-line="false"
            :num-ticks="6"
            :tick-format="(d: number) =>
              new Date(d).toLocaleString('it-IT', {
                month: undefined,
                day: undefined,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })
              "
          />
          <VisAxis
            type="y"
            :num-ticks="4"
            :tick-line="false"
            :domain-line="false"
          />

          <ChartTooltip />
          <ChartCrosshair
            :template="
              componentToString(chartConfig, ChartTooltipContent, {
                labelFormatter: (d) =>
                  new Date(d).toLocaleString('it-IT', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  }),
              })
            "
            :color="[chartConfig[dataKey]?.color]"
          />
        </VisXYContainer>

        <ChartLegendContent class="pt-2" />
      </ChartContainer>
    </div>

    <div
      class="mt-2 grid md:grid-cols-3 grid-cols-1 gap-2"
      v-if="activeTool === 'linear_regression'"
    >
      <div
        class="rounded-md border text-xs px-3 py-2 flex flex-col items-center bg-muted"
      >
        <span class="font-semibold text-muted-foreground">Slope</span>
        <span class="font-mono text-base">{{ formattedSlope }}</span>
      </div>
      <div
        class="rounded-md border text-xs px-3 py-2 flex flex-col items-center bg-muted"
      >
        <span class="font-semibold text-muted-foreground">Intercept</span>
        <span class="font-mono text-base">{{ formattedIntercept }}</span>
      </div>
      <div
        class="rounded-md border text-xs px-3 py-2 flex flex-col items-center bg-muted"
      >
        <span class="font-semibold text-muted-foreground">R²</span>
        <span class="font-mono text-base">{{ formattedRSquared }}</span>
      </div>
    </div>
  </div>
</template>

<style>
.chart-container {
  /* Light mode brush */
  --vis-brush-selection-fill-color: none;
  --vis-brush-selection-stroke-color: none;
  --vis-brush-selection-opacity: 0;
  --vis-brush-unselected-fill-color: var(--card);
  --vis-brush-unselected-opacity: 0.95;
  --vis-brush-handle-fill-color: var(--secondary);
  --vis-brush-handle-stroke-color: var(--secondary-foreground);
}

/* 
.chart-container.dark {
  --vis-brush-unselected-fill-color: #1a1a1a;
  --vis-brush-unselected-opacity: 0.6;
  --vis-brush-handle-fill-color: #a3a3a3;
  --vis-brush-handle-stroke-color: rgba(255, 255, 255, 0.1);

  --vis-dark-brush-selection-fill-color: none;
  --vis-dark-brush-selection-stroke-color: none;
  --vis-dark-brush-selection-opacity: 0;
  --vis-dark-brush-unselected-fill-color: #1a1a1a;
  --vis-dark-brush-unselected-opacity: 0.6;
  --vis-dark-brush-handle-fill-color: #a3a3a3;
  --vis-dark-brush-handle-stroke-color: rgba(255, 255, 255, 0.1);
} */
</style>
