import { defineStore } from "pinia";
import { ref } from "vue";
import { serialService } from "@/services/SerialService";
import { ProtocolParser, SerialEventType, type SensorData } from "@/services/ProtocolParser";
import { useSettingsStore } from "./settingsStore";
import { saveMeasurementsCsv } from "@/services/measurementCsvService";

export const useMeasurementStore = defineStore("measurement", () => {
  // State
  const data = ref<SensorData[]>([]);
  const currentSessionData = ref<SensorData[]>([]);
  const isAcquiring = ref(false);
  const startTime = ref<number | null>(null);
  const sensorName = ref("sensor");
  const backupInProgress = ref(false);

  async function saveRowsToCsv(rows: SensorData[]) {
    if (rows.length === 0) return null;

    const settingsStore = useSettingsStore();
    const saveFolderPath = settingsStore.saveFolderPath;
    if (!saveFolderPath) {
      console.warn("Save folder path is not configured");
      return null;
    }

    try {
      const filePath = await saveMeasurementsCsv({
        rows,
        sensorName: sensorName.value,
        folderPath: saveFolderPath,
      });
      console.log("Saved measurements to", filePath);
      return filePath;
    } catch (err) {
      console.error("Failed to save CSV:", err);
      return null;
    }
  }

  function handleSerialData(rawLine: string) {
    const parsed = ProtocolParser.parseLine(rawLine);
    if (!parsed) return;

    switch (parsed.type) {
      case SerialEventType.DATA:
        const measurement = ProtocolParser.parseDataPayload(parsed.payload);
        if (measurement) {
          data.value.push(measurement);
          if (isAcquiring.value) {
            currentSessionData.value.push(measurement);
          }
        }
        break;

      case SerialEventType.ACQUISITION_STATE:
        const wasAcquiring = isAcquiring.value;
        const nextIsAcquiring = parsed.payload === "1";

        // Payload is "1" (true) or "0" (false)
        isAcquiring.value = nextIsAcquiring;

        if (!wasAcquiring && nextIsAcquiring) {
          currentSessionData.value = [];
        }

        if (isAcquiring.value && !startTime.value) {
          startTime.value = Date.now();
        } else if (!isAcquiring.value) {
          startTime.value = null;
        }

        if (wasAcquiring && !nextIsAcquiring) {
          const rowsToSave = [...currentSessionData.value];
          currentSessionData.value = [];
          void saveRowsToCsv(rowsToSave);
        }
        break;
        
      case SerialEventType.WHOIS:
        if (parsed.payload?.trim()) {
          sensorName.value = parsed.payload.trim();
        }
        console.log("Device identified:", parsed.payload);
        break;
        
      case SerialEventType.ERROR:
        console.error("Device reported error:", parsed.payload);
        break;
    }
  }

  function startListening() {
    serialService.on("data", handleSerialData);
  }

  function stopListening() {
    serialService.off("data", handleSerialData);
  }

  function clearData() {
    data.value = [];
    currentSessionData.value = [];
    startTime.value = null;
  }

  function setSensorName(name: string) {
    if (!name?.trim()) return;
    sensorName.value = name.trim();
  }

  /**
   * Exports the current data to a CSV file.
   */
  async function exportToCSV() {
    await saveRowsToCsv(data.value);
  }

  async function backupOnDisconnect() {
    if (backupInProgress.value) return null;
    if (currentSessionData.value.length === 0) return null;

    backupInProgress.value = true;
    const rowsToSave = [...currentSessionData.value];

    try {
      const filePath = await saveRowsToCsv(rowsToSave);
      if (filePath) {
        currentSessionData.value = [];
        isAcquiring.value = false;
        startTime.value = null;
      }
      return filePath;
    } finally {
      backupInProgress.value = false;
    }
  }

  return {
    data,
    isAcquiring,
    sensorName,
    startListening,
    stopListening,
    clearData,
    exportToCSV,
    setSensorName,
    backupOnDisconnect,
  };
});
