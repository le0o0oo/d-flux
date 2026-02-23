<script setup lang="ts">
import { Label } from "@/components/ui/label";
import {
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/ui/number-field";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/stores/settingsStore";
import { ref, computed } from "vue";
import { Spinner } from "../ui/spinner";
import { useConnectionStore } from "@/stores/connectionStore";
import { ProtocolCommandType } from "@/services/ProtocolParser";

const settingsStore = useSettingsStore();
const connectionStore = useConnectionStore();
const saving = ref(false);

// Current form values
const currentOffset = ref(
  settingsStore.deviceSettings.settings.co2CalibrationOffset,
);
const currentMultiplier = ref(
  settingsStore.deviceSettings.settings.co2CalibrationMultiplier,
);

// Check if values are synchronized with store
const isSynchronized = computed(() => {
  return (
    currentOffset.value ===
      settingsStore.deviceSettings.settings.co2CalibrationOffset &&
    currentMultiplier.value ===
      settingsStore.deviceSettings.settings.co2CalibrationMultiplier
  );
});

// Handle save action
const handleSave = async () => {
  saving.value = true;
  await connectionStore.sendCommand(
    ProtocolCommandType.SET_SETTINGS,
    `offset=${currentOffset.value};multiplier=${currentMultiplier.value}`,
  );

  settingsStore.deviceSettings.settings.co2CalibrationOffset =
    currentOffset.value;
  settingsStore.deviceSettings.settings.co2CalibrationMultiplier =
    currentMultiplier.value;
  settingsStore.deviceSettings.applied = true;
  saving.value = false;
};
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <p>Device settings</p>
      <Button :disabled="isSynchronized || saving" @click="handleSave"
        ><Spinner v-if="saving" /> Save</Button
      >
    </div>
    <div class="rounded-lg border p-4 space-y-3">
      <div class="space-y-0.5">
        <Label class="text-base font-medium">CO₂ calibration</Label>
        <p class="text-sm text-muted-foreground">
          Adjust the offset and multiplier that will be applied to the CO₂
          values.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <div class="grid md:grid-cols-2 grid-cols-1 gap-2 w-full">
          <div class="w-full">
            <NumberField
              id="multiplier"
              v-model="currentMultiplier"
              :default-value="1"
              :step="0.01"
              class="w-full"
            >
              <Label for="multiplier">Multiplier</Label>
              <NumberFieldContent>
                <NumberFieldDecrement />
                <NumberFieldInput />
                <NumberFieldIncrement />
              </NumberFieldContent>
            </NumberField>
            <p v-if="currentMultiplier === 0" class="text-red-500">
              ⚠️ Multiplier is <strong>0</strong>
            </p>
          </div>

          <div class="w-full">
            <NumberField
              id="offset"
              v-model="currentOffset"
              :default-value="0"
              :step="0.01"
              class="w-full"
            >
              <Label for="offset">Offset</Label>
              <NumberFieldContent>
                <NumberFieldDecrement />
                <NumberFieldInput />
                <NumberFieldIncrement />
              </NumberFieldContent>
            </NumberField>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
