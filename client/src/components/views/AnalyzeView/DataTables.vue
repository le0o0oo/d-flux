<script setup lang="ts">
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useMeasurementStore } from '@/stores/measurementStore'
import autoAnimate from "@formkit/auto-animate"
import { nextTick, onMounted, ref, watch } from 'vue'

const measurementStore = useMeasurementStore()

const tableBody = ref<InstanceType<typeof TableBody> | null>(null)
const scrollContainer = ref<HTMLElement | null>(null)
const autoScrollEnabled = ref(true)
const props = defineProps<{
  filter: "co2" | "temperature" | "humidity"
}>();

const scrollToEnd = async () => {
  await nextTick()
  const container = scrollContainer.value
  if (!container) return
  container.scrollTop = container.scrollHeight
}

const toggleAutoScroll = () => {
  autoScrollEnabled.value = !autoScrollEnabled.value
  if (autoScrollEnabled.value) scrollToEnd()
}

onMounted(() => {
  const bodyEl = tableBody.value?.$el as HTMLElement | undefined
  if (bodyEl) autoAnimate(bodyEl)
  scrollToEnd()
})

watch(
  () => measurementStore.data.length,
  () => {
    if (autoScrollEnabled.value) scrollToEnd()
  }
)
</script>

<template>
  <div class="size-full">
    <div class="mb-2 flex items-center justify-end">
      <button
        class="rounded-md border px-3 py-1 text-sm hover:bg-accent hover:text-accent-foreground"
        type="button"
        @click="toggleAutoScroll"
      >
        Auto-scroll: {{ autoScrollEnabled ? 'On' : 'Off' }}
      </button>
    </div>
    <div ref="scrollContainer" class="max-h-[80vh] overflow-y-auto">
      <Table class="w-full">
        <TableHeader>
          <TableRow>
            <TableHead class="w-[100px]">
              Timestamp
            </TableHead>
            <TableHead>{{ filter === 'co2' ? 'CO2' : filter === 'temperature' ? 'Temperature' : 'Humidity' }}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody ref="tableBody" class="w-full">
          <TableRow v-for="item in measurementStore.data" :key="item.timestamp" class="w-full">
            <TableCell class="font-medium">
              {{ new Date(item.timestamp).toLocaleString('it-IT', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }) }}
            </TableCell>
            <TableCell>{{ item[filter] }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>