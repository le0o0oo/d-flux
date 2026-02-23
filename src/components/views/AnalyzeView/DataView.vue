<script setup lang="ts">
import { useMeasurementStore } from "@/stores/measurementStore";
import { Icon } from "@iconify/vue";
import { Button } from "@/components/ui/button";
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import DataTables from "./DataTables.vue";
import DataCard from "./DataCard.vue";
import { toast } from "vue-sonner";
import autoAnimate from "@formkit/auto-animate";
import type { ChartConfig } from "@/components/ui/chart";
import { useAnalyzeStore } from "@/stores/analyzeStore";

const measurementStore = useMeasurementStore();
const analyzeStore = useAnalyzeStore();
const { brushSelection } = storeToRefs(analyzeStore);

const chartsContainer = ref<HTMLElement | null>(null);
const currentFilter = ref<"co2" | "temperature" | "humidity">("co2");
const dialogOpen = ref(false);

const showCharts = ref<("co2" | "temperature" | "humidity")[]>([
  "co2",
  "temperature",
  "humidity",
]);
const activeTool = computed(() => analyzeStore.activeTool);

onMounted(() => {
  if (chartsContainer.value) autoAnimate(chartsContainer.value);
});

const co2ChartConfig = {
  co2: {
    label: "CO2",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const temperatureChartConfig = {
  temperature: {
    label: "Temperature",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const humidityChartConfig = {
  humidity: {
    label: "Humidity",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

function openTable(filter: "co2" | "temperature" | "humidity") {
  currentFilter.value = filter;
  dialogOpen.value = true;
}

function getMaxValue<T>(
  items: T[],
  picker: (item: T) => number | null | undefined,
  fallback: number,
) {
  if (!items.length) return fallback;
  const values = items
    .map(picker)
    .filter((value): value is number => Number.isFinite(value));
  if (!values.length) return fallback;
  return Math.max(...values, fallback);
}

function addHeadroom(value: number, ratio = 0.1) {
  if (value <= 0) return value;
  return Math.ceil(value * (1 + ratio));
}

const co2Max = computed(() =>
  addHeadroom(
    getMaxValue(measurementStore.data, (d) => d.co2 ?? 0, 1200),
    0.15,
  ),
);
const temperatureMax = computed(() =>
  addHeadroom(
    getMaxValue(measurementStore.data, (d) => d.temperature ?? 0, 50),
    0.1,
  ),
);
const humidityMax = computed(() =>
  addHeadroom(
    getMaxValue(measurementStore.data, (d) => d.humidity ?? 0, 100),
    0.1,
  ),
);

const chartHeight = computed(() => {
  const count = showCharts.value.length;
  if (count === 0) return "280px";
  // 12rem ≈ titlebar + padding + toolbar + gaps
  return `max(280px, calc((100svh - 12rem) / ${count}))`;
});

function deleteData() {
  if (!brushSelection.value) return;
  const [start, end] = brushSelection.value;
  const min = Math.min(start, end);
  const max = Math.max(start, end);
  measurementStore.data = measurementStore.data.filter(
    (d) => d.timestamp < min || d.timestamp > max,
  );
  brushSelection.value = null;
  analyzeStore.activeTool = undefined;
  toast.success("Data cleared");
}
</script>

<template>
  <div class="relative mb-16 w-full max-w-full overflow-hidden flex flex-col">
    <div
      class="grid gap-4 sm:gap-6 grid-cols-1 w-full min-w-0 flex-1"
      ref="chartsContainer"
    >
      <DataCard
        v-if="showCharts.includes('co2')"
        title="CO2"
        data-key="co2"
        :chart-config="co2ChartConfig"
        :data="measurementStore.data"
        :y-max="co2Max"
        :chart-height="chartHeight"
        :active-tool="activeTool"
        v-model:brush-selection="brushSelection"
        slope-measure="ppm/s"
        @open-table="openTable('co2')"
      >
      </DataCard>

      <DataCard
        v-if="showCharts.includes('temperature')"
        title="Temperature"
        data-key="temperature"
        :chart-config="temperatureChartConfig"
        :data="measurementStore.data"
        :y-max="temperatureMax"
        :chart-height="chartHeight"
        :active-tool="activeTool"
        v-model:brush-selection="brushSelection"
        slope-measure="°C/s"
        @open-table="openTable('temperature')"
      />

      <DataCard
        v-if="showCharts.includes('humidity')"
        title="Humidity"
        data-key="humidity"
        :chart-config="humidityChartConfig"
        :data="measurementStore.data"
        :y-max="humidityMax"
        :chart-height="chartHeight"
        :active-tool="activeTool"
        v-model:brush-selection="brushSelection"
        slope-measure="%/s"
        @open-table="openTable('humidity')"
      />

      <div v-if="showCharts.length === 0">
        <div class="text-center text-sm text-muted-foreground">
          No charts selected
        </div>
      </div>
    </div>

    <div
      class="fixed bottom-[calc(env(safe-area-inset-bottom)+16px)] z-20 flex flex-col items-center gap-2 pointer-events-none left-1/2 -translate-x-1/2"
    >
      <div class="z-999 pointer-events-auto">
        <Button
          variant="destructive"
          v-if="activeTool === 'delete'"
          @click="deleteData"
          >Delete data</Button
        >
      </div>
      <div
        class="pointer-events-auto rounded-2xl border bg-background/70 p-1.5 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/60 flex gap-1.5"
      >
        <ToggleGroup type="multiple" v-model="showCharts" class="gap-1.5">
          <ToggleGroupItem
            value="co2"
            class="h-9 rounded-xl px-3 text-xs font-medium tracking-wide text-muted-foreground sm:text-sm"
          >
            <Icon icon="material-symbols:co2" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="temperature"
            class="h-9 rounded-xl px-3 text-xs font-medium tracking-wide text-muted-foreground sm:text-sm"
          >
            <Icon icon="lucide:thermometer" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="humidity"
            class="h-9 rounded-xl px-3 text-xs font-medium tracking-wide text-muted-foreground sm:text-sm"
          >
            <Icon icon="mdi:humidity-outline" />
          </ToggleGroupItem>
        </ToggleGroup>

        <div orientation="vertical" class="w-0.5 rounded-xl bg-secondary"></div>

        <ToggleGroup
          type="single"
          v-model="analyzeStore.activeTool"
          class="gap-1.5"
        >
          <ToggleGroupItem
            value="delete"
            class="h-9 rounded-xl px-3 text-xs font-medium tracking-wide text-muted-foreground data-[state=on]:bg-destructive data-[state=on]:text-white sm:text-sm"
          >
            <Icon icon="lucide:delete" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="linear_regression"
            class="h-9 rounded-xl px-3 text-xs font-medium tracking-wide text-muted-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground sm:text-sm"
          >
            <Icon icon="lucide:calculator" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>

    <Dialog v-model:open="dialogOpen">
      <DialogContent>
        <DataTables :filter="currentFilter" />
      </DialogContent>
    </Dialog>
  </div>
</template>
