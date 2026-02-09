<script setup lang="ts">
import { computed, ref } from "vue";
import type { ChartConfig } from "@/components/ui/chart";

// import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { VisArea, VisAxis, VisLine, VisXYContainer } from "@unovis/vue";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartCrosshair,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  componentToString,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMeasurementStore } from "@/stores/measurementStore";
import { Button } from "@/components/ui/button";

const measurementStore = useMeasurementStore();

// Map store data to chart format
const chartData = computed(() => {
  return measurementStore.data.map(d => ({
    date: new Date(d.timestamp),
    co2: d.co2 || 0,
    temperature: d.temperature || 0,
    humidity: d.humidity || 0
  }));
});

type Data = { date: Date; co2: number; temperature: number; humidity: number };

const chartConfig = {
  co2: {
    label: "CO2",
    color: "var(--chart-2)",
  },
  temperature: {
    label: "Temperature",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const svgDefs = `
  <linearGradient id="fillCo2" x1="0" y1="0" x2="0" y2="1">
    <stop
      offset="5%"
      stop-color="var(--color-co2)"
      stop-opacity="0.8"
    />
    <stop
      offset="95%"
      stop-color="var(--color-co2)"
      stop-opacity="0.1"
    />
  </linearGradient>
  <linearGradient id="fillTemperature" x1="0" y1="0" x2="0" y2="1">
    <stop
      offset="5%"
      stop-color="var(--color-temperature)"
      stop-opacity="0.8"
    />
    <stop
      offset="95%"
      stop-color="var(--color-temperature)"
      stop-opacity="0.1"
    />
  </linearGradient>
`;

const timeRange = ref("90d"); // Keeping this UI state local
// Filter logic... (can be improved but keeping similar logic for now)
const filterRange = computed(() => {
  // Simple filter example - for real app might want to filter at store level
  return chartData.value;
});
</script>

<template>
  <div class="space-y-2 min-w-0">
    <div class="flex justify-end gap-2 mb-2">
      <Button variant="outline" @click="measurementStore.clearData">
        Clear Data
      </Button>
      <Button variant="default" @click="measurementStore.exportToCSV">
        Export CSV
      </Button>
    </div>
    <Card class="pt-0">
      <CardHeader class="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div class="grid flex-1 gap-1">
          <CardTitle>Area Chart</CardTitle>
          <CardDescription>
            Showing total visitors for the last 3 months
          </CardDescription>
        </div>
        <Select v-model="timeRange">
          <SelectTrigger class="hidden w-[160px] rounded-lg sm:ml-auto sm:flex" aria-label="Select a value">
            <SelectValue placeholder="Last 3 months" />
          </SelectTrigger>
          <SelectContent class="rounded-xl">
            <SelectItem value="90d" class="rounded-lg">
              Last 3 months
            </SelectItem>
            <SelectItem value="30d" class="rounded-lg">
              Last 30 days
            </SelectItem>
            <SelectItem value="7d" class="rounded-lg"> Last 7 days </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent class="px-2 pt-4 sm:px-6 sm:pt-6 pb-4">

      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Random data</CardTitle>
        <CardDescription>Card Description</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableCaption>A list of your recent invoices.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead class="w-[100px]"> Date </TableHead>
              <TableHead>CO2</TableHead>
              <TableHead>Temperature</TableHead>
              <TableHead>Humidity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="data in chartData" :key="data.date.getTime()">
              <TableCell class="font-medium">
                {{ data.date }}
              </TableCell>
              <TableCell>{{ data.co2 }} ppm</TableCell>
              <TableCell>{{ data.temperature }} °C</TableCell>
              <TableCell>
                {{ data.humidity }}%
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
</template>
