<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { onMounted } from "vue";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useBleScanner, type BleDevice } from "@/composables/useBleScanner";

const emit = defineEmits<{
  connect: [device: BleDevice];
  selectDevice: [device: BleDevice];
}>();

const {
  scanning,
  devices,
  lastScanTime,
  runScan,
  isMockMode,
  requiredServiceUuid,
} = useBleScanner();

function getSignalLevel(rssi?: number): number {
  if (typeof rssi !== "number") return 0;
  if (rssi >= -60) return 3;
  if (rssi >= -80) return 2;
  return 1;
}

function getSignalColor(level: number): string {
  if (level >= 3) return "bg-emerald-500";
  if (level === 2) return "bg-yellow-500";
  return "bg-red-500";
}

function handleConnect(device: BleDevice) {
  emit("connect", device);
}

onMounted(() => {
  runScan();
});
</script>

<template>
  <div class="flex flex-col gap-4 min-h-[360px] max-h-[70vh]">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Icon
          icon="lucide:bluetooth-searching"
          class="w-5 h-5 text-primary"
          :class="{ 'animate-pulse': scanning }"
        />
        <div>
          <p class="text-sm font-medium">BLE Devices</p>
          <p class="text-xs text-muted-foreground">
            <span v-if="scanning">Scanning...</span>
            <span v-else-if="lastScanTime"
              >Last scan: {{ lastScanTime.toLocaleTimeString() }}</span
            >
            <span v-else>Ready to scan</span>
          </p>
        </div>
      </div>

      <Button variant="outline" size="sm" @click="runScan" :disabled="scanning">
        <Spinner v-if="scanning" class="w-4 h-4 mr-2" />
        <Icon v-else icon="lucide:refresh-cw" class="w-4 h-4 mr-2" />
        Refresh
      </Button>
    </div>

    <div
      v-if="devices.length === 0"
      class="flex-1 flex flex-col items-center justify-center text-center gap-2 py-8"
    >
      <Icon
        icon="lucide:bluetooth-off"
        class="w-10 h-10 text-muted-foreground/60"
      />
      <p class="text-sm font-medium">
        {{
          scanning
            ? "Searching BLE devices..."
            : "No compatible BLE devices found"
        }}
      </p>
      <p class="text-xs text-muted-foreground max-w-[320px]">
        Only devices advertising service UUID {{ requiredServiceUuid }} are
        shown.
      </p>
      <p v-if="isMockMode" class="text-xs text-primary">
        Mock mode enabled from VITE_USE_MOCK.
      </p>
    </div>

    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto pr-1"
    >
      <Card v-for="entry in devices" :key="entry.key">
        <CardHeader class="pb-2">
          <CardTitle class="text-sm truncate">{{ entry.name }}</CardTitle>
          <CardDescription class="text-xs font-mono truncate">
            {{ entry.macAddress }}
          </CardDescription>
        </CardHeader>

        <CardContent class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="text-xs text-muted-foreground">RSSI</div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono">{{
                typeof entry.rssi === "number" ? `${entry.rssi} dBm` : "N/A"
              }}</span>
              <div class="flex items-end gap-1">
                <div
                  v-for="bar in 3"
                  :key="bar"
                  class="w-1.5 rounded-sm"
                  :class="
                    bar <= getSignalLevel(entry.rssi)
                      ? getSignalColor(getSignalLevel(entry.rssi))
                      : 'bg-muted'
                  "
                  :style="{ height: `${6 + bar * 4}px` }"
                />
              </div>
            </div>
          </div>

          <div class="flex flex-wrap gap-1.5">
            <div
              v-if="entry.metadata.id"
              class="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] bg-muted/40"
            >
              <Icon icon="lucide:fingerprint-pattern" class="w-4 h-4 mr-1" />
              {{ entry.metadata.id }}
            </div>
            <div
              v-if="entry.metadata.organization"
              class="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] bg-muted/40"
            >
              <Icon icon="lucide:building-2" class="w-4 h-4 mr-1" />
              {{ entry.metadata.organization }}
            </div>
            <div
              v-if="entry.metadata.firmware"
              class="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] bg-muted/40"
            >
              <Icon icon="lucide:cpu" class="w-4 h-4 mr-1" />
              {{ entry.metadata.firmware }}
            </div>
          </div>

          <div class="pt-1">
            <Button class="w-full" @click="handleConnect(entry.device)">
              <Icon icon="lucide:plug-zap" class="w-4 h-4 mr-2" />
              Connect
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
