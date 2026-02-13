<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { onMounted, ref } from "vue";
import { checkPermissions as checkBluetoothPermissions } from "@mnlphlp/plugin-blec";
import { invoke } from "@tauri-apps/api/core";
import {
  checkPermissions as checkGeolocationPermission,
  requestPermissions,
} from "@tauri-apps/plugin-geolocation";

const allowedGeo = ref(false);
const allowedBluetooth = ref(false);

async function updateGeo() {
  let geoPerms = await checkGeolocationPermission();

  if (
    geoPerms.location === "prompt" ||
    geoPerms.location === "prompt-with-rationale"
  ) {
    allowedGeo.value = false;
  } else allowedGeo.value = true;
}

onMounted(async () => {
  await updateGeo();

  allowedBluetooth.value = await checkBluetoothPermissions(false);
});

const permissions = [
  {
    icon: "lucide:map-pin",
    name: "Location",
    check: allowedGeo,
    grantHandler: async () => {
      await requestPermissions(["location"]);
      await updateGeo();
    },
  },
  {
    icon: "lucide:smartphone-nfc",
    name: "Nearby devices",
    check: allowedBluetooth,
    grantHandler: async () => {
      allowedBluetooth.value = await checkBluetoothPermissions(true);
    },
  },
];

const emit = defineEmits<{
  (e: "next"): void;
}>();
</script>

<template>
  <div
    class="size-full h-screen flex flex-col justify-center items-center gap-3"
  >
    <div
      class="flex flex-col gap-3 p-3 rounded-full justify-center items-center"
    >
      <div class="flex flex-col gap-3 items-center justify-center">
        <div
          class="flex gap-3 p-3 rounded-full bg-secondary items-center justify-center"
        >
          <Icon icon="lucide:shield" class="size-10 opacity-80" />
        </div>
        <div class="flex flex-col gap-1 text-center">
          <h1 class="text-2xl font-bold">Permissions</h1>
          <p class="text-sm text-muted-foreground">
            Grant the necessary permissions to the app to access the files.
          </p>
        </div>
      </div>

      <div class="w-full space-y-3">
        <Card v-for="permission in permissions" :key="permission.name">
          <CardContent class="flex items-center gap-3 justify-between">
            <div class="flex items-center gap-3">
              <Icon :icon="permission.icon" class="size-6 opacity-80" />
              <div class="flex flex-col gap-1">
                <h3 class="text-lg font-bold">{{ permission.name }}</h3>
              </div>
            </div>
            <Button
              variant="outline"
              :disabled="permission.check.value"
              @click="permission.grantHandler()"
              >{{ permission.check.value ? "Granted" : "Grant" }}</Button
            >
          </CardContent>
        </Card>

        <Button
          class="mt-4 w-full"
          :disabled="!allowedGeo || !allowedBluetooth"
          @click="emit('next')"
          >Next</Button
        >
      </div>
    </div>
  </div>
</template>
