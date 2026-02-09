import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { serialService } from "@/services/SerialService";
import { ProtocolParser, SerialEventType, type SensorData } from "@/services/ProtocolParser";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";

export const useMeasurementStore = defineStore("measurement", () => {
  // State
  const data = ref<SensorData[]>([]);
  const isAcquiring = ref(false);
  const startTime = ref<number | null>(null);

  // Actions
  function handleSerialData(rawLine: string) {
    const parsed = ProtocolParser.parseLine(rawLine);
    if (!parsed) return;

    switch (parsed.type) {
      case SerialEventType.DATA:
        const measurement = ProtocolParser.parseDataPayload(parsed.payload);
        if (measurement) {
          data.value.push(measurement);
        }
        break;

      case SerialEventType.ACQUISITION_STATE:
        // Payload is "1" (true) or "0" (false)
        isAcquiring.value = parsed.payload === "1";
        if (isAcquiring.value && !startTime.value) {
          startTime.value = Date.now();
        } else if (!isAcquiring.value) {
          startTime.value = null;
        }
        break;
        
      case SerialEventType.WHOIS:
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
    startTime.value = null;
  }

  /**
   * Exports the current data to a CSV file.
   */
  async function exportToCSV() {
    if (data.value.length === 0) {
      console.warn("No data to export");
      return;
    }

    // 1. Generate CSV content
    const headers = ["Timestamp", "Date", "CO2 (ppm)", "Temperature (C)", "Humidity (%)"];
    const rows = data.value.map(row => {
      const dateStr = new Date(row.timestamp).toISOString();
      return [
        row.timestamp,
        dateStr,
        row.co2 ?? "",
        row.temperature ?? "",
        row.humidity ?? ""
      ].join(",");
    });
    
    const csvContent = [headers.join(","), ...rows].join("\n");

    // 2. Open Save Dialog
    try {
      const filePath = await save({
        filters: [{
          name: 'CSV File',
          extensions: ['csv']
        }],
        defaultPath: 'measurements.csv'
      });

      if (filePath) {
        // 3. Write to file
        await writeTextFile(filePath, csvContent);
        console.log("Exported successfully to", filePath);
      }
    } catch (err) {
      console.error("Failed to export CSV:", err);
    }
  }

  return {
    data,
    isAcquiring,
    startListening,
    stopListening,
    clearData,
    exportToCSV
  };
});
