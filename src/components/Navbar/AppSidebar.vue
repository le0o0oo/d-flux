<script setup lang="ts">
import { ref } from "vue";
import type { SidebarProps } from "@/components/ui/sidebar";
import NavMain from "./NavMain.vue";
import { Sidebar, SidebarContent, SidebarRail } from "@/components/ui/sidebar";
import { SidebarGroup, SidebarMenuItem } from "@/components/ui/sidebar";
import navItems from "@/config/navItems";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bluetooth, BluetoothConnected, BluetoothOff } from "lucide-vue-next";

const props = withDefaults(defineProps<SidebarProps>(), {
  collapsible: "icon",
});

// Mock connection status for design purposes
type ConnectionStatus = "connected" | "disconnected" | "connecting";
const connectionStatus = ref<ConnectionStatus>("disconnected");
const deviceName = ref<string>("My Device");

const getStatusConfig = (status: ConnectionStatus) => {
  switch (status) {
    case "connected":
      return {
        icon: BluetoothConnected,
        label: "Connesso",
        variant: "default" as const,
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-50 dark:bg-green-950/20",
      };
    case "connecting":
      return {
        icon: Bluetooth,
        label: "Connessione...",
        variant: "secondary" as const,
        color: "text-yellow-600 dark:text-yellow-400",
        bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
      };
    case "disconnected":
      return {
        icon: BluetoothOff,
        label: "Disconnesso",
        variant: "outline" as const,
        color: "text-gray-600 dark:text-gray-400",
        bgColor: "bg-gray-50 dark:bg-gray-950/20",
      };
  }
};
</script>

<template>
  <Sidebar v-bind="props">
    <SidebarContent class="h-full">
      <NavMain :items="navItems" />

      <SidebarGroup>
        <SidebarMenuItem>
          <Card class="gap-2 py-4 shadow-none">
            <CardHeader class="px-4 pb-3">
              <CardTitle class="text-sm"> Stato di connessione </CardTitle>
              <CardDescription class="text-xs">
                Stato della connessione Bluetooth
              </CardDescription>
            </CardHeader>
            <CardContent class="px-4 pt-0">
              <div class="flex flex-col gap-3">
                <!-- Status Indicator -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <component
                      :is="getStatusConfig(connectionStatus).icon"
                      :class="[
                        'h-5 w-5',
                        getStatusConfig(connectionStatus).color,
                      ]"
                    />
                    <span class="text-sm font-medium">Bluetooth</span>
                  </div>
                  <Badge
                    :variant="getStatusConfig(connectionStatus).variant"
                    class="text-xs"
                  >
                    {{ getStatusConfig(connectionStatus).label }}
                  </Badge>
                </div>

                <!-- Device Info (only show if connected) -->
                <div
                  v-if="connectionStatus === 'connected'"
                  class="flex items-center gap-2 rounded-md p-2"
                  :class="getStatusConfig(connectionStatus).bgColor"
                >
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-medium text-foreground">
                      {{ deviceName }}
                    </p>
                    <p class="text-xs text-muted-foreground">
                      Dispositivo connesso
                    </p>
                  </div>
                </div>

                <!-- Connection Status Message -->
                <div
                  v-else-if="connectionStatus === 'disconnected'"
                  class="flex items-center gap-2 rounded-md p-2"
                  :class="getStatusConfig(connectionStatus).bgColor"
                >
                  <p class="text-xs text-muted-foreground">
                    Nessun dispositivo connesso
                  </p>
                </div>

                <div
                  v-else-if="connectionStatus === 'connecting'"
                  class="flex items-center gap-2 rounded-md p-2"
                  :class="getStatusConfig(connectionStatus).bgColor"
                >
                  <div
                    class="h-2 w-2 rounded-full bg-yellow-600 dark:bg-yellow-400 animate-pulse"
                  ></div>
                  <p class="text-xs text-muted-foreground">
                    Ricerca dispositivi...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </SidebarMenuItem>
      </SidebarGroup>
    </SidebarContent>
    <SidebarRail />
  </Sidebar>
</template>
