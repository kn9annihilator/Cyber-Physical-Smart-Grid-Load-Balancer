
import React from 'react';
import { Power, ZapOff } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SocketData } from '@/lib/types';

interface SocketCardProps {
  socket: SocketData;
  onToggle: (id: number, status: boolean) => void;
  isLoading?: boolean;
}

const SocketCard: React.FC<SocketCardProps> = ({ 
  socket, 
  onToggle,
  isLoading = false
}) => {
  const handleToggle = () => {
    onToggle(socket.id, !socket.status);
  };
  
  // Display zeros for voltage, current, and power as actual values (not errors)
  const voltage = socket.voltage !== undefined ? socket.voltage.toFixed(1) : "0.0";
  const current = socket.current !== undefined ? socket.current.toFixed(2) : "0.00";
  const power = socket.power !== undefined ? socket.power.toFixed(1) : "0.0";
  
  return (
    <Card className={`glass-card transition-all duration-300 ${socket.status ? 'ring-1 ring-primary/30' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          {socket.name}
        </CardTitle>
        <Badge 
          variant={socket.isActive ? "default" : "outline"}
          className={`${socket.isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
        >
          {socket.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Voltage</p>
            <p className="text-lg font-medium">{voltage} V</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Current</p>
            <p className="text-lg font-medium">{current} A</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {socket.status ? (
              <Power size={18} className="text-primary mr-2" />
            ) : (
              <ZapOff size={18} className="text-muted-foreground mr-2" />
            )}
            <span className="text-sm font-medium">
              {power} W
            </span>
          </div>
          
          <div className="h-1 w-16 bg-secondary rounded-full overflow-hidden">
            <div 
              className={`h-full ${parseFloat(power) > 300 ? 'bg-destructive' : 'bg-primary'} transition-all duration-300`} 
              style={{ width: `${Math.min(100, (parseFloat(power) / 500) * 100)}%` }}
            ></div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">Switch</span>
        <Switch 
          checked={socket.status} 
          onCheckedChange={handleToggle}
          disabled={isLoading}
        />
      </CardFooter>
    </Card>
  );
};

export default SocketCard;
