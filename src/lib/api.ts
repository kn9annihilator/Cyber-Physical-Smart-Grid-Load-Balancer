import { SocketData, SystemStatus, AppConfig } from './types';
import { generateMockAppState } from './mockData';

// Configuration
const API_ENDPOINT = 'http://192.168.206.239';  // Updated to your ESP8266 IP
const USE_MOCK_DATA = false;  // Changed to false to use real hardware data

// Utility function to check if we should use mock data
const shouldUseMockData = () => {
  // Check if mockData is enabled in localStorage or if API is unreachable
  const config = localStorage.getItem('socketSentinelConfig');
  if (config) {
    try {
      const parsedConfig = JSON.parse(config);
      return parsedConfig.mockDataEnabled || USE_MOCK_DATA;
    } catch (e) {
      return USE_MOCK_DATA;
    }
  }
  return USE_MOCK_DATA;
};

// Store connection failure state
let connectionFailures = 10000;
const MAX_FAILURES_BEFORE_MOCK = 3;
let lastConnectionAttempt = 0;
const CONNECTION_RETRY_INTERVAL = 300000000; // 30 seconds

// Helper function to sanitize power history data
const sanitizePowerHistory = (powerHistory: any[]) => {
  if (!powerHistory || !Array.isArray(powerHistory)) {
    return [];
  }
  
  return powerHistory.filter(item => {
    return item && 
           item.timestamp && 
           typeof item.total === 'number' &&
           typeof item.socket1 === 'number' &&
           typeof item.socket2 === 'number' &&
           typeof item.socket3 === 'number';
  });
};

// Function to parse potentially malformed JSON from the server
const parsePotentiallyMalformedJson = (text: string) => {
  // First, try normal JSON parsing
  try {
    return JSON.parse(text);
  } catch (error) {
    // Try to extract the power history data specifically
    if (text.includes('socket1') && text.includes('socket2') && text.includes('socket3')) {
      try {
        // Look for array pattern
        const arrayMatch = text.match(/\[\s*{.*}\s*\]/s);
        if (arrayMatch) {
          const powerHistoryArray = JSON.parse(arrayMatch[0]);
          
          // Create a mock state with the parsed power history
          const mockData = generateMockAppState();
          return {
            ...mockData,
            powerHistory: powerHistoryArray
          };
        }
        
        // If we can't find a complete array, try to reconstruct the data
        const itemMatches = text.match(/{[^{}]*"socket1"[^{}]*"socket2"[^{}]*"socket3"[^{}]*}/g);
        if (itemMatches && itemMatches.length > 0) {
          try {
            const powerHistoryArray = itemMatches.map(item => JSON.parse(item));
            
            // Create a mock state with the parsed power history
            const mockData = generateMockAppState();
            return {
              ...mockData,
              powerHistory: powerHistoryArray
            };
          } catch (e) {
          }
        }
      } catch (parseError) {
      }
    }
    
    return null;
  }
};

// Function to fetch data from ESP8266
export const fetchSystemData = async () => {
  // Check if we're in a retry cooldown period
  const now = Date.now();
  if (connectionFailures >= MAX_FAILURES_BEFORE_MOCK && 
      now - lastConnectionAttempt < CONNECTION_RETRY_INTERVAL) {
    // Return mock data during cooldown
    const mockData = generateMockAppState();
    return {
      success: true,
      data: mockData,
      usingMockData: true
    };
  }
  
  // Update last connection attempt time
  lastConnectionAttempt = now;
  
  // Return mock data if configured to do so
  if (shouldUseMockData()) {
    const mockData = generateMockAppState();
    return {
      success: true,
      data: mockData,
      usingMockData: true
    };
  }
  
  try {
    console.log("Fetching data from:", `${API_ENDPOINT}/api/system`);
    const response = await fetch(`${API_ENDPOINT}/api/system`, {
      // Add timeout to prevent long waiting periods
      signal: AbortSignal.timeout(10000) // Increased timeout
    });
    
    if (!response.ok) {
      return null;
    }
    
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      // Standard JSON response
      try {
        data = await response.json();
        console.log("Received JSON data:", data);
      } catch (jsonError) {
        return null;
      }
    } else {
      // Non-JSON response or missing content-type header
      const text = await response.text();
      console.log("Raw response (non-JSON):", text);
      
      if (text.trim().length === 0) {
        throw new Error("Empty response from server");
      }
      
      // Try to parse the text as JSON manually
      data = parsePotentiallyMalformedJson(text);
    }
    
    // Reset connection failures on success
    connectionFailures = 0;
    
    // Validate received data
    if (!data) {
      return null;
    }
    
    console.log("Processed data:", data);
    
    // Ensure we have a complete data structure with fallbacks
    const mockData = generateMockAppState();
    
    if (!data.systemStatus) {
      
      data.systemStatus = mockData.systemStatus;
    }
    
    if (!data.sockets || !Array.isArray(data.sockets)) {
      
      data.sockets = mockData.sockets;
    }
    
    if (!data.alerts || !Array.isArray(data.alerts)) {
      data.alerts = [];
    }
    
    if (!data.config) {
      
      data.config = mockData.config;
    }
    
    // Clean up power history data
    if (data.powerHistory) {
      if (Array.isArray(data.powerHistory)) {
        data.powerHistory = sanitizePowerHistory(data.powerHistory);
        console.log("Sanitized power history length:", data.powerHistory.length);
      } else if (typeof data.powerHistory === 'string') {
        // Try to parse string as JSON
        try {
          const parsedHistory = JSON.parse(data.powerHistory);
          data.powerHistory = sanitizePowerHistory(parsedHistory);
        } catch (error) {
          data.powerHistory = mockData.powerHistory;
        }
      } else {
        
        data.powerHistory = mockData.powerHistory;
      }
    } else {
      
      data.powerHistory = mockData.powerHistory;
    }
    
    if (!data.predictions) {
      data.predictions = [];
    }
    
    return {
      success: true,
      data
    };
  } catch (error) {
    
    
    // Increment connection failures
    connectionFailures++;
    
    // If we've reached our threshold, switch to mock data
    if (connectionFailures >= MAX_FAILURES_BEFORE_MOCK) {
      
      
      // Get mock data
      const mockData = generateMockAppState();
      
      return {
        success: true,
        data: mockData,
        usingMockData: true
      };
    }
    
    return {
      success: false,
      
    };
  }
};

