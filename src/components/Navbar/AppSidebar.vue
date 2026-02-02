<script setup lang="ts">
import type { SidebarProps } from "@/components/ui/sidebar";
import NavMain from "./NavMain.vue";
import { Sidebar, SidebarContent, SidebarRail } from "@/components/ui/sidebar";
import navItems from "@/config/navItems";

const props = withDefaults(defineProps<SidebarProps>(), {
  collapsible: "icon",
});
</script>

<template>
  <Sidebar v-bind="props">
    <SidebarContent class="h-full">
      <NavMain :items="navItems" />
    </SidebarContent>
    <SidebarRail />
  </Sidebar>
</template>
