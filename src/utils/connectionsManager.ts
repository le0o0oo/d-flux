import { type DeviceInfo } from "./connectionUtils";
import { SerialPort } from "tauri-plugin-serialplugin-api";

export enum EventType {
  WHOIS = "WHOIS",
  DATA = "DATA",
  ACQUISITION_STATE = "ACQUISITION_STATE",
}
export enum CommandType {
  START_ACQUISITION = "START_ACQUISITION",
  STOP_ACQUISITION = "STOP_ACQUISITION",
  GET_ACQUISITION_STATE = "GET_ACQUISITION_STATE",
}
const connections: Connection[] = []

class Connection {
  private readonly device: DeviceInfo;
  private readonly port: SerialPort;

  private eventListeners: Map<EventType, ((payload: string) => void)[]> = new Map();
  private unsubscribe?: () => void;

  public constructor(device: DeviceInfo, port: SerialPort) {
    this.device = device;
    this.port = port;
  }

  public async init(): Promise<void> {
    await this.port.startListening();

    this.unsubscribe = await this.port.listen((data: string) => {
      this.onDataReceived(data);
    });
  }

  public async dispose(): Promise<void> {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }

  public async sendMessage(
    type: CommandType,
    payload?: string
  ): Promise<void> {
    await this.port.write(`${type}\n`);
    if (payload) await this.port.write(`${payload}\n`);
  }

  public on(event: EventType, callback: (payload: string) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);
  }

  private onDataReceived(data: string): void {
    const event = data.split(" ")[0];
    const payload = data.split(" ")[1];
    //console.log(data)
    //console.log("event ", event, " payload ", payload)
    this.eventListeners.get(event as EventType)?.forEach(callback => callback(payload));
  }
}


export async function startConnection(device: DeviceInfo): Promise<Connection> {
  const port = new SerialPort({
    path: device.port,
    baudRate: 9600
  });
  await port.open();
  const connection = new Connection(device, port);
  await connection.init();
  connections.push(connection);
  return connection;
}

export { type Connection };
