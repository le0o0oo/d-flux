import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// Types
export type DeviceInfo = {
  port: string;
  id: string;
  name?: string;
  org?: string;
  fw?: string;
  raw: Record<string, string>;
};

export type ScanProgress = {
  port: string;
  status: "scanning" | "found" | "timeout" | "error";
};

export type ScanConfig = {
  baudRate?: number;
  timeoutMs?: number;
  parallelism?: number;
  filter?: (info: DeviceInfo) => boolean;
};

// Public functions
export async function detectHC05(
  config: ScanConfig = {},
  onProgress?: (p: ScanProgress) => void
): Promise<DeviceInfo[]> {

  // MOCK IMPLEMENTATION
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    console.log("[MOCK] Starting mock scan...");
    
    const mockPorts = ["COM3", "COM4", "COM5"];
    
    // Simulate scanning progress
    for (const port of mockPorts) {
      if (onProgress) {
        onProgress({ port, status: "scanning" });
        await new Promise(r => setTimeout(r, 300)); // Simulate delay
        
        if (port === "COM4") {
            onProgress({ port, status: "found" });
        } else {
            onProgress({ port, status: "timeout" });
        }
      }
    }

    // Return mock results
    return [{
      port: "COM4",
      id: "MOCK_DEVICE_123",
      name: "HC-05 MOCK",
      org: "Mock Org",
      fw: "1.0",
      raw: {}
    }];
  }

  const {
    baudRate = 9600,
    timeoutMs = 400,
    parallelism = 4,
    filter,
  } = config;

  const unlisten = onProgress
    ? await listen<ScanProgress>("hc05-scan-progress", event => {
      onProgress(event.payload);
    })
    : null;

  try {
    const results = await invoke<DeviceInfo[]>("detect_hc05", {
      config: {
        baudRate,
        timeoutMs,
        parallelism,
      },
    });

    return filter ? results.filter(filter) : results;
  } finally {
    if (unlisten) {
      unlisten();
    }
  }
}
