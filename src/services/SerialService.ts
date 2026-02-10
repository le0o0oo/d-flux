import { SerialPort } from "tauri-plugin-serialplugin-api";
import { type DeviceInfo } from "@/utils/connectionUtils";

type SerialEventType = 'data' | 'connected' | 'disconnected' | 'error';
type SerialEventHandler = (...args: any[]) => void;

// Transport layer
export class SerialService {
  private port: SerialPort | null = null;
  private listeners: Map<SerialEventType, SerialEventHandler[]> = new Map();
  private buffer: string = "";
  private stopListening: (() => void) | null = null;

  // Singleton instance if needed, but for now exporting the class and a shared instance

  /**
   * Connects to a serial device.
   * @param device The device to connect to.
   * @param baudRate The baud rate (default 9600).
   */
  async connect(device: DeviceInfo, baudRate: number = 9600): Promise<void> {
    await this.disconnect(); // Ensure any existing connection is closed

    try {
      this.port = new SerialPort({ path: device.port, baudRate });
      await this.port.open();

      // Start listening for data
      await this.port.startListening();
      this.stopListening = await this.port.listen((data: string) => {
        if (typeof data !== "string") {
          this.handleTransportFailure(new Error("Received invalid serial payload type"));
          return;
        }

        try {
          this.handleData(data);
        } catch (error) {
          this.handleTransportFailure(error);
        }
      });

      this.emit('connected');
      console.log(`Connected to ${device.port} at ${baudRate}`);
    } catch (error) {
      console.error("Failed to connect:", error);
      this.emit('error', error);
      // Clean up if connection failed halfway
      await this.disconnect();
      throw error;
    }
  }

  /**
   * Disconnects the current session.
   */
  async disconnect(): Promise<void> {
    if (this.stopListening) {
      this.stopListening();
      this.stopListening = null;
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch (error) {
        console.warn("Error closing port (might be already closed):", error);
      }
      this.port = null;
      this.emit('disconnected');
    }

    this.buffer = ""; // Clear buffer
  }

  /**
   * Sends data to the serial port.
   * Appends a newline character automatically if configured (optional).
   */
  async write(data: string): Promise<void> {
    if (!this.port) {
      throw new Error("SerialService: Not connected");
    }
    try {
      await this.port.write(data);
    } catch (error) {
      this.handleTransportFailure(error);
      throw error;
    }
  }

  /**
   * Subscribes to an event.
   */
  on(event: SerialEventType, callback: SerialEventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  /**
   * Unsubscribes from an event.
   */
  off(event: SerialEventType, callback: SerialEventHandler): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      this.listeners.set(event, callbacks.filter(cb => cb !== callback));
    }
  }

  /**
   * Handles incoming raw data chunks, buffering and splitting by newline.
   */
  private handleData(chunk: string): void {
    this.buffer += chunk;

    // Check if we have complete lines
    if (this.buffer.includes('\n')) {
      const lines = this.buffer.split('\n');

      // The last element is either empty (if ended with \n) or an incomplete chunk
      // We keep it in the buffer
      this.buffer = lines.pop() || "";

      for (const line of lines) {
        // Trim carriage returns if present
        const cleanLine = line.replace(/\r$/, "");
        if (cleanLine.trim().length > 0) {
          this.emit('data', cleanLine);
        }
      }
    }
  }

  private emit(event: SerialEventType, ...args: any[]): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(...args);
      } catch (err) {
        console.error(`Error in serial listener for ${event}:`, err);
      }
    });
  }

  private handleTransportFailure(error: unknown): void {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    console.error("Serial transport failure:", normalizedError);
    this.emit("error", normalizedError);
    void this.disconnect();
  }

  /**
   * Checks if currently connected.
   */
  isConnected(): boolean {
    return !!this.port;
  }
}

// export const serialService = new MockSerialService();

export class MockSerialService {
  private listeners: Map<SerialEventType, SerialEventHandler[]> = new Map();
  private timer: any = null;
  private connected = false;

  async connect(device: DeviceInfo, baudRate: number = 9600): Promise<void> {
    console.log(`[MOCK] Connecting to ${device.port}...`);
    // Simulate connection delay
    await new Promise(r => setTimeout(r, 1000));
    this.connected = true;
    this.emit('connected');
    
    // Simulate initial handshake / state
    setTimeout(() => {
        this.emit('data', 'ACQUISITION_STATE 0');
    }, 500);
  }

  async disconnect(): Promise<void> {
    this.stopMockData();
    this.connected = false;
    this.emit('disconnected');
    console.log("[MOCK] Disconnected");
  }

  async write(data: string): Promise<void> {
    const trimmed = data.trim();
    console.log(`[MOCK] Wrote: ${trimmed}`);
    
    // Simple command handling simulation
    if (trimmed.startsWith('START_ACQUISITION')) {
        this.startMockData();
        this.emit('data', 'ACQUISITION_STATE 1');
    } else if (trimmed.startsWith('STOP_ACQUISITION')) {
        this.stopMockData();
        this.emit('data', 'ACQUISITION_STATE 0');
    } else if (trimmed.startsWith('GET_ACQUISITION_STATE')) {
        // Reply with current state
        this.emit('data', `ACQUISITION_STATE ${this.timer ? 1 : 0}`);
    }
  }

  on(event: SerialEventType, callback: SerialEventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  off(event: SerialEventType, callback: SerialEventHandler): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      this.listeners.set(event, callbacks.filter(cb => cb !== callback));
    }
  }

  isConnected(): boolean {
      return this.connected;
  }

  private emit(event: SerialEventType, ...args: any[]): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(...args);
      } catch (err) {
        console.error(`Error in mock listener for ${event}:`, err);
      }
    });
  }

  private startMockData() {
    if (this.timer) return;
    console.log("[MOCK] Starting data stream...");
    
    this.timer = setInterval(() => {
        // Generate random realistic data
        // CO2: 400-450 ppm
        // Temp: 22-24 C
        // Hum: 40-45 %
        const co2 = (400 + Math.random() * 50).toFixed(1);
        const temp = (22 + Math.random() * 2).toFixed(1);
        const hum = (40 + Math.random() * 5).toFixed(1);
        
        // Protocol format: "DATA key=value;key=value..."
        const payload = `DATA CO2=${co2};TMP=${temp};HUM=${hum}`;
        this.emit('data', payload);
    }, 1000);
  }

  private stopMockData() {
    if (this.timer) {
      console.log("[MOCK] Stopping data stream...");
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

// Toggle this to use Real or Mock service
// export const serialService = new SerialService();
// export const serialService = new MockSerialService() as unknown as SerialService;

// Use environment variable to switch
export const serialService = import.meta.env.VITE_USE_MOCK === 'true' 
  ? new MockSerialService() as unknown as SerialService
  : new SerialService();
