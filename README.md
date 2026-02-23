# D Flux

A cross-platform application for acquiring and analyzing environmental data from ESP32 microcontrollers equipped with CO₂ sensors (SCD30) via Bluetooth Low Energy (BLE).

## Overview

This project consists of two main components:

- **ESP32 Firmware**: Reads environmental data (CO₂, temperature, humidity) from SCD30 sensor and exposes it via BLE
- **Desktop/Mobile Application**: Built with Tauri 2 + Vue 3, connects to ESP32, receives real-time data, enriches with GPS coordinates, and provides data analysis capabilities

## Features

### Core Functionality

- **BLE Device Scanning**: Automatically discovers compatible ESP32 devices
- **Real-time Data Acquisition**: Receives CO₂ concentration, temperature, and relative humidity data
- **GPS Integration**: Automatically enriches data with GPS coordinates on mobile devices
- **Data Export**: Export acquisition sessions to CSV format for further analysis
- **Data Analysis**: Perform linear regression analysis with slope and R² calculations
- **Mapping**: Visualize measurement locations on an interactive map powered by Leaflet
- **Console**: Send raw commands to ESP32 devices for advanced control

### Technical Architecture

#### ESP32 Firmware

- **Sensor**: Adafruit SCD30 for CO₂, temperature, and humidity measurements
- **BLE Stack**: NimBLE-Arduino for BLE server functionality
- **Framework**: Arduino framework for main loop and GPIO control

#### BLE GATT Design

- **Service UUID**: `DB594551-159C-4DA8-B59E-1C98587348E1`
- **RX Characteristic** (App → ESP32): `7B6B12CD-CA54-46A6-B3F4-3A848A3ED00B` (WRITE | WRITE_NR)
- **TX Characteristic** (ESP32 → App): `907BAC5D-92ED-4D90-905E-A3A7B9899F21` (READ | NOTIFY)

#### Communication Protocol

The application uses a simple line-based text protocol:

```
HEADER PAYLOAD\n
```

**Examples:**

- ESP32 → App: `DATA CO2=400.12;TMP=24.50;HUM=40.10`
- ESP32 → App: `WHOIS ID=ESP32_01;ORG=INGV;FW=1.0`
- App → ESP32: `START_ACQUISITION`
- App → ESP32: `STOP_ACQUISITION`

## Installation

### Prerequisites

- Node.js (v18 or higher)
- pnpm package manager
- Rust and Cargo (for Tauri)

### Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd testing-app
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:

```bash
cp example.env .env
# Edit .env with your configuration
```

## Development

### Running the Application

```bash
# Development mode
pnpm dev

# Build for production
pnpm build

# Android build
pnpm android-build
```

### Tauri Commands

```bash
# Tauri development
pnpm tauri dev

# Tauri build
pnpm tauri build
```

## Application Structure

### Frontend (Vue 3 + TypeScript)

- **Components**: Modular Vue components for different views and functionality
- **Composables**: Reusable composition functions for BLE scanning and data handling
- **State Management**: Pinia for application state management
- **UI Framework**: TailwindCSS with custom components

### Key Views

- **Dashboard**: Main interface for device connection and data visualization
- **Analyze**: Data analysis tools with regression calculations
- **Map**: Interactive map showing measurement locations
- **Console**: Raw command interface for ESP32 communication

## Data Export

The application exports data in CSV format:

- **Session Data**: Complete acquisition sessions with timestamps and sensor readings
- **Flux Data**: Analysis results including slope and R² values saved to `flux_data.csv`
- **GPS Data**: Location coordinates for mapping functionality

## BLE Device Identification

ESP32 devices include metadata in advertising packets:

- Format: Manufacturer Specific Data with key-value pairs
- Example: `ID=ESP32_01;ORG=INGV;FW=1.0`
- Enables device identification without connection

## Development Notes

### Icon Management

To update the application icon:

1. Place `app-icon.png` at the project root
2. Run: `pnpm tauri icon`

### Android Development

For Android emulator testing:

```bash
~/Android/Sdk/emulator/emulator -avd Medium_Phone_API_36.1
```

## Technology Stack

### Frontend

- **Vue 3** with Composition API and `<script setup>`
- **TypeScript** for type safety
- **TailwindCSS** for styling
- **Pinia** for state management
- **Leaflet** for mapping functionality
- **PapaParse** for CSV handling

### Backend (Tauri)

- **Rust** for native performance
- **Tauri 2** for cross-platform deployment
- **BLE Plugin** for Bluetooth communication
- **Geolocation Plugin** for GPS functionality
- **File System Plugin** for data export

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[MIT License](LICENSE)
