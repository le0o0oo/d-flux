import { defineStore } from "pinia";
import { ref } from "vue";
import { useMeasurementStore } from "./measurementStore";
import { useSettingsStore } from "./settingsStore";
import { saveFluxData as saveFluxCsv } from "@/services/fluxCsvService";
import { getGpsProvider } from "@/services/gpsProvider";

export const useAnalyzeStore = defineStore("analyze", () => {
  const activeTool = ref<"delete" | "linear_regression" | undefined>(undefined);
  const brushSelection = ref<[number, number] | null>(null);
  const gpsProvider = getGpsProvider();

  async function saveFluxData(): Promise<string> {
    if (!brushSelection.value) {
      throw new Error("No brush selection");
    }

    const settingsStore = useSettingsStore();
    if (!settingsStore.saveFolderPath) {
      throw new Error("Save folder not configured");
    }

    const measurementStore = useMeasurementStore();

    return saveFluxCsv({
      data: measurementStore.data,
      brushSelection: brushSelection.value,
      folder: {
        path: settingsStore.saveFolderPath,
        uri: settingsStore.saveFolderUri,
      },
      gpsLocation: gpsProvider.getLocation(),
    });
  }

  return {
    activeTool,
    brushSelection,
    saveFluxData,
  };
});
