<script setup lang="ts">
import AppSidebar from "./components/Navbar/AppSidebar.vue";
import TitleBar from "./components/TitleBar.vue";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { currentView } from "@/lib/navigation";
import { useColorMode } from "@vueuse/core";
import autoAnimate from "@formkit/auto-animate";
import { onMounted, ref } from "vue";
import { useConnectionStore } from "@/stores/connectionStore";

import BluetoothScreen from "./components/fullScreens/Bluetooth.vue";

const parentContainer = ref<HTMLElement | null>(null);
const connectionStore = useConnectionStore();

onMounted(() => {
  //autoAnimate(parentContainer.value!);
});

useColorMode();
</script>

<template>
  <div class="size-full">
    <TitleBar />
    <div class="size-full">
      <SidebarProvider
        class="pt-8 h-svh"
        v-if="connectionStore.currentState === 'connected'"
      >
        <AppSidebar class="top-8 h-[calc(100svh-2rem)]!" />
        <SidebarInset>
          <header class="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger class="-ml-1" />
          </header>
          <div
            class="flex flex-1 flex-col gap-4 p-4 min-w-0"
            ref="parentContainer"
          >
            <component :is="currentView" />
          </div>
        </SidebarInset>
      </SidebarProvider>
      <BluetoothScreen v-else />
    </div>
  </div>
</template>

<style>
/* Handle */
::-webkit-scrollbar-thumb {
  background: var(--primary);
  border-radius: 10px;
}

/* Handle on hover */
::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
