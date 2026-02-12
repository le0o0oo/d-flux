import { defineStore } from "pinia";
import { useMeasurementStore } from "./measurementStore";
import { ProtocolCommandType } from "@/services/ProtocolParser";
import {
  connect as bleConnect,
  disconnect as bleDisconnect,
  getConnectionUpdates,
  listServices,
  sendString,
  subscribeString,
  unsubscribe,
  type BleDevice,
  type BleService,
} from "@mnlphlp/plugin-blec";

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

type CharacteristicRef = {
  characteristic: string;
  service?: string;
};

const REQUIRED_SERVICE_UUID = "db594551-159c-4da8-b59e-1c98587348e1";
const PROP_WRITE = 0x08;
const PROP_WRITE_WITHOUT_RESPONSE = 0x04;
const PROP_NOTIFY = 0x10;
const PROP_INDICATE = 0x20;

function normalizeUuid(value: string): string {
  return value.trim().toLowerCase();
}

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

function hasAnyProperty(value: number, flags: number[]): boolean {
  return flags.some((flag) => (value & flag) === flag);
}

function resolveCharacteristics(services: BleService[]): {
  write: CharacteristicRef | null;
  notify: CharacteristicRef | null;
} {
  let write: CharacteristicRef | null = null;
  let notify: CharacteristicRef | null = null;

  const normalizedRequiredService = normalizeUuid(REQUIRED_SERVICE_UUID);

  // Only look at the target service
  const targetService = services.find(
    (s) => normalizeUuid(s.uuid) === normalizedRequiredService
  );

  if (!targetService) return { write, notify };

  for (const characteristic of targetService.characteristics) {
    if (
      !notify &&
      hasAnyProperty(characteristic.properties, [PROP_NOTIFY, PROP_INDICATE])
    ) {
      notify = {
        characteristic: characteristic.uuid,
        service: targetService.uuid,
      };
    }

    if (
      !write &&
      hasAnyProperty(characteristic.properties, [
        PROP_WRITE,
        PROP_WRITE_WITHOUT_RESPONSE,
      ])
    ) {
      write = {
        characteristic: characteristic.uuid,
        service: targetService.uuid,
      };
    }
  }

  return { write, notify };
}

export const useConnectionStore = defineStore("connection", {
  state: () => ({
    currentDevice: null as ConnectedDevice | null,
    status: "idle" as ConnectionStatus,
    lastError: null as string | null,
    lastDisconnectMessage: null as string | null,
    lastDisconnectAt: null as number | null,
    manualDisconnectRequested: false,
    listenersBound: false,
    console: [] as string[],
    rxBuffer: "",
    writeRef: null as CharacteristicRef | null,
    notifyRef: null as CharacteristicRef | null,
  }),
  getters: {
    isConnected: (state) => state.status === "connected",
    isConnecting: (state) => state.status === "connecting",
    hasUnexpectedDisconnect: (state) =>
      !!state.lastDisconnectMessage && !state.manualDisconnectRequested,
  },
  actions: {
    async bindBleListeners() {
      if (this.listenersBound) return;
      this.listenersBound = true;

      await getConnectionUpdates((connected) => {
        if (connected) return;
        void this.handleBleDisconnected(false);
      });
    },

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
      await this.bindBleListeners();

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
      this.writeRef = null;
      this.notifyRef = null;
      this.rxBuffer = "";

      const measurementStore = useMeasurementStore();
      if (this.currentDevice.name) {
        measurementStore.setSensorName(this.currentDevice.name);
      }

      try {
        await bleConnect(address, () => {
          void this.handleBleDisconnected(false);
        });

        const servicesResult = await listServices(address);
        const services = Array.isArray(servicesResult) ? servicesResult : [];
        const { write, notify } = resolveCharacteristics(services);
        if (!write || !notify) {
          throw new Error("Unable to find BLE read/write characteristics");
        }

        this.writeRef = write;
        this.notifyRef = notify;

        await subscribeString(this.notifyRef.characteristic, (data: string) => {
          this.handleIncomingData(data);
        });

        this.status = "connected";
      } catch (err) {
        this.currentDevice = null;
        this.status = "error";
        this.lastError = err instanceof Error ? err.message : String(err);
        this.writeRef = null;
        this.notifyRef = null;
        this.rxBuffer = "";
        try {
          await bleDisconnect();
        } catch {
          // ignore cleanup errors from failed connect attempts
        }
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
      this.writeRef = null;
      this.notifyRef = null;
      this.rxBuffer = "";

      if (wasConnected && !wasManual) {
        this.lastDisconnectMessage = "Dispositivo disconnesso inaspettatamente";
      } else if (wasManual) {
        this.lastDisconnectMessage = null;
      }

      this.manualDisconnectRequested = false;
      void measurementStore.backupOnDisconnect();
    },

    async disconnect(): Promise<void> {
      this.manualDisconnectRequested = true;

      try {
        if (this.notifyRef?.characteristic) {
          await unsubscribe(this.notifyRef.characteristic);
        }
      } catch {
        // best-effort unsubscribe
      }

      try {
        await bleDisconnect();
      } finally {
        await this.handleBleDisconnected(true);
      }
    },

    async sendCommand(type: ProtocolCommandType, payload?: string) {
      if (!this.isConnected || !this.writeRef) return;
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
      if (!this.isConnected || !this.writeRef) return;
      const payload = appendNewline ? `${message}\n` : message;
      this.console.push(`TX: ${message}`);
      await sendString(
        this.writeRef.characteristic,
        payload,
        "withoutResponse"
      );
    },

    clearConsole() {
      this.console = [];
    },
  },
});
