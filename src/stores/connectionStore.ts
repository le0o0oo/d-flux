import { defineStore } from "pinia";
import { useMeasurementStore } from "./measurementStore";
import { ProtocolCommandType } from "@/services/ProtocolParser";
import { getTransport } from "@/services/transport";
import type { BleDevice } from "@/services/transport";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

type ConnectableDevice = BleDevice & {
  macAddress?: string;
  deviceId?: string;
};

type ConnectedDevice = {
  name?: string;
  port: string;
  address: string;
  id?: string;
  raw?: Record<string, unknown>;
};

function resolveAddress(device: ConnectableDevice): string {
  return (device.address || device.macAddress || device.deviceId || "").trim();
}

function toConnectedDevice(
  device: ConnectableDevice,
  fallbackAddress: string
): ConnectedDevice {
  return {
    name: device.name || "BLE device",
    port: fallbackAddress,
    address: fallbackAddress,
    id: device.address,
    raw: {
      isBonded: device.isBonded,
      serviceData: device.serviceData,
      manufacturerData: device.manufacturerData,
      rssi: device.rssi,
    },
  };
}

export const useConnectionStore = defineStore("connection", {
  state: () => ({
    currentDevice: null as ConnectedDevice | null,
    status: "idle" as ConnectionStatus,
    lastError: null as string | null,
    lastDisconnectMessage: null as string | null,
    lastDisconnectAt: null as number | null,
    manualDisconnectRequested: false,
    console: [] as string[],
    rxBuffer: "",
  }),
  getters: {
    isConnected: (state) => state.status === "connected",
    isConnecting: (state) => state.status === "connecting",
    hasUnexpectedDisconnect: (state) =>
      !!state.lastDisconnectMessage && !state.manualDisconnectRequested,
  },
  actions: {
    handleIncomingData(chunk: string) {
      const measurementStore = useMeasurementStore();
      this.rxBuffer += chunk;

      const normalized = this.rxBuffer
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");
      const lines = normalized.split("\n");
      this.rxBuffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        this.console.push(trimmed);
        measurementStore.ingestLine(trimmed);
      }
    },

    async connectToDevice(device: ConnectableDevice): Promise<void> {
      if (this.status === "connecting") return;

      const address = resolveAddress(device);
      if (!address) {
        this.status = "error";
        this.lastError = "Invalid BLE address";
        throw new Error("Invalid BLE address");
      }

      this.status = "connecting";
      this.lastError = null;
      this.lastDisconnectMessage = null;
      this.lastDisconnectAt = null;
      this.manualDisconnectRequested = false;
      this.currentDevice = toConnectedDevice(device, address);
      this.rxBuffer = "";

      const measurementStore = useMeasurementStore();
      if (this.currentDevice.name) {
        measurementStore.setSensorName(this.currentDevice.name);
      }

      try {
        await getTransport().connect({
          address,
          deviceName: this.currentDevice.name,
          onDisconnect: () => void this.handleBleDisconnected(false),
          onData: (chunk) => this.handleIncomingData(chunk),
        });
        this.status = "connected";
      } catch (err) {
        this.currentDevice = null;
        this.status = "error";
        this.lastError = err instanceof Error ? err.message : String(err);
        this.rxBuffer = "";
        throw err;
      }
    },

    async handleBleDisconnected(triggeredByManualAction: boolean) {
      const measurementStore = useMeasurementStore();
      const wasConnected =
        this.status === "connected" || this.status === "connecting";
      const wasManual =
        triggeredByManualAction || this.manualDisconnectRequested;

      if (!wasConnected && !this.currentDevice) return;

      this.status = "idle";
      this.currentDevice = null;
      this.lastError = null;
      this.lastDisconnectAt = Date.now();
      this.rxBuffer = "";

      if (wasConnected && !wasManual) {
        this.lastDisconnectMessage = "Device disconnected unexpectedly";
      } else if (wasManual) {
        this.lastDisconnectMessage = null;
      }

      this.manualDisconnectRequested = false;
      void measurementStore.backupOnDisconnect();
    },

    async disconnect(): Promise<void> {
      this.manualDisconnectRequested = true;

      try {
        await getTransport().disconnect();
      } finally {
        await this.handleBleDisconnected(true);
      }
    },

    async sendCommand(type: ProtocolCommandType, payload?: string) {
      if (!this.isConnected) return;
      const message = `${type}${payload ? " " + payload : ""}`;
      await this.sendRaw(message);

      const measurementStore = useMeasurementStore();
      if (type === ProtocolCommandType.START_ACQUISITION) {
        measurementStore.markAcquisitionStarted();
      } else if (type === ProtocolCommandType.STOP_ACQUISITION) {
        await measurementStore.markAcquisitionStopped();
      }
    },

    async sendRaw(message: string, appendNewline = true) {
      if (!this.isConnected) return;
      const payload = appendNewline ? `${message}\n` : message;
      this.console.push(`TX: ${message}`);
      await getTransport().send(payload);
    },

    clearConsole() {
      this.console = [];
    },
  },
});
