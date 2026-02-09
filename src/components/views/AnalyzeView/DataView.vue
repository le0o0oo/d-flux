<script setup lang="ts">
import {
  VisXYContainer,
  VisLine,
  VisAxis,
  VisBrush
} from '@unovis/vue'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartCrosshair,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  componentToString,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { useMeasurementStore } from '@/stores/measurementStore'
import { Icon } from '@iconify/vue'
import { Button } from '@/components/ui/button'
import { computed, onMounted, ref, watch } from 'vue'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import DataTables from './DataTables.vue'
import { Separator } from '@/components/ui/separator'
import autoAnimate from '@formkit/auto-animate'
import { refDebounced } from '@vueuse/core'


const measurementStore = useMeasurementStore()

type Data = typeof measurementStore.data[number]

const chartsContainer = ref<HTMLElement | null>(null)
const toolbarContainer = ref<HTMLElement | null>(null)
const currentFilter = ref<"co2" | "temperature" | "humidity">("co2")
const dialogOpen = ref(false)

const showCharts = ref<("co2" | "temperature" | "humidity")[]>(["co2", "temperature", "humidity"])
const activeTool = ref<undefined | "delete" | "linear_regression">(undefined)

watch(showCharts, (newVal) => {
  console.log(showCharts.value)
})
watch(activeTool, (newVal) => {
  console.log(activeTool.value)
})

onMounted(() => {
  if (chartsContainer.value)
    autoAnimate(chartsContainer.value)

  // if (toolbarContainer.value)
  //   autoAnimate(toolbarContainer.value)

})


const chartComponents = { VisXYContainer, VisLine, VisAxis }
void chartComponents

const cardComponents = { Card, CardContent, CardDescription, CardHeader, CardTitle }
void cardComponents

