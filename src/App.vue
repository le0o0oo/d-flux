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
import { type BleDevice } from "@/services/transport";
import { platform } from "@tauri-apps/plugin-os";
import SetupFlow from "./components/setup/SetupFlow.vue";
import { getGpsProvider } from "./services/gpsProvider";
import { AndroidFs } from "tauri-plugin-android-fs-api";
import { Button } from "./components/ui/button";
import Map from "./components/views/Map.vue";
import { Icon } from "@iconify/vue";
import { open } from "@tauri-apps/plugin-shell";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

const scannerContainer = ref<HTMLElement | null>(null);
const parentContainer = ref<HTMLElement | null>(null);

const connectionStore = useConnectionStore();
const measurementStore = useMeasurementStore();
const settingsStore = useSettingsStore();
const appStore = useAppStore();
const mapOpen = ref(false);
const settingsOpen = ref(false);
const lastSelectedDeviceKey = ref<string | null>(null);

const isClosing = ref(false);
let allowWindowClose = false;
let closeFlowPromise: Promise<void> | null = null;
let unlistenCloseRequested: UnlistenFn | null = null;
let unlistenRustCloseRequested: UnlistenFn | null = null;

const startSetupFrom = ref<"folder" | "permissions" | undefined>(undefined);

const gpsProvider = getGpsProvider();

onMounted(async () => {
  if (scannerContainer.value) autoAnimate(scannerContainer.value);
  if (parentContainer.value) autoAnimate(parentContainer.value);

  console.log("saveFolderPath", settingsStore.saveFolderPath);
  if (platform() === "android") {
    // First setup or no folder selected
    if (!settingsStore.doneFirstSetup || !settingsStore.saveFolderPath) {
      appStore.setScreen("setup");
      return;
    }

    // Have folder, check permissions
    const uri = settingsStore.saveFolderUri;
    if (!uri) {
      // Should not happen, but reset to setup if it does
      startSetupFrom.value = "folder";
      appStore.setScreen("setup");
      return;
    }

    console.log(
      "checkPersistedPickerUriPermission",
      await AndroidFs.checkPersistedPickerUriPermission(uri, "ReadAndWrite"),
    );
    console.log(
      "checkPickerUriPermission",
      await AndroidFs.checkPickerUriPermission(uri, "ReadAndWrite"),
    );
    const hasPersisted = await AndroidFs.checkPersistedPickerUriPermission(
      uri,
      "ReadAndWrite",
    );
    const hasCurrent = await AndroidFs.checkPickerUriPermission(
      uri,
      "ReadAndWrite",
    );

    if (!hasPersisted || !hasCurrent) {
      startSetupFrom.value = "folder";
      appStore.setScreen("setup");
    }
  }

  setInterval(() => {
    console.log("GPS:", gpsProvider.getLocation());
  }, 5000);
});

onBeforeUnmount(async () => {
  unlistenCloseRequested?.();
  unlistenRustCloseRequested?.();
  if (connectionStore.isConnected || connectionStore.isConnecting) {
    await connectionStore.disconnect();
  }
});

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

document.addEventListener("click", async (e) => {
  // @ts-expect-error
  const anchor = e.target?.closest("a");
  if (!anchor) return;

  const url = anchor.getAttribute("href");
  if (!url) return;

  if (url.startsWith("http")) {
    e.preventDefault();
    await open(url);
  }
});

async function setupCloseHandler() {
  const win = getCurrentWindow();

  async function disconnectBeforeClose() {
    if (closeFlowPromise) {
      return closeFlowPromise;
    }

    closeFlowPromise = (async () => {
      if (connectionStore.isConnected || connectionStore.isConnecting) {
        await connectionStore.disconnect();
      }
    })().finally(() => {
      closeFlowPromise = null;
    });

    return closeFlowPromise;
  }

  async function closeAfterDisconnect() {
    if (allowWindowClose) return;

    isClosing.value = true;
    try {
      await disconnectBeforeClose();
      allowWindowClose = true;
      await win.close();
    } finally {
      isClosing.value = false;
    }
  }

  unlistenCloseRequested = await win.onCloseRequested(async (event) => {
    if (allowWindowClose) return;
    event.preventDefault();
    await closeAfterDisconnect();
  });

  unlistenRustCloseRequested = await listen("app-close-requested", async () => {
    await closeAfterDisconnect();
  });

  // if you ever need to remove the handler:
  // unlisten()
}

setupCloseHandler();
</script>

<template>
  <div class="size-full">
    <TitleBar v-if="platform() != 'android' && platform() != 'ios'" />
    <Toaster />
    <div class="size-full pt-8" ref="parentContainer">
      <DashboardView v-if="appStore.currentScreen === 'main'" />
      <SetupFlow
        v-if="appStore.currentScreen === 'setup'"
        :start-from="startSetupFrom"
        @done="doneSetup"
      />
      <div class="p-5" v-else>
        <div class="relative" ref="scannerContainer">
          <Dialog v-model:open="mapOpen">
            <DialogContent class="sm:max-w-lg px-3 pt-0 pb-3">
              <DialogHeader class="px-4 pt-4">
                <DialogTitle>Map</DialogTitle>
              </DialogHeader>
              <Map />
            </DialogContent>
          </Dialog>

          <Dialog v-model:open="settingsOpen">
            <DialogContent class="sm:max-w-lg p-0">
              <DialogHeader class="px-4 pt-4">
                <DialogTitle>Settings</DialogTitle>
              </DialogHeader>
              <Settings :show-title="false" />
            </DialogContent>
          </Dialog>

          <div class="flex items-center justify-end gap-2 mb-4">
            <Button variant="outline" @click="mapOpen = true">
              <Icon icon="lucide:map" class="w-4 h-4 mr-1.5" />
              Map
            </Button>
            <Button variant="outline" @click="settingsOpen = true">
              <Icon icon="lucide:settings" class="w-4 h-4 mr-1.5" />
              Settings
            </Button>
          </div>

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

          <div
            v-if="isClosing"
            class="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-sm rounded-md"
          >
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner class="w-4 h-4" />
              <span class="truncate max-w-[70vw]"> Disconnecting </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
body {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
