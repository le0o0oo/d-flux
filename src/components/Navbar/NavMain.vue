<script setup lang="ts">
import { type Component } from "vue";
import { ChevronRight } from "lucide-vue-next";
import * as LucideIcons from "lucide-vue-next";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import Settings from "@/components/views/Settings.vue";
import { setView } from "@/lib/navigation";
import { Icon } from "@iconify/vue";

interface NavItem {
  title: string;
  icon: string;
  component?: Component;
  items?: NavItem[];
}

defineProps<{
  items: NavItem[];
}>();

function getIcon(iconName: string) {
  // iconName is like "lucide:gauge"
  if (!iconName) return LucideIcons.Circle;

  const parts = iconName.split(":");
  if (parts.length > 1) {
    const name = parts[1];
    // Capitalize first letter to match Lucide export (e.g. gauge -> Gauge)
    const pascalName = name.charAt(0).toUpperCase() + name.slice(1);
    // @ts-ignore
    return LucideIcons[pascalName] || LucideIcons.Circle;
  }
  return LucideIcons.Circle;
}

function handleItemClick(item: NavItem) {
  if (item.component) {
    setView(item.component);
  }
}
</script>

<template>
  <SidebarGroup class="h-full">
    <SidebarGroupLabel>Categories</SidebarGroupLabel>
    <SidebarMenu class="h-full">
      <div class="h-full">
        <template v-for="item in items" :key="item.title">
          <Collapsible
            v-if="item.items && item.items.length > 0"
            as-child
            class="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger as-child>
                <SidebarMenuButton :tooltip="item.title">
                  <Icon :icon="item.icon" />
                  <span>{{ item.title }}</span>
                  <ChevronRight
                    class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                  />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  <SidebarMenuSubItem
                    v-for="subItem in item.items"
                    :key="subItem.title"
                  >
                    <SidebarMenuSubButton
                      as-child
                      @click="handleItemClick(subItem)"
                    >
                      <a href="#" @click.prevent>
                        <span>{{ subItem.title }}</span>
                      </a>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>

          <SidebarMenuItem v-else>
            <SidebarMenuButton
              :tooltip="item.title"
              @click="handleItemClick(item)"
            >
              <component :is="getIcon(item.icon)" />
              <span>{{ item.title }}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </template>
      </div>
      <SidebarMenuItem class="mt-auto">
        <SidebarMenuButton @click="setView(Settings)" tooltip="Settings">
          <Icon icon="lucide:settings" />
          <span>Settings</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroup>
</template>
