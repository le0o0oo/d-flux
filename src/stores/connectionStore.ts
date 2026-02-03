import { defineStore } from "pinia";
import {
  checkPermissions,
  connect,
  disconnect,
  getAdapterState,
  getConnectionUpdates,
  getScanningUpdates,
  readString,
  startScan,
  stopScan,
  type AdapterState,
  type BleDevice,
} from "@mnlphlp/plugin-blec";

export const useConnectionStore = defineStore("connection", {
  state: () => ({
    currentState: "disabled" as "disabled" | "scanning" | "connected",
    adapterState: "Unknown" as AdapterState,
    scanning: false,
    connected: false,
    devices: [] as BleDevice[],
    selectedAddress: null as string | null,
    connectedName: null as string | null,
    lastError: null as string | null,
    initialized: false,
  }),
  getters: {
    isScanning: (state) => state.currentState === "scanning",
    isConnected: (state) => state.currentState === "connected",
  },
  actions: {
    async initialize() {
      if (this.initialized) return;
      this.initialized = true;

      try {
        this.lastError = null;
        await checkPermissions(true);
        this.adapterState = await getAdapterState();

        await getScanningUpdates((scanning) => {
          this.scanning = scanning;
          if (scanning) {
            this.currentState = "scanning";
          } else if (!this.connected) {
            this.currentState = "disabled";
          }
        });

        await getConnectionUpdates((connected) => {
          this.connected = connected;
          this.currentState = connected
            ? "connected"
            : this.scanning
            ? "scanning"
            : "disabled";
          if (!connected) {
            this.selectedAddress = null;
            this.connectedName = null;
          }
        });
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : String(error);
      }
    },
    async refreshAdapterState() {
      try {
        this.adapterState = await getAdapterState();
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : String(error);
      }
    },
    async startScan() {
      try {
        await this.initialize();
        this.lastError = null;
        this.devices = [];
        this.currentState = "scanning";
        await startScan((devices) => {
          this.devices = devices;
        }, 8000);
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : String(error);
        this.currentState = this.connected ? "connected" : "disabled";
      }
    },
    async stopScan() {
      try {
        await stopScan();
        this.scanning = false;
        if (!this.connected) {
          this.currentState = "disabled";
        }
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : String(error);
      }
    },
    async connectToDevice(address: string) {
      try {
        this.lastError = null;
        await this.stopScan();
        await connect(address, () => {
          this.connected = false;
          this.currentState = "disabled";
          this.selectedAddress = null;
          this.connectedName = null;
        });
        this.selectedAddress = address;
        this.connected = true;
        this.currentState = "connected";

        const knownName = this.devices.find(
          (device) => device.address === address
        )?.name;
        if (knownName) {
          this.connectedName = knownName;
        }

        try {
          const deviceName = await readString(
            "00002a00-0000-1000-8000-00805f9b34fb",
            "00001800-0000-1000-8000-00805f9b34fb"
          );
          if (deviceName) {
            this.connectedName = deviceName;
            this.devices = this.devices.map((device) =>
              device.address === address
                ? { ...device, name: deviceName }
                : device
            );
          }
        } catch {
          // Some devices don't expose the Device Name characteristic.
        }
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : String(error);
      }
    },
    async disconnectFromDevice() {
      try {
        this.lastError = null;
        await disconnect();
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : String(error);
      } finally {
        this.connected = false;
        this.currentState = "disabled";
        this.selectedAddress = null;
      }
    },
  },
});
