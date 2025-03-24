
import React, { useState } from 'react';
import { Shield, ShieldAlert, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SystemStatus } from '@/lib/types';

interface IsolationControlProps {
  systemStatus: SystemStatus;
  onToggleIsolation: (status: boolean, password: string) => void;
  onResetCommunication: (password: string) => void;
  isLoading?: boolean;
}

const IsolationControl: React.FC<IsolationControlProps> = ({
  systemStatus,
  onToggleIsolation,
  onResetCommunication,
  isLoading = false
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [action, setAction] = useState<'isolate' | 'reset' | 'deisolate'>('isolate');
  const [password, setPassword] = useState('');
  const [expanded, setExpanded] = useState(false);
  
  const handleToggleExpand = () => {
    setExpanded(!expanded);
  };
  
  const handleOpenDialog = (actionType: 'isolate' | 'reset' | 'deisolate') => {
    setAction(actionType);
    setPassword('');
    setDialogOpen(true);
  };
  
  const handleConfirm = () => {
    if (action === 'reset') {
      onResetCommunication(password);
    } else {
      onToggleIsolation(action === 'isolate', password);
    }
    setDialogOpen(false);
    setPassword('');
  };
  
  return (
    <>
      <Card className={`glass-card transition-all duration-300 ${systemStatus.isIsolated || systemStatus.isCommunicationBlocked ? 'ring-1 ring-destructive/30' : ''}`}>
        <CardHeader 
          className="flex flex-row items-center justify-between pb-2 cursor-pointer"
          onClick={handleToggleExpand}
        >
          <div className="flex items-center">
            <CardTitle className="text-sm font-medium mr-2">
              System Protection
            </CardTitle>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
          <Badge 
            variant={systemStatus.isIsolated ? "destructive" : "outline"}
            className={`${systemStatus.isIsolated ? 'bg-destructive text-destructive-foreground' : 'text-primary'}`}
          >
            {systemStatus.isIsolated ? 'Isolated' : 'Connected'}
          </Badge>
        </CardHeader>
        
        {expanded && (
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {systemStatus.isIsolated ? (
                    <ShieldAlert size={18} className="text-destructive" />
                  ) : (
                    <Shield size={18} className="text-primary" />
                  )}
                  <span className="text-sm">
                    Power isolation {systemStatus.isIsolated ? 'active' : 'inactive'}
                  </span>
                </div>
                
                <Button
                  variant={systemStatus.isIsolated ? "outline" : "destructive"}
                  size="sm"
                  onClick={() => handleOpenDialog(systemStatus.isIsolated ? 'deisolate' : 'isolate')}
                  disabled={isLoading}
                >
                  {systemStatus.isIsolated ? 'Disable' : 'Isolate'}
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Lock size={18} className={systemStatus.isCommunicationBlocked ? "text-destructive" : "text-primary"} />
                  <span className="text-sm">
                    Communication {systemStatus.isCommunicationBlocked ? 'blocked' : 'open'}
                  </span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDialog('reset')}
                  disabled={isLoading || !systemStatus.isCommunicationBlocked}
                >
                  Reset
                </Button>
              </div>
              
              {systemStatus.isolationReason && (
                <div className="mt-2 text-xs text-destructive">
                  Isolation reason: {systemStatus.isolationReason}
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-card sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {action === 'isolate' 
                ? 'Confirm Isolation' 
                : action === 'deisolate' 
                  ? 'Disable Isolation' 
                  : 'Reset Communication'
              }
            </DialogTitle>
            <DialogDescription>
              {action === 'isolate' 
                ? 'This will disconnect all sockets from power. Enter admin password to continue.' 
                : action === 'deisolate' 
                  ? 'This will reconnect all sockets to power. Enter admin password to continue.'
                  : 'This will reset the communication block. Enter admin password to continue.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Admin Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="bg-background/50"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant={action === 'isolate' ? "destructive" : "default"}
              onClick={handleConfirm}
              disabled={!password}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default IsolationControl;
