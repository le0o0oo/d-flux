<script setup lang="ts">
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button'
import { Spinner } from "@/components/ui/spinner";
import { Icon } from "@iconify/vue";
import { computed, ref, watch } from "vue";
import { useConnectionStore } from "@/stores/connectionStore";
import { useMeasurementStore } from "@/stores/measurementStore";
import { serialService } from "@/services/SerialService";
import { SerialCommandType } from "@/services/ProtocolParser";

const measurementStore = useMeasurementStore();
const connectionStore = useConnectionStore();
const scanActive = ref(measurementStore.isAcquiring);

// const canToggleScan = computed(() => connectionStore.status === "connected" && !!connectionStore.currentConnection);


async function toggleScan(): Promise<void> {
  if (!serialService.isConnected()) return;

  try {
    await connectionStore.sendCommand(
      scanActive.value ? SerialCommandType.STOP_ACQUISITION : SerialCommandType.START_ACQUISITION
    );
    scanActive.value = !scanActive.value;
  } catch (err) {
    console.error("Scan toggle error:", err);
  }
}
</script>

<template>
  <div>
    <Card class="gap-2 py-4 shadow-none w-full">
      <CardHeader class="px-4 pb-3">
        <CardTitle class="text-sm"> Stato di connessione </CardTitle>
        <CardDescription class="text-xs">
          Stato della connessione Bluetooth
        </CardDescription>
      </CardHeader>
      <CardContent class="px-4 pt-0">
        <div class="space-y-3">
          <!-- Current Connection Status -->
          <div v-if="connectionStore.status === 'connected' && connectionStore.currentDevice"
            class="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div class="bg-green-500/10 rounded-lg p-2">
              <Icon icon="lucide:bluetooth-connected" class="w-4 h-4 text-green-600" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium">
                {{ connectionStore.currentDevice.name || 'Dispositivo connesso' }}
              </p>
              <p class="text-xs text-muted-foreground truncate">
                {{ connectionStore.currentDevice.port }}
              </p>
            </div>
            <Button variant="ghost" size="sm" @click="connectionStore.disconnect()">
              <Icon icon="lucide:x" class="w-4 h-4" />
            </Button>
          </div>

          <!-- Connecting State -->
          <div v-else-if="connectionStore.status === 'connecting'"
            class="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border-2 border-dashed">
            <div class="bg-primary/10 rounded-lg p-2">
              <Spinner class="w-4 h-4 text-primary" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium">
                Connessione in corso{{ connectionStore.currentDevice?.name ? `: ${connectionStore.currentDevice.name}` :
                  "" }}
              </p>
              <p class="text-xs text-muted-foreground truncate">
                {{ connectionStore.currentDevice?.port || "Attendi..." }}
              </p>
            </div>
          </div>

          <!-- Error State -->
          <div v-else-if="connectionStore.status === 'error'"
            class="flex items-center gap-3 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
            <div class="bg-destructive/10 rounded-lg p-2">
              <Icon icon="lucide:triangle-alert" class="w-4 h-4 text-destructive" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium">Connessione fallita</p>
              <p class="text-xs text-muted-foreground truncate">
                {{ connectionStore.lastError || "Errore sconosciuto" }}
              </p>
            </div>
          </div>

          <!-- Not Connected State -->
          <div v-else class="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border-2 border-dashed">
            <div class="bg-muted rounded-lg p-2">
              <Icon icon="lucide:bluetooth-off" class="w-4 h-4 text-muted-foreground" />
            </div>
            <div class="flex-1">
              <p class="text-sm font-medium">Nessun dispositivo connesso</p>
              <p class="text-xs text-muted-foreground">Cerca dispositivi nelle vicinanze</p>
            </div>
          </div>

          <!-- Scan Button -->
          <Button class="w-full" :variant="scanActive ? 'default' : 'outline'" :disabled="!serialService.isConnected()"
            @click="toggleScan">
            <Icon :icon="scanActive ? 'lucide:pause' : 'lucide:play'" class="w-4 h-4 mr-2" />
            {{ scanActive ? "Ferma acquisizione" : "Avvia acquisizione" }}
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>