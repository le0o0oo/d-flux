<script setup lang="ts">
import "vue-sonner/style.css";
import { Toaster } from "@/components/ui/sonner";
import TitleBar from "./components/TitleBar.vue";
import { useColorMode } from "@vueuse/core";
import autoAnimate from "@formkit/auto-animate";
import { onBeforeUnmount, onMounted, ref } from "vue";
import Scanner from "./components/ConnectionViews/Scanner.vue";
import { useConnectionStore } from "@/stores/connectionStore";
import { useMeasurementStore } from "@/stores/measurementStore";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "vue-sonner";
import DashboardView from "./components/DashboardView.vue";
import Settings from "@/components/views/Settings.vue";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSettingsStore } from "./stores/settingsStore";
import { useAppStore } from "./stores/appStore";
import type { BleDevice } from "@/services/transport";
import { platform } from "@tauri-apps/plugin-os";
import SetupFlow from "./components/setup/SetupFlow.vue";

const scannerContainer = ref<HTMLElement | null>(null);
const parentContainer = ref<HTMLElement | null>(null);

const connectionStore = useConnectionStore();
const measurementStore = useMeasurementStore();
const settingsStore = useSettingsStore();
const appStore = useAppStore();
const settingsOpen = ref(false);
const lastSelectedDeviceKey = ref<string | null>(null);

onMounted(async () => {
  if (scannerContainer.value) autoAnimate(scannerContainer.value);
  if (parentContainer.value) autoAnimate(parentContainer.value);
});

onBeforeUnmount(async () => {
  await connectionStore.disconnect();
});

if (platform() === "android" && !settingsStore.doneFirstSetup) {
  appStore.setScreen("setup");
}

async function handleConnect(device: BleDevice) {
  if (connectionStore.isConnecting) return;

  const selectedDeviceKey = `${device.address}|${device.name ?? ""}`;

  if (
    lastSelectedDeviceKey.value &&
    lastSelectedDeviceKey.value !== selectedDeviceKey
  ) {
    measurementStore.clearData();
    connectionStore.clearConsole();
  }

  try {
    await connectionStore.connectToDevice(device);
    lastSelectedDeviceKey.value = selectedDeviceKey;
    appStore.setScreen("main");
  } catch (err) {
    toast.error("Error", {
      description: err instanceof Error ? err.message : String(err),
    });
  }
}

function doneSetup() {
  settingsStore.doneFirstSetup = true;
  appStore.setScreen("connection");
}

useColorMode();
</script>

<template>
  <div class="size-full">
    <TitleBar v-if="platform() != 'android' && platform() != 'ios'" />
    <Toaster />
    <div class="size-full pt-8" ref="parentContainer">
      <DashboardView v-if="appStore.currentScreen === 'main'" />
      <SetupFlow v-if="appStore.currentScreen === 'setup'" @done="doneSetup" />
      <div class="p-5" v-else>
        <div class="relative" ref="scannerContainer">
          <Dialog v-model:open="settingsOpen">
            <DialogContent class="sm:max-w-lg p-0">
              <DialogHeader class="px-4 pt-4">
                <DialogTitle>Settings</DialogTitle>
              </DialogHeader>
              <Settings :show-title="false" />
            </DialogContent>
          </Dialog>

          <Scanner
            @connect="handleConnect"
            @open-settings="settingsOpen = true"
          />

          <div
            v-if="connectionStore.isConnecting"
            class="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-sm rounded-md"
          >
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner class="w-4 h-4" />
              <span class="truncate max-w-[70vw]">
                Connecting{{
                  connectionStore.currentDevice?.name
                    ? ` to ${connectionStore.currentDevice.name}`
                    : ""
                }}...
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
