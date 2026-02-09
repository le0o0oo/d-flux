<script setup lang="ts">
import { detectHC05, type ScanProgress } from "@/utils/connectionUtils";
import { onMounted, onUnmounted, ref, computed } from "vue";
import { Spinner } from '@/components/ui/spinner'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { DeviceInfo } from "@/utils/connectionUtils";
import { Icon } from "@iconify/vue";

// Emit events for device selection
const emit = defineEmits<{
  selectDevice: [device: DeviceInfo]
}>()

// State
const scanning = ref(false);
const devices = ref<DeviceInfo[]>([]);
const scanProgress = ref<ScanProgress[]>([]);
const autoScanEnabled = ref(true);
const scanInterval = ref<number | null>(null);
const lastScanTime = ref<Date | null>(null);

// Computed
const progressPercentage = computed(() => {
  if (!scanning.value || scanProgress.value.length === 0) return 0;
  const completed = scanProgress.value.filter(
    p => p.status === 'found' || p.status === 'timeout' || p.status === 'error'
  ).length;
  return Math.round((completed / scanProgress.value.length) * 100);
});

const scanningPortsCount = computed(() => {
  return scanProgress.value.filter(p => p.status === 'scanning').length;
});

const hasDevices = computed(() => devices.value.length > 0);

// Functions
async function runScan() {
  if (scanning.value) return;
  
  scanning.value = true;
  scanProgress.value = [];
  
  try {
    const devicesData = await detectHC05(
      { timeoutMs: 1500 }, 
      (progress) => {
        const existingIndex = scanProgress.value.findIndex(p => p.port === progress.port);
        if (existingIndex >= 0) {
          scanProgress.value[existingIndex] = progress;
        } else {
          scanProgress.value.push(progress);
        }
      }
    );
    
    devices.value = devicesData;
    lastScanTime.value = new Date();
  } catch (error) {
    console.error("Scan error:", error);
  } finally {
    scanning.value = false;
  }
}

function startContinuousScan() {
  autoScanEnabled.value = true;
  runScan();
  
  // Run scan every 5 seconds
  scanInterval.value = window.setInterval(() => {
    if (autoScanEnabled.value) {
      runScan();
    }
  }, 5000);
}

function stopContinuousScan() {
  autoScanEnabled.value = false;
  if (scanInterval.value !== null) {
    clearInterval(scanInterval.value);
    scanInterval.value = null;
  }
}

function toggleAutoScan() {
  if (autoScanEnabled.value) {
    stopContinuousScan();
  } else {
    startContinuousScan();
  }
}

function handleDeviceSelect(device: DeviceInfo) {
  emit('selectDevice', device);
}

function getDeviceIcon(device: DeviceInfo): string {
  if (device.name?.toLowerCase().includes('hc-05') || device.name?.toLowerCase().includes('bluetooth')) {
    return 'lucide:bluetooth';
  }
  return 'lucide:radio';
}

// Lifecycle
onMounted(() => {
  startContinuousScan();
});

onUnmounted(() => {
  stopContinuousScan();
});
</script>

