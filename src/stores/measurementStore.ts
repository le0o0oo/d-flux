import { defineStore } from "pinia";
import { ref } from "vue";
import {
  ProtocolParser,
  ProtocolEventType,
  type SensorData,
} from "@/services/ProtocolParser";
import { useSettingsStore } from "./settingsStore";
import { saveMeasurementsCsv } from "@/services/measurementCsvService";
import { getGpsProvider } from "@/services/gpsProvider";

export const useMeasurementStore = defineStore("measurement", () => {
  // State
  const gpsProvider = getGpsProvider();
  const data = ref<SensorData[]>([]);
  const currentSessionData = ref<SensorData[]>([]);
  const isAcquiring = ref(false);
  const startTime = ref<number | null>(null);
  const sensorName = ref("sensor");
  const backupInProgress = ref(false);
  const settingsStore = useSettingsStore();

  async function saveRowsToCsv(rows: SensorData[]) {
    if (rows.length === 0) return null;

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
        folderUri: settingsStore.saveFolderUri,
      });
      console.log("Saved measurements to", filePath);
      return filePath;
    } catch (err) {
      console.error("Failed to save CSV:", err);
      return null;
    }
  }

  function applyAcquisitionState(nextIsAcquiring: boolean): SensorData[] {
    const wasAcquiring = isAcquiring.value;
    isAcquiring.value = nextIsAcquiring;

    if (!wasAcquiring && nextIsAcquiring) {
      currentSessionData.value = [];
      startTime.value = Date.now();
      return [];
    }

    if (wasAcquiring && !nextIsAcquiring) {
      startTime.value = null;
      const rowsToSave = [...currentSessionData.value];
      currentSessionData.value = [];
      return rowsToSave;
    }

    if (!nextIsAcquiring) {
      startTime.value = null;
    }

    return [];
  }

  function handleIncomingLine(rawLine: string) {
    const parsed = ProtocolParser.parseLine(rawLine);
    if (!parsed) return;

    switch (parsed.type) {
      case ProtocolEventType.DATA:
        const measurement = ProtocolParser.parseDataPayload(parsed.payload);
        if (measurement) {
          const co2Multiplier =
            settingsStore.deviceSettings.settings.co2CalibrationMultiplier;
          const co2Offset =
            settingsStore.deviceSettings.settings.co2CalibrationOffset;

          if (typeof measurement.co2 === "number") {
            measurement.co2 = measurement.co2 * co2Multiplier + co2Offset;
          }

          measurement.latitude = gpsProvider.getLocation().latitude;
          measurement.longitude = gpsProvider.getLocation().longitude;
          measurement.altitude = gpsProvider.getLocation().altitude;
          data.value.push(measurement);
          if (isAcquiring.value) {
            currentSessionData.value.push(measurement);
          }
        }
        break;

      case ProtocolEventType.ACQUISITION_STATE:
        {
          const rowsToSave = applyAcquisitionState(parsed.payload === "1");
          if (rowsToSave.length > 0) {
            void saveRowsToCsv(rowsToSave);
          }
        }
        break;

      case ProtocolEventType.WHOIS:
        if (parsed.payload?.trim()) {
          sensorName.value = parsed.payload.trim();
        }
        console.log("Device identified:", parsed.payload);
        break;

      case ProtocolEventType.ERROR:
        console.error("Device reported error:", parsed.payload);
        break;

      case ProtocolEventType.SETTINGS:
        const deviceSettings = ProtocolParser.parseSettingsPayload(
          parsed.payload,
        );
        settingsStore.deviceSettings.settings.co2CalibrationMultiplier =
          deviceSettings.co2Multiplier;
        settingsStore.deviceSettings.settings.co2CalibrationOffset =
          deviceSettings.co2Offset;

        settingsStore.deviceSettings.applied = true;
        break;

      case ProtocolEventType.HW_CALIBRATION_REF:
        settingsStore.deviceSettings.settings.hardwareCalibrationReference =
          parseInt(parsed.payload);
        break;
    }
  }

  function ingestLine(rawLine: string) {
    handleIncomingLine(rawLine);
  }

  function markAcquisitionStarted() {
    applyAcquisitionState(true);
  }

  async function markAcquisitionStopped() {
    const rowsToSave = applyAcquisitionState(false);
    if (rowsToSave.length === 0) return null;
    return await saveRowsToCsv(rowsToSave);
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
    return await saveRowsToCsv(data.value);
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
    clearData,
    exportToCSV,
    setSensorName,
    backupOnDisconnect,
    ingestLine,
    markAcquisitionStarted,
    markAcquisitionStopped,
  };
});
