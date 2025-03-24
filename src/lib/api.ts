
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

// Function to fetch data from ESP8266
export const fetchSystemData = async () => {
  if (shouldUseMockData()) {
    // Return mock data
    const mockData = generateMockAppState();
    return {
      success: true,
      data: mockData
    };
  }
  
  try {
    const response = await fetch(`${API_ENDPOINT}/api/system`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Error fetching system data:', error);
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
