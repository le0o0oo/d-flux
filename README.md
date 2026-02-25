# D Flux

This repository contains the full D Flux stack in a single monorepo:

- **`client/`**: Tauri 2 + Vue 3 application for BLE acquisition, GPS enrichment, analysis, and export.
- **`firmware/`**: ESP32 PlatformIO firmware for SCD30 sensing, BLE communication, and probe control.

## Repository Layout

```text
.
├── client/    # Desktop/mobile app (Tauri + Vue)
├── firmware/  # ESP32 firmware (PlatformIO)
└── README.md  # You are here
```

## Documentation

- Client setup, architecture, and usage: [client/README.md](client/README.md)
- Firmware build, flashing, and protocol details: [firmware/README.md](firmware/README.md)

## Quick Start

### 1) Client

See [client/README.md](client/README.md) for full instructions.

Typical flow:

```bash
cd client
pnpm install
pnpm tauri dev
```

### 2) Firmware

See [firmware/README.md](firmware/README.md) for full instructions.

Typical flow:

```bash
cd firmware
pio run
pio run --target upload
```

## Download Builds

Prebuilt desktop and Android artifacts are published on the repository release page:

- [GitHub Releases](https://github.com/le0o0oo/testing-app/releases)

## BLE Compatibility

The client and firmware must share the same BLE service and characteristic UUIDs. If you change UUIDs in firmware, update the client accordingly.

## License

MIT License. See each package for details where applicable.
