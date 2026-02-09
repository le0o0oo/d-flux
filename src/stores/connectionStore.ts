import { defineStore } from "pinia";
import type { DeviceInfo } from "@/utils/connectionUtils";
import { serialService } from "@/services/SerialService";
import { useMeasurementStore } from "./measurementStore";
import { SerialCommandType } from "@/services/ProtocolParser";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

export const useConnectionStore = defineStore("connection", {
  state: () => ({
    currentDevice: null as DeviceInfo | null,
    status: "idle" as ConnectionStatus,
    lastError: null as string | null,
  }),
  getters: {
    isConnected: (state) => state.status === "connected",
    isConnecting: (state) => state.status === "connecting",
  },
  actions: {
    async connectToDevice(device: DeviceInfo): Promise<void> {
      if (this.status === "connecting") return;

      this.status = "connecting";
      this.lastError = null;
      this.currentDevice = device;

      const measurementStore = useMeasurementStore();

      try {
        await serialService.connect(device);

        // Setup listeners
        serialService.on('error', (err: any) => {
          console.error("Serial error:", err);
          this.status = "error";
          this.lastError = String(err);
        });

        serialService.on('disconnected', () => {
          this.status = "idle";
          measurementStore.stopListening();
        });

        // Start listening for measurements immediately
        measurementStore.startListening();

        this.status = "connected";
      } catch (err) {
        this.currentDevice = null;
        this.status = "error";
        this.lastError = err instanceof Error ? err.message : String(err);
        throw err;
      }
    },

    async disconnect(): Promise<void> {
      const measurementStore = useMeasurementStore();
      measurementStore.stopListening();

      try {
        await serialService.disconnect();
      } finally {
        this.currentDevice = null;
        this.lastError = null;
        this.status = "idle";
      }
    },

    async sendCommand(type: SerialCommandType, payload?: string) {
      if (!this.isConnected) return;
      const message = `${type}${payload ? ' ' + payload : ''}\n`;
      await serialService.write(message);
    }
  },
});
