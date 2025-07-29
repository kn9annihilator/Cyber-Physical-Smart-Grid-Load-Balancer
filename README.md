<div align="center">

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg) ![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white) ![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB) ![Node.js](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white) ![Arduino](https://img.shields.io/badge/-Arduino-00979D?style=for-the-badge&logo=Arduino&logoColor=white)

</div>

# Smart Socket Sentinel: A Cyber-Physical Smart Grid Load Balancer

## 1. Overview

Smart Socket Sentinel is an advanced energy management architecture designed to address critical inefficiencies and vulnerabilities in traditional power grids. By integrating AI-driven analytics, IoT-enabled automation, and adaptive control mechanisms, this project pioneers a self-regulating, high-efficiency power distribution network. It aims to mitigate challenges such as high transmission and distribution (T&D) losses, frequent overloads, and the lack of predictive management. The system provides real-time monitoring, intelligent load balancing, and predictive analytics to ensure a resilient, green, and sustainable energy infrastructure.

## 2. Key Features

- **Real-Time Power Monitoring**: Continuously tracks voltage, current, and power consumption for multiple circuits.
- **AI-Driven Predictive Analysis**: Utilizes machine learning models to forecast energy demand and predict potential overloads, enabling proactive adjustments.
- **Dynamic Load Balancing**: Autonomously redistributes power flow across circuits to prevent overloading and ensure grid stability.
- **Automated Circuit Isolation**: Rapidly detects and isolates faulty circuits using a 4-channel relay module, preventing cascading failures and minimizing downtime.
- **Remote Management Dashboard**: A web-based interface for real-time data visualization, system status monitoring, and manual control.
- **Environmental Data Integration**: Incorporates temperature and humidity data to analyze environmental impacts on power efficiency.
- **Robust Cybersecurity Framework**: Implements a multi-layered security approach to protect against various cyber threats.
- **Scalable and Modular Architecture**: Designed for flexible integration, from small-scale residential applications to large-scale industrial infrastructure.

## 3. System Architecture

The system operates by acquiring real-time data from power lines, processing it through a microcontroller and an IoT module, and presenting it on a user-facing dashboard. The core architecture is divided into hardware and software components that work in tandem.

**Data Flow:**
1.  **Sensing**: Voltage and AC Ampere sensors continuously monitor the electrical parameters of the main power line. The DHT11 sensor collects ambient environmental data.
2.  **Data Acquisition & Initial Processing**: An Arduino board collects raw data from all sensors.
3.  **Control & Communication**: The Arduino communicates with a NodeMCU ESP8266 via the UART protocol. The ESP8266 manages a 4-channel relay for circuit control (main vs. isolation) and transmits the processed data wirelessly.
4.  **Dashboard & Analytics**: A web-based dashboard receives the data, displaying it in real-time. It also runs AI-driven models to provide predictive insights and sends alerts to prevent system failures.


## 4. Technology Stack


### Hardware
| Component | Purpose |
| :--- | :--- |
| **Arduino** | Main controller for data acquisition from sensors. |
| **NodeMCU ESP8266** | Manages relay control and wireless data transmission. |
| **AC Voltage Sensor** | Measures input voltage. |
| **AC Ampere Sensor** | Measures current flow in each circuit. |
| **DHT11 Sensor** | Measures ambient temperature and humidity. |
| **4-Channel Relay Module** | Switches circuits for load balancing and isolation. |
| **Power Supply Modules** | Convert 220V AC to 5V DC for powering microcontrollers. |

### Software & Firmware
| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Firmware** | C/C++ (Arduino) | Code for Arduino and ESP8266 to read sensors and control relays. |
| **Frontend** | React, TypeScript | For building the user interface and dashboard. |
| **UI Components** | Custom Components | Reusable UI elements for the dashboard. |
| **State Management/Hooks** | React Hooks | `useMobile` for responsive design, `useToast` for notifications. |
| **Communication** | UART, Wi-Fi | Protocols for device-to-device and device-to-cloud communication. |
| **Data Handling** | API, Mock Data | For fetching and simulating power data. |
| **Prediction Engine** | Custom ML Model | A TypeScript-based module for load prediction. |

## 5. Project Structure
```js
Project/
├── arduino_code/
│   ├── socket_sentinel_arduino.ino
│   └── socket_sentinel_esp8266.ino
├── public/
│   ├── favicon.ico
│   └── robots.txt
└── src/
├── components/
│   └── ... (All UI related components)
├── hooks/
│   ├── useMobile.tsx
│   └── useToast.ts
└── lib/
├── api.ts
├── mockData.ts
├── prediction.ts
├── types.ts
└── utils.ts
```

## 6. Cybersecurity Framework

To ensure system integrity and security, a comprehensive cybersecurity framework is implemented, focusing on:

- **Secure Data Transmission**: End-to-end encryption using TLS/SSL and secure MQTT protocols to protect data in transit.
- **Network Protection**: Network segmentation using VLANs and a Zero Trust Architecture (ZTA) to isolate critical components.
- **Access Control**: Multi-Factor Authentication (MFA) and Role-Based Access Control (RBAC) to prevent unauthorized access.
- **Threat Prevention**: A Web Application Firewall (WAF) to defend against common web vulnerabilities (SQLi, XSS) and Al-driven DDoS mitigation strategies.
- **System Resilience**: Automated, encrypted backups and disaster recovery plans to ensure data integrity and system availability.

## 7. Getting Started

### Prerequisites

- Node.js and npm/yarn installed.
- Arduino IDE installed.
- Required Arduino libraries (e.g., for ESP8266, DHT sensor).

### Hardware Setup

1.  Assemble the hardware components according to the system architecture diagram.
2.  Connect the Arduino to your computer.

### Firmware Installation

1.  Open `socket_sentinel_arduino.ino` in the Arduino IDE, select the correct board and port, and upload the code.
2.  Open `socket_sentinel_esp8266.ino`, configure Wi-Fi credentials, select the NodeMCU board, and upload the code.

### Frontend Setup

1.  Navigate to the project's root directory.
2.  Install the necessary dependencies:
    ```bash
    npm install
    ```
3.  Run the development server:
    ```bash
    npm start
    ```
4.  Open your browser and navigate to `http://localhost:3000` to view the dashboard.

## 8. Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 9. License

This project is distributed under the MIT License. See `LICENSE.txt` for more information.

## 10. Connect with Me
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/krishnanarula/)

