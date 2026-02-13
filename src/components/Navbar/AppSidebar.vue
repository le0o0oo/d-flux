<script setup lang="ts">
import type { SidebarProps } from "@/components/ui/sidebar";
import NavMain from "./NavMain.vue";
import {
  Sidebar,
  SidebarContent,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { SidebarGroup, SidebarMenuItem } from "@/components/ui/sidebar";
import navItems from "@/config/navItems";
import ConnectStatus from "../ConnectionViews/ConnectStatus.vue";
import { computed } from "vue";
import { cn } from "@/lib/utils";
import config from "@/config/config";

const props = withDefaults(defineProps<SidebarProps>(), {
  collapsible: "icon",
});
const { state, isMobile, setOpen, setOpenMobile } = useSidebar();
const isSidebarCollapsed = computed(
  () => !isMobile.value && state.value === "collapsed"
);
</script>

<template>
  <Sidebar v-bind="props">
    <SidebarContent
      class="h-full"
      :class="cn(config.isOnMobile ? 'mt-6' : 'mt-0')"
    >
      <NavMain :items="navItems" @select="setOpenMobile(false)" />

      <SidebarGroup>
        <SidebarMenuItem>
          <ConnectStatus :collapsed="isSidebarCollapsed" />
        </SidebarMenuItem>
      </SidebarGroup>
    </SidebarContent>
    <SidebarRail />
  </Sidebar>
</template>
