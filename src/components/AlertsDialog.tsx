
import React from 'react';
import { X, AlertTriangle, Info, CheckCircle, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertMessage } from '@/lib/types';

interface AlertsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: AlertMessage[];
  onClearAlert: (id: string) => void;
  onClearAllAlerts: () => void;
}

const AlertsDialog: React.FC<AlertsDialogProps> = ({
  isOpen,
  onClose,
  alerts,
  onClearAlert,
  onClearAllAlerts,
}) => {
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-primary" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>System Alerts</DialogTitle>
          <DialogDescription>
            Notifications and alerts from your Smart Socket Sentinel system.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onClearAllAlerts}
            disabled={alerts.length === 0}
          >
            Clear All
          </Button>
        </div>
        
        <ScrollArea className="h-[400px] pr-4">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <Info className="h-8 w-8 mb-2 opacity-50" />
              <p>No alerts to display</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div 
                  key={alert.id}
                  className="p-4 border border-border rounded-lg flex items-start gap-3 transition-all duration-200 hover:bg-secondary/5"
                >
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`font-medium text-sm capitalize text-foreground`}>
                        {alert.type} Alert
                      </h4>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onClearAlert(alert.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default AlertsDialog;
