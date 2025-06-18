import { SocketData, SystemStatus, PowerPrediction, AppState } from './types';

// Generate random number between min and max
const randomBetween = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
};

// Generate socket data
export const generateMockSocketData = (socketId: number): SocketData => {
  const voltage = randomBetween(210, 240);
  const current = randomBetween(0.1, 5);
  const power = voltage * current;
  
  return {
    id: socketId,
    name: `Socket ${socketId}`,
    status: Math.random() > 0.2,
    voltage,
    current,
    power,
    isActive: Math.random() > 0.3
  };
};

// Generate system status
export const generateMockSystemStatus = (): SystemStatus => {
  return {
    isConnected: true,
    isIsolated: false,
    isolationReason: null,
    isCommunicationBlocked: false,
    lastUpdated: new Date().toISOString(),
    ipAddress: "192.168.206.239",
    totalPower: randomBetween(100, 1500),
    abnormalDetected: false
  };
};

// Generate power history data
export const generateMockPowerHistory = (count: number) => {
  const history = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now.getTime() - (count - i) * 60000).toISOString();
    const socket1 = randomBetween(50, 300);
    const socket2 = randomBetween(100, 400);
    const socket3 = randomBetween(80, 350);
    const total = socket1 + socket2 + socket3;
    
    history.push({
      timestamp,
      total,
      socket1,
      socket2,
      socket3
    });
  }
  
  return history;
};

// Generate power predictions
export const generateMockPredictions = (count: number) => {
  const predictions: PowerPrediction[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now.getTime() + i * 60000).toISOString();
    predictions.push({
      timestamp,
      predicted: randomBetween(500, 1200),
      actual: i === 0 ? randomBetween(500, 1200) : undefined
    });
  }
  
  return predictions;
};

// Generate complete mock app state
export const generateMockAppState = (): AppState => {
  return {
    sockets: [1, 2, 3].map(id => generateMockSocketData(id)),
    systemStatus: generateMockSystemStatus(),
    powerHistory: generateMockPowerHistory(60),
    predictions: generateMockPredictions(12),
    alerts: [],
    config: {
      adminPassword: "admin123",
      allowedIPs: ["192.168.1.100", "127.0.0.1"],
      highPowerThreshold: 1000,
      autoLoadBalance: true,
      predictionEnabled: true,
      mockDataEnabled: true
    }
  };
};
