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

useColorMode();
</script>

<template>
  <TitleBar />
  <SidebarProvider class="pt-8 h-svh">
    <AppSidebar class="top-8 h-[calc(100svh-2rem)]!" />
    <SidebarInset>
      <header class="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger class="-ml-1" />
      </header>
      <div class="flex flex-1 flex-col gap-4 p-4 min-w-0">
        <component :is="currentView" />
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>
