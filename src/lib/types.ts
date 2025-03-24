
// Socket/Relay related types
export interface SocketData {
  id: number;
  name: string;
  status: boolean;
  voltage: number;
  current: number;
  power: number;
  isActive: boolean;
}

export interface SystemStatus {
  isConnected: boolean;
  isIsolated: boolean;
  isolationReason: string | null;
  isCommunicationBlocked: boolean;
  lastUpdated: string;
  ipAddress: string;
  totalPower: number;
  abnormalDetected: boolean;
}

export interface PowerPrediction {
  timestamp: string;
  predicted: number;
  actual?: number;
}

export interface AlertMessage {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  message: string;
  timestamp: string;
  acknowledged?: boolean;
}

export interface AppConfig {
  adminPassword: string;
  allowedIPs: string[];
  highPowerThreshold: number;
  autoLoadBalance: boolean;
  predictionEnabled: boolean;
  mockDataEnabled: boolean;
}

// Load balancing settings
export interface LoadBalancingConfig {
  enabled: boolean;
  threshold: number;
  minimumLoad: number;
}

// Dashboard data state
export interface AppState {
  sockets: SocketData[];
  systemStatus: SystemStatus;
  powerHistory: {
    timestamp: string;
    total: number;
    socket1: number;
    socket2: number;
    socket3: number;
  }[];
  predictions: PowerPrediction[];
  alerts: AlertMessage[];
  config: AppConfig;
}
