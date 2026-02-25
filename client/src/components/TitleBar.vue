<script setup lang="ts">
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Icon } from "@iconify/vue";

const appWindow = getCurrentWindow();

function minimize() {
  appWindow.minimize();
}

function maximize() {
  appWindow.toggleMaximize();
}

function close() {
  appWindow.close();
}
</script>

<template>
  <div
    data-tauri-drag-region
    class="h-8 flex items-center justify-between bg-sidebar border-b select-none fixed top-0 left-0 right-0 z-99"
  >
    <div
      class="px-4 text-xs font-medium text-muted-foreground pointer-events-none"
    >
      D Flux
    </div>
    <div class="flex items-center">
      <button
        @click="minimize"
        class="h-8 w-10 inline-flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
        title="Minimize"
      >
        <Icon icon="lucide:minus" class="text-lg" />
      </button>
      <button
        @click="maximize"
        class="h-8 w-10 inline-flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
        title="Maximize"
      >
        <Icon icon="lucide:maximize" class="text-lg" />
      </button>
      <button
        @click="close"
        class="h-8 w-10 inline-flex items-center group justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
        title="Close"
      >
        <Icon icon="lucide:x" class="text-lg group-hover:text-white" />
      </button>
    </div>
  </div>
</template>
