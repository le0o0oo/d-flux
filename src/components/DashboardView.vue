<script setup lang="ts">
import { currentView } from "@/lib/navigation";
import AppSidebar from "@/components/Navbar/AppSidebar.vue";
import { Button } from "@/components/ui/button";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Icon } from "@iconify/vue";
import { ProtocolCommandType } from "@/services/ProtocolParser";
import { useConnectionStore } from "@/stores/connectionStore";
import { useMeasurementStore } from "@/stores/measurementStore";
import { ref, watch } from "vue";

const connectionStore = useConnectionStore();
const measurementStore = useMeasurementStore();
const scanActive = ref<boolean>(measurementStore.isAcquiring);

watch(
  () => measurementStore.isAcquiring,
  (next) => {
    scanActive.value = next;
  },
  { immediate: true }
);

async function toggleScan(): Promise<void> {
  if (!connectionStore.isConnected) return;
  const nextValue = !scanActive.value;
  scanActive.value = nextValue;

  try {
    await connectionStore.sendCommand(
      nextValue
        ? ProtocolCommandType.START_ACQUISITION
        : ProtocolCommandType.STOP_ACQUISITION
    );
  } catch (err) {
    scanActive.value = !nextValue;
    console.error("Scan toggle error:", err);
  }
}
</script>

<template>
  <div class="size-full">
    <SidebarProvider class="h-svh">
      <AppSidebar class="top-8 h-[calc(100svh-2rem)]!" />
      <SidebarInset>
        <header
          class="flex h-16 shrink-0 items-center gap-2 border-b px-4 sticky top-0 left-0 z-20 bg-background"
        >
          <SidebarTrigger class="-ml-1" />
          <Button
            class="ml-auto"
            :variant="scanActive ? 'default' : 'outline'"
            :disabled="!connectionStore.isConnected"
            @click="toggleScan"
          >
            <Icon
              :icon="scanActive ? 'lucide:pause' : 'lucide:play'"
              class="w-4 h-4 mr-1.5"
            />
            {{ scanActive ? "Stop" : "Start" }}
          </Button>
        </header>
        <div
          class="flex flex-1 flex-col gap-4 p-4 min-w-0 mb-8"
          ref="parentContainer"
        >
          <component :is="currentView" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  </div>
</template>

<style scoped></style>
