
import React from 'react';
import { Bell, Settings, Info, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { SystemStatus } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HeaderProps {
  systemStatus: SystemStatus;
  onOpenSettings: () => void;
  onOpenAlerts: () => void;
  alertCount: number;
  usingMockData?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  systemStatus, 
  onOpenSettings, 
  onOpenAlerts,
  alertCount,
  usingMockData = false
}) => {
  return (
    <header className="w-full py-4 px-6 glass-card mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative w-3 h-3">
            <div className={`absolute inset-0 rounded-full ${systemStatus.isConnected ? 'bg-primary' : 'bg-destructive'} animate-pulse-slow`}></div>
          </div>
          <h1 className="text-gradient text-2xl font-medium">Smart Socket Sentinel</h1>
          
          {usingMockData && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center px-2 py-1 bg-yellow-500/20 rounded-md border border-yellow-500/30">
                  <AlertTriangle size={14} className="text-yellow-500 mr-1" />
                  <span className="text-xs font-medium text-yellow-500">Demo Mode</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Using mock data - unable to connect to hardware</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            <span className="mr-2">Last update:</span>
            <span className="font-medium">
              {new Date(systemStatus.lastUpdated).toLocaleTimeString()}
            </span>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <span className="mr-2">IP:</span>
            <span className="font-medium">{systemStatus.ipAddress}</span>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon"
            className="relative"
            onClick={onOpenAlerts}
          >
            <Bell size={20} />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center">
                {alertCount}
              </span>
            )}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Info size={20} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[280px] glass-card">
              <div className="p-4">
                <h3 className="font-medium mb-2">System Status</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span>Connection:</span>
                    <span className={systemStatus.isConnected ? "text-primary" : "text-destructive"}>
                      {systemStatus.isConnected ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Isolation:</span>
                    <span className={systemStatus.isIsolated ? "text-destructive" : "text-primary"}>
                      {systemStatus.isIsolated ? "Isolated" : "Normal"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Communication:</span>
                    <span className={systemStatus.isCommunicationBlocked ? "text-destructive" : "text-primary"}>
                      {systemStatus.isCommunicationBlocked ? "Blocked" : "Open"}
                    </span>
                  </div>
                  {systemStatus.isolationReason && (
                    <div className="flex justify-between items-center">
                      <span>Isolation reason:</span>
                      <span className="text-destructive">{systemStatus.isolationReason}</span>
                    </div>
                  )}
                  {usingMockData && (
                    <div className="flex justify-between items-center">
                      <span>Data source:</span>
                      <span className="text-yellow-500">Mock data (demo mode)</span>
                    </div>
                  )}
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={onOpenSettings}
          >
            <Settings size={20} />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
