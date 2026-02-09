<script setup lang="ts">
import { currentView } from "@/lib/navigation";
import AppSidebar from "@/components/Navbar/AppSidebar.vue";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
</script>

<template>
  <div class="size-full">
    <SidebarProvider class="h-svh">
      <AppSidebar class="top-8 h-[calc(100svh-2rem)]!" />
      <SidebarInset>
        <!-- <header class="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger class="-ml-1" />
        </header> -->
        <div class="flex flex-1 flex-col gap-4 p-4 min-w-0 mb-8" ref="parentContainer">
          <component :is="currentView" />
        </div>
      </SidebarInset>
    </SidebarProvider>
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