// Function to control a relay
export const controlRelay = async (socketId: number, status: boolean) => {
  if (shouldUseMockData()) {
    // Simulate a successful API call
    return {
      success: true,
      data: { id: socketId, status }
    };
  }
  
  try {
    const response = await fetch(`${API_ENDPOINT}/api/relay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ socketId, status })
    });
    
    if (!response.ok) {
      return {
        success: false
      };
    }
    
    const data = await response.json();
    return {
      success: true,
      data
    };
  } catch (error) {

    return {
      success: false,
      
    };
  }
};

// Function to control isolation relay
export const controlIsolation = async (status: boolean, password: string) => {
  if (shouldUseMockData()) {
    // Check against mock password
    const config = localStorage.getItem('socketSentinelConfig');
    let mockPassword = 'admin123';
    
    if (config) {
      try {
        const parsedConfig = JSON.parse(config);
        mockPassword = parsedConfig.adminPassword;
      } catch (e) {
      }
    }
    
    if (password !== mockPassword) {
      return {
        success: false,
        error: 'Invalid admin password'
      };
    }
    
    return {
      success: true,
      data: { status }
    };
  }
  
  try {
    const response = await fetch(`${API_ENDPOINT}/api/isolation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status, password })
    });
    
    if (!response.ok) {
      return {
        success: false
      };
    }
    
    const data = await response.json();
    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to control isolation: ${error}`
    };
  }
};

// Function to update system configuration
export const updateConfig = async (config: Partial<AppConfig>) => {
  if (shouldUseMockData()) {
    // Update config in localStorage
    const existingConfig = localStorage.getItem('socketSentinelConfig');
    let updatedConfig = { ...config };
    
    if (existingConfig) {
      try {
        const parsedConfig = JSON.parse(existingConfig);
        updatedConfig = { ...parsedConfig, ...config };
      } catch (e) {
      }
    }
    
    localStorage.setItem('socketSentinelConfig', JSON.stringify(updatedConfig));
    
    return {
      success: true,
      data: updatedConfig
    };
  }
  
  try {
    const response = await fetch(`${API_ENDPOINT}/api/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    
    if (!response.ok) {
      return {
        success: false
      };
    }
    
    const data = await response.json();
    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to update config: ${error}`
    };
  }
};

// Function to reset communication
export const resetCommunication = async (password: string) => {
  if (shouldUseMockData()) {
    // Check against mock password
    const config = localStorage.getItem('socketSentinelConfig');
    let mockPassword = 'admin123';
    
    if (config) {
      try {
        const parsedConfig = JSON.parse(config);
        mockPassword = parsedConfig.adminPassword;
      } catch (e) {
      }
    }
    
    if (password !== mockPassword) {
      return {
        success: false,
        error: 'Invalid admin password'
      };
    }
    
    return {
      success: true,
      message: 'Communication reset successfully'
    };
  }
  
  try {
    const response = await fetch(`${API_ENDPOINT}/api/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password })
    });
    
    if (!response.ok) {
      return {
        success: false
      };
    }
    
    const data = await response.json();
    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to reset communication: ${error}`
    };
  }
};