const co2ChartConfig = {
  co2: {
    label: "CO2",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

const temperatureChartConfig = {
  temperature: {
    label: "Temperature",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

const humidityChartConfig = {
  humidity: {
    label: "Humidity",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

function openTable(filter: "co2" | "temperature" | "humidity") {
  currentFilter.value = filter
  dialogOpen.value = true
}

function getMaxValue<T>(items: T[], picker: (item: T) => number | null | undefined, fallback: number) {
  if (!items.length) return fallback
  const values = items
    .map(picker)
    .filter((value): value is number => Number.isFinite(value))
  if (!values.length) return fallback
  return Math.max(...values, fallback)
}

function addHeadroom(value: number, ratio = 0.1) {
  if (value <= 0) return value
  return Math.ceil(value * (1 + ratio))
}

const co2Max = computed(() =>
  addHeadroom(getMaxValue(measurementStore.data, (d) => d.co2 ?? 0, 1200), 0.15)
)
const temperatureMax = computed(() =>
  addHeadroom(getMaxValue(measurementStore.data, (d) => d.temperature ?? 0, 50), 0.1)
)
const humidityMax = computed(() =>
  addHeadroom(getMaxValue(measurementStore.data, (d) => d.humidity ?? 0, 100), 0.1)
)

const chartHeight = computed(() => {
  const count = showCharts.value.length
  if (count === 0) return '280px'
  // 12rem ≈ titlebar + padding + toolbar + gaps
  return `max(280px, calc((100svh - 12rem) / ${count}))`
})

const brushSelection = ref<[number, number] | null>([0, 0])
const debouncedBrushSelection = refDebounced(brushSelection, 300)

function handleBrushMove(selection: [number, number], event: any, userDriven: boolean) {
  if (!userDriven) return
  console.log(selection)
  console.log(debouncedBrushSelection.value)
  brushSelection.value = selection
}

function deleteData() {
  if (!brushSelection.value) return
  const [start, end] = brushSelection.value
  const min = Math.min(start, end)
  const max = Math.max(start, end)
  measurementStore.data = measurementStore.data.filter((d) => d.timestamp < min || d.timestamp > max)
  brushSelection.value = null
  activeTool.value = undefined
}
</script>

<template>
  <div class="relative mb-16">
    <div class="grid gap-4 sm:gap-6 md:grid-cols-1 xl:grid-cols-1 mt-2" ref="chartsContainer">

      <div class="rounded-lg border bg-card/50 p-3 sm:p-4 shadow-sm space-y-3 sm:space-y-3"
        v-if="showCharts.includes('co2')">
        <div class="flex items-center justify-between">
          <div class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">CO2</div>
          <Button variant="outline" size="sm" @click="openTable('co2')">
            <Icon icon="lucide:eye" class="w-4 h-4" />
          </Button>
        </div>
        <ChartContainer :config="co2ChartConfig" class="aspect-auto w-full" :style="{ height: chartHeight }"
          :cursor="false">
          <VisXYContainer :data="measurementStore.data" :margin="{ left: -32 }" :y-domain="[0, co2Max]">
            <VisLine :x="(d: Data) => d.timestamp" :y="(d: Data) => d.co2" :color="co2ChartConfig.co2.color"
              :line-width="2" />
            <VisBrush :selectionMinLength="2" :selection="brushSelection" :draggable="true"
              :onBrushEnd="handleBrushMove" v-if="activeTool === 'linear_regression' || activeTool === 'delete'" />
            <VisAxis type="x" :x="(d: Data) => d.timestamp" :tick-line="false" :domain-line="false" :grid-line="false"
              :num-ticks="6" :tick-format="(d: number) =>
                new Date(d).toLocaleString('it-IT', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
                " />
            <VisAxis type="y" :num-ticks="4" :tick-line="false" :domain-line="false" />

            <ChartTooltip />
            <ChartCrosshair :template="componentToString(co2ChartConfig, ChartTooltipContent, {
              labelFormatter: (d) =>
                new Date(d).toLocaleString('it-IT', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                }),
            })" :color="[co2ChartConfig.co2.color]" />
          </VisXYContainer>

          <ChartLegendContent class="pt-2" />
        </ChartContainer>
      </div>
      <div class="rounded-lg border bg-card/50 p-3 sm:p-4 shadow-sm space-y-3 sm:space-y-3"
        v-if="showCharts.includes('temperature')">
        <div class="flex items-center justify-between">
          <div class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Temperature</div>
          <Button variant="outline" size="sm" @click="openTable('temperature')">
            <Icon icon="lucide:eye" class="w-4 h-4" />
          </Button>
        </div>
        <ChartContainer :config="temperatureChartConfig" class="aspect-auto w-full" :style="{ height: chartHeight }"
          :cursor="false">
          <VisXYContainer :data="measurementStore.data" :margin="{ left: -32 }" :y-domain="[0, temperatureMax]">
            <VisLine :x="(d: Data) => d.timestamp" :y="(d: Data) => d.temperature"
              :color="temperatureChartConfig.temperature.color" :line-width="2" />

            <VisBrush :selectionMinLength="2" :selection="brushSelection" :draggable="true"
              :onBrushEnd="handleBrushMove" v-if="activeTool === 'linear_regression' || activeTool === 'delete'" />

            <VisAxis type="x" :x="(d: Data) => d.timestamp" :tick-line="false" :domain-line="false" :grid-line="false"
              :num-ticks="6" :tick-format="(d: number) =>
                new Date(d).toLocaleString('it-IT', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
                " />
            <VisAxis type="y" :num-ticks="4" :tick-line="false" :domain-line="false" />

            <ChartTooltip />
            <ChartCrosshair :template="componentToString(temperatureChartConfig, ChartTooltipContent, {
              labelFormatter: (d) =>
                new Date(d).toLocaleString('it-IT', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                }),
            })" :color="[temperatureChartConfig.temperature.color]" />
          </VisXYContainer>

          <ChartLegendContent class="pt-2" />
        </ChartContainer>
      </div>

      <div class="rounded-lg border bg-card/50 p-3 sm:p-4 shadow-sm space-y-3 sm:space-y-3"
        v-if="showCharts.includes('humidity')">
        <div class="flex items-center justify-between">
          <div class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Humidity</div>
          <Button variant="outline" size="sm" @click="openTable('humidity')">
            <Icon icon="lucide:eye" class="w-4 h-4" />
          </Button>
        </div>
        <ChartContainer :config="humidityChartConfig" class="aspect-auto w-full" :style="{ height: chartHeight }"
          :cursor="false">
          <VisXYContainer :data="measurementStore.data" :margin="{ left: -32 }" :y-domain="[0, humidityMax]">
            <VisLine :x="(d: Data) => d.timestamp" :y="(d: Data) => d.humidity"
              :color="humidityChartConfig.humidity.color" :line-width="2" />

            <VisBrush :selectionMinLength="2" :selection="brushSelection" :draggable="true"
              :onBrushEnd="handleBrushMove" v-if="activeTool === 'linear_regression' || activeTool === 'delete'" />

            <VisAxis type="x" :x="(d: Data) => d.timestamp" :tick-line="false" :domain-line="false" :grid-line="false"
              :num-ticks="6" :tick-format="(d: number) =>
                new Date(d).toLocaleString('it-IT', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
                " />
            <VisAxis type="y" :num-ticks="4" :tick-line="false" :domain-line="false" />

            <ChartTooltip />
            <ChartCrosshair :template="componentToString(humidityChartConfig, ChartTooltipContent, {
              labelFormatter: (d) =>
                new Date(d).toLocaleString('it-IT', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                }),
            })" :color="[humidityChartConfig.humidity.color]" />
          </VisXYContainer>

          <ChartLegendContent class="pt-2" />
        </ChartContainer>
      </div>

      <div v-if="showCharts.length === 0">
        <div class="text-center text-sm text-muted-foreground">
          No charts selected
        </div>
      </div>
    </div>

    <div class="fixed bottom-4 z-99 flex flex-col items-center gap-2 pointer-events-none left-1/2 -translate-x-1/2"
      ref="toolbarContainer">
      <div class="z-[999] pointer-events-auto">
        <Button variant="destructive" v-if="activeTool === 'delete'" @click="deleteData">Elimina dati</Button>

      </div>
      <div
        class="pointer-events-auto rounded-2xl border bg-background/70 p-1.5 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/60 flex gap-1.5">
        <ToggleGroup type="multiple" v-model="showCharts" class="gap-1.5">
          <ToggleGroupItem value="co2"
            class="h-9 rounded-xl px-3 text-xs font-medium tracking-wide text-muted-foreground sm:text-sm">
            <Icon icon="material-symbols:co2" />
          </ToggleGroupItem>
          <ToggleGroupItem value="temperature"
            class="h-9 rounded-xl px-3 text-xs font-medium tracking-wide text-muted-foreground sm:text-sm">
            <Icon icon="lucide:thermometer" />
          </ToggleGroupItem>
          <ToggleGroupItem value="humidity"
            class="h-9 rounded-xl px-3 text-xs font-medium tracking-wide text-muted-foreground sm:text-sm">
            <Icon icon="mdi:humidity-outline" />
          </ToggleGroupItem>
        </ToggleGroup>

        <div orientation="vertical" class="w-0.5 rounded-xl bg-secondary"></div>

        <ToggleGroup type="single" v-model="activeTool" class="gap-1.5">
          <ToggleGroupItem value="delete"
            class="h-9 rounded-xl px-3 text-xs font-medium tracking-wide text-muted-foreground data-[state=on]:bg-destructive data-[state=on]:text-white sm:text-sm">
            <Icon icon="lucide:delete" />
          </ToggleGroupItem>
          <ToggleGroupItem value="linear_regression"
            class="h-9 rounded-xl px-3 text-xs font-medium tracking-wide text-muted-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground sm:text-sm">
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


<style>
/* Light mode brush */
:root {
  --vis-brush-selection-fill-color: none;
  --vis-brush-selection-stroke-color: none;
  --vis-brush-selection-opacity: 0;
  --vis-brush-unselected-fill-color: #ffffff;
  --vis-brush-unselected-opacity: 0.55;
  --vis-brush-handle-fill-color: #808080;
  --vis-brush-handle-stroke-color: #e5e5e5;
}

/* Dark mode brush */
.dark {
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
}
</style>