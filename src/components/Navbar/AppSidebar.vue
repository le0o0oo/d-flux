<script setup lang="ts">
import type { SidebarProps } from "@/components/ui/sidebar";
import NavMain from "./NavMain.vue";
import { Sidebar, SidebarContent, SidebarRail } from "@/components/ui/sidebar";
import { SidebarGroup, SidebarMenuItem } from "@/components/ui/sidebar";
import navItems from "@/config/navItems";
import ConnectStatus from "../ConnectionViews/ConnectStatus.vue";
import SidebarHeader from "../ui/sidebar/SidebarHeader.vue";
import DeviceSwitcher from "./DeviceSwitcher.vue";

const props = withDefaults(defineProps<SidebarProps>(), {
  collapsible: "icon",
});


const teams = [
  {
    name: "Acme Inc",
    logo: "lucide:audio-waveform",
    plan: "Enterprise",
  },
  {
    name: "Acme Corp.",
    logo: "lucide:command",
    plan: "Startup",
  },
  {
    name: "Evil Corp.",
    logo: "lucide:command",
    plan: "Free",
  },
]

</script>

<template>
  <Sidebar v-bind="props">
    <!-- <SidebarHeader>
      <DeviceSwitcher :teams="teams as any" />
    </SidebarHeader> -->
    <SidebarContent class="h-full">
      <NavMain :items="navItems" />

      <SidebarGroup>
        <SidebarMenuItem>
          <ConnectStatus />
        </SidebarMenuItem>
      </SidebarGroup>
    </SidebarContent>
    <SidebarRail />
  </Sidebar>
</template>
