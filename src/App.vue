<script setup lang="ts">
import 'vue-sonner/style.css'
import { Toaster } from '@/components/ui/sonner'
import TitleBar from "./components/TitleBar.vue";
import { useColorMode } from "@vueuse/core";
import autoAnimate from "@formkit/auto-animate";
import { onBeforeUnmount, onMounted, ref, type Ref } from "vue";
import Scanner from "./components/ConnectionViews/Scanner.vue";
import type { DeviceInfo } from "@/utils/connectionUtils";
import { useConnectionStore } from "@/stores/connectionStore";
import { Spinner } from "@/components/ui/spinner";
import { toast } from 'vue-sonner'
import DashboardView from "./components/DashboardView.vue";


const parentContainer = ref<HTMLElement | null>(null);

const connectionStore = useConnectionStore();

const currentScreen: Ref<"connection" | "main"> = ref("connection");

onMounted(async () => {
  if (parentContainer.value) autoAnimate(parentContainer.value);

  // const devices = await detectHC05({ timeoutMs: 1500 }, (p) => {
  //   console.log("progress: ", p);
  // });
  // console.log(devices);

});

onBeforeUnmount(async () => {
  await connectionStore.disconnect();
});

async function handleDeviceSelect(device: DeviceInfo) {
  if (connectionStore.isConnecting) return;

  console.log("Device selected:", device);

  try {
    await connectionStore.connectToDevice(device);
    currentScreen.value = "main";
  } catch (err) {
    console.error("Connection error:", err);
    toast.error("Errore", {
      description: err instanceof Error ? err.message : String(err)
    });
  }

}

useColorMode();
</script>

<template>
  <div class="size-full">
    <TitleBar />
    <Toaster />
    <div class="size-full pt-8">
      <DashboardView v-if="currentScreen === 'main'" />
      <div class="p-5" v-else>
        <div class="relative">
          <Scanner @select-device="handleDeviceSelect" />

          <div v-if="connectionStore.isConnecting"
            class="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-sm rounded-md">
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner class="w-4 h-4" />
              <span class="truncate max-w-[70vw]">
                Connessione{{
                  connectionStore.currentDevice?.name
                    ? ` a ${connectionStore.currentDevice.name}`
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

<style>
/* width */
::-webkit-scrollbar {
  width: 5px;
}

/* Track */
::-webkit-scrollbar-track {
  background: transparent;
}

/* Handle */
::-webkit-scrollbar-thumb {
  background: #888;
}

/* Handle on hover */
::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>