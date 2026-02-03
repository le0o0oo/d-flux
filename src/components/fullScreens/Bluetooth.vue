<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import { useConnectionStore } from "@/stores/connectionStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const connectionStore = useConnectionStore();

const devices = computed(() => connectionStore.devices);
const isScanning = computed(() => connectionStore.isScanning);
const isConnected = computed(() => connectionStore.isConnected);

const handleScanToggle = async () => {
  if (isScanning.value) {
    await connectionStore.stopScan();
  } else {
    await connectionStore.startScan();
  }
};

const handleConnect = async (address: string) => {
  await connectionStore.connectToDevice(address);
};

onMounted(async () => {
  await connectionStore.initialize();
  await connectionStore.startScan();
});

onBeforeUnmount(async () => {
  if (connectionStore.isScanning) {
    await connectionStore.stopScan();
  }
});
</script>

<template>
  <div class="min-h-svh bg-background text-foreground">
    <div class="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <header class="flex flex-col gap-2">
        <h1 class="text-2xl font-semibold">Connessione Bluetooth</h1>
        <p class="text-sm text-muted-foreground">
          Scansiona dispositivi BLE e connettiti a quello desiderato.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Stato</CardTitle>
          <CardDescription>
            Stato adattatore: {{ connectionStore.adapterState }}
          </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-wrap items-center gap-3">
          <Button @click="handleScanToggle">
            {{ isScanning ? "Interrompi scansione" : "Avvia scansione" }}
          </Button>
          <Button
            v-if="isConnected"
            variant="secondary"
            @click="connectionStore.disconnectFromDevice()"
          >
            Disconnetti
          </Button>
          <span
            v-if="connectionStore.lastError"
            class="text-sm text-destructive"
          >
            {{ connectionStore.lastError }}
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dispositivi rilevati</CardTitle>
          <CardDescription>
            {{ devices.length }} dispositivi trovati
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="max-h-[55svh] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Indirizzo</TableHead>
                  <TableHead class="text-right">Azione</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-if="devices.length === 0">
                  <TableCell colspan="3" class="text-muted-foreground">
                    Nessun dispositivo trovato. Avvia la scansione.
                  </TableCell>
                </TableRow>
                <TableRow v-for="device in devices" :key="device.address">
                  <TableCell class="font-medium">
                    {{ device.name || "Dispositivo sconosciuto" }}
                  </TableCell>
                  <TableCell class="text-muted-foreground">
                    {{ device.address }}
                  </TableCell>
                  <TableCell class="text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      @click="handleConnect(device.address)"
                    >
                      Connetti
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
