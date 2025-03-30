
import { SocketData, SystemStatus, AppConfig } from './types';
import { generateMockAppState } from './mockData';

// Configuration
const API_ENDPOINT = 'http://192.168.1.100';  // Replace with your ESP8266 IP
const USE_MOCK_DATA = true;  // Set to false when using real hardware

// Utility function to check if we should use mock data
const shouldUseMockData = () => {
  // Check if mockData is enabled in localStorage or if API is unreachable
  const config = localStorage.getItem('socketSentinelConfig');
  if (config) {
    try {
      const parsedConfig = JSON.parse(config);
      return parsedConfig.mockDataEnabled || USE_MOCK_DATA;
    } catch (e) {
      console.error('Error parsing config:', e);
      return USE_MOCK_DATA;
    }
  }
  return USE_MOCK_DATA;
};

// Store connection failure state
let connectionFailures = 0;
const MAX_FAILURES_BEFORE_MOCK = 3;
let lastConnectionAttempt = 0;
const CONNECTION_RETRY_INTERVAL = 30000; // 30 seconds

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
    const response = await fetch(`${API_ENDPOINT}/api/system`, {
      // Add timeout to prevent long waiting periods
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // Try to parse the text as JSON manually
      const text = await response.text();
      console.log("Raw response:", text);
      
      try {
        // Attempt to fix malformed JSON by wrapping in proper structure
        if (text.includes('socket1') && !text.startsWith('{')) {
          // The response appears to be the power history array without proper formatting
          // Let's try to reconstruct it as a proper AppState object
          const mockState = generateMockAppState();
          
          try {
            // Try to parse as JSON array first
            const powerHistoryArray = JSON.parse(`[${text}]`);
            return {
              success: true,
              data: {
                ...mockState,
                powerHistory: powerHistoryArray
              }
            };
          } catch (parseError) {
            console.error("Error parsing as JSON array:", parseError);
            
            // If that fails, try to reconstruct from the fragments
            if (text.includes('socket1') && text.includes('socket2') && text.includes('socket3')) {
              // Extract what appears to be the power history data
              const match = text.match(/\[\{.*\}\]/);
              if (match) {
                try {
                  const powerHistoryArray = JSON.parse(match[0]);
                  return {
                    success: true,
                    data: {
                      ...mockState,
                      powerHistory: powerHistoryArray
                    }
                  };
                } catch (innerError) {
                  console.error("Error parsing matched JSON:", innerError);
                }
              }
            }
          }
        }
        
        // If the above didn't work, try standard JSON parsing
        data = JSON.parse(text);
      } catch (parseError) {
        console.error("Error parsing response as JSON:", parseError);
        throw new Error(`Invalid JSON: ${text.substring(0, 200)}...`);
      }
    }
    
    // Reset connection failures on success
    connectionFailures = 0;
    
    // Validate received data
    if (!data || typeof data !== 'object') {
      console.error("Invalid data format received:", data);
      throw new Error("Invalid data format");
    }
    
    // Ensure we have a complete data structure
    if (!data.systemStatus) {
      const mockData = generateMockAppState();
      data.systemStatus = mockData.systemStatus;
    }
    
    if (!data.sockets || !Array.isArray(data.sockets)) {
      const mockData = generateMockAppState();
      data.sockets = mockData.sockets;
    }
    
    if (!data.alerts || !Array.isArray(data.alerts)) {
      data.alerts = [];
    }
    
    if (!data.config) {
      const mockData = generateMockAppState();
      data.config = mockData.config;
    }
    
    // Make sure powerHistory is in the correct format
    if (data.powerHistory && Array.isArray(data.powerHistory)) {
      // Good, we have a power history array
    } else if (typeof data.powerHistory === 'string') {
      // Try to parse string as JSON
      try {
        data.powerHistory = JSON.parse(data.powerHistory);
      } catch (error) {
        console.error("Error parsing powerHistory string:", error);
        data.powerHistory = [];
      }
    } else {
      // No valid power history
      data.powerHistory = [];
    }
    
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Error fetching system data:', error);
    
    // Increment connection failures
    connectionFailures++;
    
    // If we've reached our threshold, switch to mock data
    if (connectionFailures >= MAX_FAILURES_BEFORE_MOCK) {
      console.log(`Connection failed ${connectionFailures} times. Switching to mock data mode.`);
      
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
      error: `Failed to fetch data: ${error}`
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
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Error controlling relay:', error);
    return {
      success: false,
      error: `Failed to control relay: ${error}`
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
        console.error('Error parsing config:', e);
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
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Error controlling isolation:', error);
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
        console.error('Error parsing config:', e);
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
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Error updating config:', error);
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
        console.error('Error parsing config:', e);
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
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Error resetting communication:', error);
    return {
      success: false,
      error: `Failed to reset communication: ${error}`
    };
  }
};
