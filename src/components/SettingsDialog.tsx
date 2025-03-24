
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AppConfig } from '@/lib/types';
import { PlusCircle, X, Trash2 } from 'lucide-react';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSaveConfig: (config: AppConfig) => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [formState, setFormState] = useState<AppConfig>(config);
  const [newIP, setNewIP] = useState('');
  
  // Reset form when dialog opens
  React.useEffect(() => {
    setFormState(config);
  }, [config, isOpen]);
  
  const handleAddIP = () => {
    if (newIP && !formState.allowedIPs.includes(newIP)) {
      setFormState({
        ...formState,
        allowedIPs: [...formState.allowedIPs, newIP]
      });
      setNewIP('');
    }
  };
  
  const handleRemoveIP = (ip: string) => {
    setFormState({
      ...formState,
      allowedIPs: formState.allowedIPs.filter(item => item !== ip)
    });
  };
  
  const handleSave = () => {
    onSaveConfig(formState);
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>System Settings</DialogTitle>
          <DialogDescription>
            Configure your Smart Socket Sentinel system settings.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="adminPassword">Admin Password</Label>
            <Input
              id="adminPassword"
              type="password"
              value={formState.adminPassword}
              onChange={(e) => setFormState({...formState, adminPassword: e.target.value})}
              placeholder="Enter admin password"
              className="bg-background/50"
            />
            <p className="text-xs text-muted-foreground">
              This password is used for system isolation and other admin functions.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="highPowerThreshold">High Power Threshold (W)</Label>
            <Input
              id="highPowerThreshold"
              type="number"
              value={formState.highPowerThreshold}
              onChange={(e) => setFormState({...formState, highPowerThreshold: parseInt(e.target.value) || 0})}
              className="bg-background/50"
            />
            <p className="text-xs text-muted-foreground">
              System will alert when total power exceeds this threshold.
            </p>
          </div>
          
          <div className="space-y-4">
            <Label>Allowed IP Addresses</Label>
            <div className="flex space-x-2">
              <Input
                placeholder="Enter IP address"
                value={newIP}
                onChange={(e) => setNewIP(e.target.value)}
                className="bg-background/50"
              />
              <Button type="button" size="icon" onClick={handleAddIP}>
                <PlusCircle size={18} />
              </Button>
            </div>
            
            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 scrollbar-none">
              {formState.allowedIPs.length > 0 ? (
                formState.allowedIPs.map((ip) => (
                  <div 
                    key={ip}
                    className="flex items-center justify-between p-2 border border-border rounded-md"
                  >
                    <span className="text-sm">{ip}</span>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveIP(ip)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No allowed IPs configured. System will accept all connections.</p>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-medium">System Features</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoLoadBalance">Automatic Load Balancing</Label>
                <p className="text-xs text-muted-foreground">
                  System will automatically balance power between sockets.
                </p>
              </div>
              <Switch
                id="autoLoadBalance"
                checked={formState.autoLoadBalance}
                onCheckedChange={(checked) => setFormState({...formState, autoLoadBalance: checked})}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="predictionEnabled">Power Prediction</Label>
                <p className="text-xs text-muted-foreground">
                  Enable AI-powered power usage prediction.
                </p>
              </div>
              <Switch
                id="predictionEnabled"
                checked={formState.predictionEnabled}
                onCheckedChange={(checked) => setFormState({...formState, predictionEnabled: checked})}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="mockDataEnabled">Use Mock Data</Label>
                <p className="text-xs text-muted-foreground">
                  Enable mock data when hardware is not connected.
                </p>
              </div>
              <Switch
                id="mockDataEnabled"
                checked={formState.mockDataEnabled}
                onCheckedChange={(checked) => setFormState({...formState, mockDataEnabled: checked})}
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
