import { defineStore } from "pinia";
import type { DeviceInfo } from "@/utils/connectionUtils";
import { serialService } from "@/services/SerialService";
import { useMeasurementStore } from "./measurementStore";
import { SerialCommandType } from "@/services/ProtocolParser";
import { ref } from "vue";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "error";


export const useConnectionStore = defineStore("connection", {
  state: () => ({
    currentDevice: null as DeviceInfo | null,
    status: "idle" as ConnectionStatus,
    lastError: null as string | null,
    lastDisconnectMessage: null as string | null,
    lastDisconnectAt: null as number | null,
    manualDisconnectRequested: false,
    listenersBound: false,

    console: ref<string[]>([])
  }),
  getters: {
    isConnected: (state) => state.status === "connected",
    isConnecting: (state) => state.status === "connecting",
    hasUnexpectedDisconnect: (state) =>
      !!state.lastDisconnectMessage && !state.manualDisconnectRequested,
  },
  actions: {
    bindSerialListeners() {
      if (this.listenersBound) return;
      this.listenersBound = true;

      serialService.on("error", (err: any) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Serial error:", err);
        this.status = "error";
        this.lastError = message;
      });

      serialService.on("disconnected", () => {
        const measurementStore = useMeasurementStore();
        const wasConnected = this.status === "connected" || this.status === "connecting";
        const wasManual = this.manualDisconnectRequested;

        this.status = "idle";
        this.currentDevice = null;
        this.lastError = null;
        this.lastDisconnectAt = Date.now();

        if (wasConnected && !wasManual) {
          this.lastDisconnectMessage = "Dispositivo disconnesso inaspettatamente";
        } else if (wasManual) {
          this.lastDisconnectMessage = null;
        }

        this.manualDisconnectRequested = false;
        measurementStore.stopListening();
        void measurementStore.backupOnDisconnect();
      });

      serialService.on("data", (data: string) => {
        this.console.push(data);
      });
    },

    async connectToDevice(device: DeviceInfo): Promise<void> {
      if (this.status === "connecting") return;
      this.bindSerialListeners();

      this.status = "connecting";
      this.lastError = null;
      this.lastDisconnectMessage = null;
      this.lastDisconnectAt = null;
      this.manualDisconnectRequested = false;
      this.currentDevice = device;

      const measurementStore = useMeasurementStore();
      if (device.name) {
        measurementStore.setSensorName(device.name);
      }

      try {
        await serialService.connect(device);

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
      this.manualDisconnectRequested = true;

      try {
        await serialService.disconnect();
      } finally {
        this.currentDevice = null;
        this.lastError = null;
        this.manualDisconnectRequested = false;
        this.status = "idle";
      }
    },

    async sendCommand(type: SerialCommandType, payload?: string) {
      if (!this.isConnected) return;
      const message = `${type}${payload ? ' ' + payload : ''}\n`;
      this.console.push(`TX: ${message}`);
      await serialService.write(message);
    },

    async sendRaw(message: string, appendNewline = true) {
      if (!this.isConnected) return;
      const payload = appendNewline ? `${message}\n` : message;
      this.console.push(`TX: ${message}`);
      await serialService.write(payload);
    },

    clearConsole() {
      this.console = [];
    }
  },
});
