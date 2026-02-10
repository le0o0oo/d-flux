<script setup lang="ts">
import type { SidebarProps } from "@/components/ui/sidebar";
import NavMain from "./NavMain.vue";
import { Sidebar, SidebarContent, SidebarRail, useSidebar } from "@/components/ui/sidebar";
import { SidebarGroup, SidebarMenuItem } from "@/components/ui/sidebar";
import navItems from "@/config/navItems";
import ConnectStatus from "../ConnectionViews/ConnectStatus.vue";
import { computed } from "vue";

const props = withDefaults(defineProps<SidebarProps>(), {
  collapsible: "icon",
});
const { state, isMobile } = useSidebar();
const isSidebarCollapsed = computed(() => !isMobile.value && state.value === "collapsed");

</script>

<template>
  <Sidebar v-bind="props">
    <SidebarContent class="h-full">
      <NavMain :items="navItems" />

      <SidebarGroup>
        <SidebarMenuItem>
          <ConnectStatus :collapsed="isSidebarCollapsed" />
        </SidebarMenuItem>
      </SidebarGroup>
    </SidebarContent>
    <SidebarRail />
  </Sidebar>
</template>
