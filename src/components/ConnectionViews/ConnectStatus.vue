<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Icon } from "@iconify/vue";
import { computed, ref, watch } from "vue";
import { useConnectionStore } from "@/stores/connectionStore";
import { useMeasurementStore } from "@/stores/measurementStore";
import { useAppStore } from "@/stores/appStore";
import { ProtocolCommandType } from "@/services/ProtocolParser";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const props = withDefaults(
  defineProps<{
    collapsed?: boolean;
  }>(),
  {
    collapsed: false,
  }
);

const disconnecting = ref(false);

const measurementStore = useMeasurementStore();
const connectionStore = useConnectionStore();
const appStore = useAppStore();
const scanActive = ref<boolean>(measurementStore.isAcquiring);
watch(
  () => measurementStore.isAcquiring,
  (next) => {
    scanActive.value = next;
  },
  { immediate: true }
);
const disconnectDetails = computed(() => {
  if (!connectionStore.lastDisconnectAt) return null;
  return new Date(connectionStore.lastDisconnectAt).toLocaleTimeString();
});
const isConnected = computed(
  () =>
    connectionStore.status === "connected" && !!connectionStore.currentDevice
);
const isConnecting = computed(() => connectionStore.status === "connecting");
const isError = computed(() => connectionStore.status === "error");
const canOpenConnectMenu = computed(
  () => !isConnected.value && !isConnecting.value
);
const statusTitle = computed(() => {
  if (isConnected.value) {
    return connectionStore.currentDevice?.name || "Device connected";
  }
  if (isConnecting.value) return "Connecting...";
  if (isError.value) return "Connection failed";
  if (connectionStore.lastDisconnectMessage)
    return connectionStore.lastDisconnectMessage;
  return "No device";
});
const statusSubtitle = computed(() => {
  if (isConnected.value) {
    return connectionStore.currentDevice?.port || "";
  }
  if (isConnecting.value)
    return connectionStore.currentDevice?.port || "Waiting...";
  if (isError.value) return connectionStore.lastError || "Unknown error";
  if (connectionStore.lastDisconnectMessage && disconnectDetails.value) {
    return `Disconnected at ${disconnectDetails.value}`;
  }
  return "Open connection menu";
});
const statusIcon = computed(() => {
  if (isConnected.value) return "lucide:bluetooth-connected";
  if (isConnecting.value) return "lucide:loader-circle";
  if (isError.value || connectionStore.lastDisconnectMessage)
    return "lucide:triangle-alert";
  return "lucide:bluetooth-off";
});
const statusToneClass = computed(() => {
  if (isConnected.value) return "text-emerald-600";
  if (isConnecting.value) return "text-primary";
  if (isError.value || connectionStore.lastDisconnectMessage)
    return "text-destructive";
  return "text-muted-foreground";
});

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

function openConnectMenu() {
  appStore.setScreen("connection");
}

function handleCollapsedClick() {
  if (canOpenConnectMenu.value) {
    openConnectMenu();
  }
}

async function disconnect() {
  if (disconnecting.value) return;
  disconnecting.value = true;
  await connectionStore.disconnect();
  disconnecting.value = false;
}
</script>

<template>
  <div class="w-full">
    <TooltipProvider v-if="props.collapsed">
      <Tooltip>
        <TooltipTrigger as-child>
          <button
            type="button"
            class="size-8 rounded-md border border-sidebar-border bg-sidebar-accent/40 flex items-center justify-center transition-colors hover:bg-sidebar-accent"
            :aria-label="statusTitle"
            @click="handleCollapsedClick"
          >
            <Spinner v-if="isConnecting" class="size-4 text-primary" />
            <Icon
              v-else
              :icon="statusIcon"
              class="size-4"
              :class="statusToneClass"
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" class="max-w-56">
          <p class="text-xs font-medium">{{ statusTitle }}</p>
          <p class="text-xs text-muted-foreground">{{ statusSubtitle }}</p>
          <p
            v-if="isConnected"
            class="text-xs mt-1"
            :class="scanActive ? 'text-emerald-600' : 'text-muted-foreground'"
          >
            {{ scanActive ? "Acquisition active" : "Acquisition stopped" }}
          </p>
          <p v-else class="text-xs mt-1 text-primary">
            Click to open connection menu
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <div
      v-else
      class="w-full rounded-lg border border-sidebar-border bg-sidebar-accent/20 p-2 space-y-2"
    >
      <div class="flex items-start gap-2">
        <div
          class="size-7 rounded-md flex items-center justify-center bg-sidebar-accent"
        >
          <Spinner v-if="isConnecting" class="size-4 text-primary" />
          <Icon
            v-else
            :icon="statusIcon"
            class="size-4"
            :class="statusToneClass"
          />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold leading-tight truncate">
            {{ statusTitle }}
          </p>
          <p class="text-[11px] text-muted-foreground leading-tight truncate">
            {{ statusSubtitle }}
          </p>
          <p
            v-if="isConnected"
            class="text-[11px] mt-1"
            :class="scanActive ? 'text-emerald-600' : 'text-muted-foreground'"
          >
            {{ scanActive ? "Acquisition active" : "Acquisition stopped" }}
          </p>
        </div>
      </div>

      <div v-if="canOpenConnectMenu" class="flex">
        <Button
          class="w-full h-8 text-xs"
          variant="outline"
          @click="openConnectMenu"
        >
          <Icon icon="lucide:arrow-left" class="w-3.5 h-3.5 mr-1.5" />
          Back to connection menu
        </Button>
      </div>

      <div v-else class="flex gap-2">
        <Button
          class="flex-1 h-8 text-xs"
          :variant="scanActive ? 'default' : 'outline'"
          :disabled="!connectionStore.isConnected"
          @click="toggleScan"
        >
          <Icon
            :icon="scanActive ? 'lucide:pause' : 'lucide:play'"
            class="w-3.5 h-3.5 mr-1.5"
          />
          {{ scanActive ? "Stop" : "Start" }}
        </Button>
        <Button
          class="h-8 px-2 text-xs"
          variant="outline"
          :disabled="!connectionStore.isConnected || disconnecting"
          @click="disconnect"
        >
          <Spinner v-if="disconnecting" class="size-4 text-primary" />
          <Icon v-else icon="lucide:power" class="size-4" />
        </Button>
      </div>
    </div>
  </div>
</template>
