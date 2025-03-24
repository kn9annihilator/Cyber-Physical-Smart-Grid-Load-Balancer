import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import Header from '@/components/Header';
import PowerStatsCard from '@/components/PowerStatsCard';
import SocketCard from '@/components/SocketCard';
import PowerChart from '@/components/PowerChart';
import AlertsDialog from '@/components/AlertsDialog';
import IsolationControl from '@/components/IsolationControl';
import SettingsDialog from '@/components/SettingsDialog';
import { 
  fetchSystemData, 
  controlRelay, 
  controlIsolation,
  updateConfig,
  resetCommunication
} from '@/lib/api';
import { AlertMessage, AppState, SystemStatus, SocketData, AppConfig } from '@/lib/types';
import { generateMockAppState } from '@/lib/mockData';
import { predictFuturePower, adjustPredictions } from '@/lib/prediction';
import { v4 as uuidv4 } from 'uuid';

const Index = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [appState, setAppState] = useState<AppState | null>(null);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previousTotal, setPreviousTotal] = useState<number | undefined>(undefined);
  const [usingMockData, setUsingMockData] = useState(false);
  
  // Load initial data
  useEffect(() => {
    loadSystemData();
    // Set up polling interval
    const interval = setInterval(loadSystemData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);
  
  // Function to load system data
  const loadSystemData = async () => {
    setIsLoading(true);
    
    try {
      const result = await fetchSystemData();
      
      if (result.success && result.data) {
        // Check if we're using mock data due to connection issues
        if (result.usingMockData && !usingMockData) {
          setUsingMockData(true);
          toast({
            title: "Using Mock Data Mode",
            description: "Unable to connect to hardware. System has switched to mock data mode.",
            variant: "warning",
          });
        } else if (!result.usingMockData && usingMockData) {
          // We've reconnected to real hardware
          setUsingMockData(false);
          toast({
            title: "Hardware Connected",
            description: "Successfully reconnected to the hardware.",
          });
        }
        
        // Save previous total for comparison
        if (appState?.systemStatus) {
          setPreviousTotal(appState.systemStatus.totalPower);
        }
        
        // Process predictions if enabled
        let updatedData = { ...result.data };
        
        if (result.data.config.predictionEnabled && result.data.powerHistory.length > 0) {
          const predictions = predictFuturePower(result.data.powerHistory);
          
          // Adjust predictions based on actual data
          if (result.data.systemStatus.totalPower) {
            updatedData.predictions = adjustPredictions(
              predictions, 
              result.data.systemStatus.totalPower
            );
          } else {
            updatedData.predictions = predictions;
          }
        }
        
        // Check for anomalies and create alerts
        if (appState) {
          updatedData = checkForAnomalies(updatedData);
        }
        
        setAppState(updatedData);
      } else {
        console.error("Failed to fetch data:", result.error);
        toast({
          title: "Connection Error",
          description: "Failed to fetch system data. Using cached data if available.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in data fetching:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to check for anomalies and create alerts
  const checkForAnomalies = (data: AppState): AppState => {
    const updatedData = { ...data };
    const { systemStatus, config } = data;
    
    // Check for high power usage
    if (systemStatus.totalPower > config.highPowerThreshold && !systemStatus.isIsolated) {
      if (!hasAlertOfType(data.alerts, 'high-power')) {
        addAlert(updatedData, {
          id: `high-power-${uuidv4()}`,
          type: 'warning',
          message: `High power usage detected: ${systemStatus.totalPower.toFixed(1)}W exceeds threshold of ${config.highPowerThreshold}W. Consider increasing power production or reducing consumption.`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Check for abnormal system activity
    if (systemStatus.abnormalDetected && !hasAlertOfType(data.alerts, 'abnormal-activity')) {
      addAlert(updatedData, {
        id: `abnormal-activity-${uuidv4()}`,
        type: 'error',
        message: 'Abnormal system activity detected. Communication has been blocked for security. Reset required.',
        timestamp: new Date().toISOString()
      });
    }
    
    // Handle isolation alerts
    if (systemStatus.isIsolated && !hasAlertOfType(data.alerts, 'isolation')) {
      addAlert(updatedData, {
        id: `isolation-${uuidv4()}`,
        type: 'error',
        message: `System isolated: ${systemStatus.isolationReason || 'Manual isolation'}. Administrator action required.`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Check for load imbalance if auto-balancing is enabled
    if (config.autoLoadBalance && !systemStatus.isIsolated) {
      checkLoadBalance(updatedData);
    }
    
    return updatedData;
  };
  
  // Helper to check if we already have an alert of a specific type
  const hasAlertOfType = (alerts: AlertMessage[], type: string): boolean => {
    return alerts.some(alert => alert.id.startsWith(type));
  };
  
  // Helper to add an alert to the state
  const addAlert = (state: AppState, alert: AlertMessage) => {
    state.alerts = [alert, ...state.alerts];
  };
  
  // Function to check and balance load
  const checkLoadBalance = async (state: AppState) => {
    const { sockets } = state;
    
    // Find inactive sockets (on but not consuming much power)
    const inactiveSockets = sockets.filter(socket => 
      socket.status && socket.power < 10 && !socket.isActive
    );
    
    // Find high power sockets
    const highPowerSockets = sockets.filter(socket => 
      socket.status && socket.power > 100
    );
    
    // If we have inactive sockets and high power sockets, suggest balancing
    if (inactiveSockets.length > 0 && highPowerSockets.length > 0) {
      // Automatically turn off inactive sockets
      inactiveSockets.forEach(async (socket) => {
        if (!hasAlertOfType(state.alerts, `auto-balance-${socket.id}`)) {
          // Add alert about auto-balancing
          addAlert(state, {
            id: `auto-balance-${socket.id}-${uuidv4()}`,
            type: 'info',
            message: `Auto-balancing: Socket ${socket.id} turned off to balance load. It was inactive but consuming standby power.`,
            timestamp: new Date().toISOString()
          });
          
          // Actually turn off the socket
          await handleToggleSocket(socket.id, false);
        }
      });
    }
  };
  
  // Handler for toggling socket state
  const handleToggleSocket = async (socketId: number, status: boolean) => {
    if (!appState) return;
    
    try {
      const result = await controlRelay(socketId, status);
      
      if (result.success) {
        // Update local state
        setAppState(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            sockets: prev.sockets.map(socket => 
              socket.id === socketId ? { ...socket, status } : socket
            )
          };
        });
        
        toast({
          title: `Socket ${socketId} ${status ? 'Enabled' : 'Disabled'}`,
          description: `Successfully ${status ? 'turned on' : 'turned off'} socket ${socketId}.`,
        });
      } else {
        toast({
          title: "Failed to Control Socket",
          description: result.error || "An unknown error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error toggling socket:", error);
      toast({
        title: "Error",
        description: "Failed to control the socket. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handler for toggling isolation
  const handleToggleIsolation = async (status: boolean, password: string) => {
    try {
      const result = await controlIsolation(status, password);
      
      if (result.success) {
        // Update local state
        setAppState(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            systemStatus: {
              ...prev.systemStatus,
              isIsolated: status,
              isolationReason: status ? 'Manual isolation' : null
            }
          };
        });
        
        toast({
          title: status ? "System Isolated" : "Isolation Disabled",
          description: status 
            ? "All sockets have been disconnected from power." 
            : "System has been reconnected to power.",
          variant: status ? "destructive" : "default",
        });
      } else {
        toast({
          title: "Authentication Failed",
          description: result.error || "Invalid admin password.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error toggling isolation:", error);
      toast({
        title: "Error",
        description: "Failed to control system isolation. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handler for resetting communication
  const handleResetCommunication = async (password: string) => {
    try {
      const result = await resetCommunication(password);
      
      if (result.success) {
        // Update local state
        setAppState(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            systemStatus: {
              ...prev.systemStatus,
              isCommunicationBlocked: false,
              abnormalDetected: false
            }
          };
        });
        
        toast({
          title: "Communication Reset",
          description: "System communication has been successfully reset.",
        });
      } else {
        toast({
          title: "Authentication Failed",
          description: result.error || "Invalid admin password.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error resetting communication:", error);
      toast({
        title: "Error",
        description: "Failed to reset system communication. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handler for updating config
  const handleUpdateConfig = async (newConfig: AppConfig) => {
    try {
      const result = await updateConfig(newConfig);
      
      if (result.success) {
        // Update local state
        setAppState(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            config: result.data
          };
        });
        
        toast({
          title: "Settings Updated",
          description: "System settings have been successfully updated.",
        });
      } else {
        toast({
          title: "Failed to Update Settings",
          description: result.error || "An unknown error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating config:", error);
      toast({
        title: "Error",
        description: "Failed to update system settings. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handler for clearing an alert
  const handleClearAlert = (id: string) => {
    setAppState(prev => {
      if (!prev) return prev;
      
      return {
        ...prev,
        alerts: prev.alerts.filter(alert => alert.id !== id)
      };
    });
  };
  
  // Handler for clearing all alerts
  const handleClearAllAlerts = () => {
    setAppState(prev => {
      if (!prev) return prev;
      
      return {
        ...prev,
        alerts: []
      };
    });
  };
  
  // If app state is not loaded yet, show loading
  if (!appState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background animate-pulse-slow">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-gradient">Smart Socket Sentinel</h1>
          <p className="text-muted-foreground">Loading system data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background antialiased text-foreground">
      <div className="max-w-[1400px] mx-auto p-4 sm:p-6">
        <Header 
          systemStatus={appState.systemStatus}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenAlerts={() => setAlertsOpen(true)}
          alertCount={appState.alerts.length}
          usingMockData={usingMockData}
        />
        
        <main>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <PowerStatsCard 
              systemStatus={appState.systemStatus} 
              previousTotal={previousTotal}
            />
            
            {appState.sockets.map((socket) => (
              <SocketCard 
                key={socket.id}
                socket={socket}
                onToggle={handleToggleSocket}
                isLoading={isLoading}
              />
            ))}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <PowerChart 
              powerHistory={appState.powerHistory}
              predictions={appState.config.predictionEnabled ? appState.predictions : undefined}
            />
            
            <IsolationControl 
              systemStatus={appState.systemStatus}
              onToggleIsolation={handleToggleIsolation}
              onResetCommunication={handleResetCommunication}
              isLoading={isLoading}
            />
          </div>
        </main>
        
        <AlertsDialog
          isOpen={alertsOpen}
          onClose={() => setAlertsOpen(false)}
          alerts={appState.alerts}
          onClearAlert={handleClearAlert}
          onClearAllAlerts={handleClearAllAlerts}
        />
        
        <SettingsDialog
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          config={appState.config}
          onSaveConfig={handleUpdateConfig}
        />
      </div>
    </div>
  );
};

export default Index;