<template>
  <div class="flex flex-col gap-4 min-h-[400px] max-h-[70vh]">
    <!-- Scanning Status Header -->
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <Icon 
            icon="lucide:radar" 
            class="w-5 h-5 text-primary"
            :class="{ 'opacity-70': scanning }"
          />
          <div>
            <h3 class="text-sm font-medium">
              {{ scanning ? 'Scansione in corso...' : 'Scansione dispositivi' }}
            </h3>
            <p class="text-xs text-muted-foreground">
              <span v-if="scanning">
                Analizzando {{ scanningPortsCount }} {{ scanningPortsCount === 1 ? 'porta' : 'porte' }}
              </span>
              <span v-else-if="lastScanTime">
                Ultimo aggiornamento: {{ lastScanTime.toLocaleTimeString() }}
              </span>
              <span v-else>
                Pronto per la scansione
              </span>
            </p>
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            @click="runScan"
            :disabled="scanning"
          >
            <Icon icon="lucide:refresh-cw" :class="{ 'animate-spin': scanning }" class="w-4 h-4 mr-2" />
            Aggiorna
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            @click="toggleAutoScan"
            :class="{ 'bg-primary/10': autoScanEnabled }"
          >
            <Icon 
              :icon="autoScanEnabled ? 'lucide:pause' : 'lucide:play'" 
              class="w-4 h-4 mr-2" 
            />
            {{ autoScanEnabled ? 'Pausa' : 'Auto' }}
          </Button>
        </div>
      </div>
      
      <!-- Progress Bar (only show when no devices yet) -->
      <div v-if="scanning && !hasDevices" class="space-y-2">
        <Progress :model-value="progressPercentage" class="h-1.5" />
        <div class="flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner class="w-3 h-3" />
          <span>{{ progressPercentage }}% completato</span>
        </div>
      </div>
    </div>

    <!-- Devices List -->
    <div class="flex-1 overflow-y-auto space-y-2">
      <!-- Loading State -->
      <div v-if="scanning && devices.length === 0" class="flex flex-col items-center justify-center py-12 gap-3">
        <div class="relative">
          <Icon icon="lucide:bluetooth" class="w-12 h-12 text-muted-foreground/20" />
          <Spinner class="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p class="text-sm text-muted-foreground">Ricerca dispositivi in corso...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="!scanning && !hasDevices" class="flex flex-col items-center justify-center py-12 gap-3">
        <div class="relative bg-muted/30 rounded-full p-6">
          <Icon icon="lucide:bluetooth-off" class="w-10 h-10 text-muted-foreground" />
        </div>
        <div class="text-center space-y-1">
          <p class="text-sm font-medium">Nessun dispositivo trovato</p>
          <p class="text-xs text-muted-foreground max-w-[280px]">
            Assicurati che i dispositivi HC-05 siano accesi e nel raggio d'azione
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          @click="runScan"
          class="mt-2"
        >
          <Icon icon="lucide:refresh-cw" class="w-4 h-4 mr-2" />
          Riprova
        </Button>
      </div>

      <!-- Devices Grid -->
      <div v-else class="grid grid-cols-2 gap-2">
        <Card 
          v-for="device in devices" 
          :key="device.port"
          class="group cursor-pointer transition-colors hover:border-primary/50"
          @click="handleDeviceSelect(device)"
        >
          <CardHeader class="p-3 pb-2">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <div class="bg-primary/10 rounded-md p-1.5 shrink-0">
                  <Icon 
                    :icon="getDeviceIcon(device)" 
                    class="w-4 h-4 text-primary" 
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <CardTitle class="text-sm truncate">
                    {{ device.name || 'Dispositivo sconosciuto' }}
                  </CardTitle>
                  <CardDescription class="text-xs mt-0.5">
                    {{ device.port }}
                  </CardDescription>
                </div>
              </div>
              <Icon 
                icon="lucide:chevron-right" 
                class="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" 
              />
            </div>
          </CardHeader>
          <CardContent class="p-3 pt-0">
            <div class="flex flex-wrap gap-1.5">
              <div v-if="device.org" class="flex items-center gap-1 text-xs bg-muted/50 px-2 py-0.5 rounded">
                <Icon icon="lucide:building-2" class="w-3 h-3 text-muted-foreground" />
                <span class="text-muted-foreground">{{ device.org }}</span>
              </div>
              <div v-if="device.id" class="flex items-center gap-1 text-xs bg-muted/50 px-2 py-0.5 rounded">
                <Icon icon="lucide:fingerprint" class="w-3 h-3 text-muted-foreground" />
                <span class="font-mono text-muted-foreground text-xs">{{ device.id }}</span>
              </div>
              <div v-if="device.fw" class="flex items-center gap-1 text-xs bg-muted/50 px-2 py-0.5 rounded">
                <Icon icon="lucide:code-xml" class="w-3 h-3 text-muted-foreground" />
                <span class="text-muted-foreground">{{ device.fw }}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Scanning Overlay for Existing Devices -->
      <div 
        v-if="scanning && hasDevices" 
        class="sticky bottom-0 left-0 right-0 bg-background/90 backdrop-blur-sm border-t py-2"
      >
        <div class="flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner class="w-3 h-3" />
          <span>Aggiornamento in corso...</span>
          <span class="ml-auto">{{ progressPercentage }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>