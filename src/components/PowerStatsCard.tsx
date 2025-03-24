
import React from 'react';
import { ArrowUp, ArrowDown, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SystemStatus } from '@/lib/types';

interface PowerStatsCardProps {
  systemStatus: SystemStatus;
  previousTotal?: number;
}

const PowerStatsCard: React.FC<PowerStatsCardProps> = ({ 
  systemStatus,
  previousTotal
}) => {
  const totalPower = systemStatus.totalPower;
  const hasPrevious = previousTotal !== undefined;
  const powerDifference = hasPrevious ? totalPower - previousTotal : 0;
  const percentChange = hasPrevious ? (powerDifference / previousTotal) * 100 : 0;
  const isIncrease = powerDifference > 0;
  
  return (
    <Card className="glass-card transition-all duration-300 hover:shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          Total Power Consumption
        </CardTitle>
        <Activity size={18} className="text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gradient">{totalPower.toFixed(2)} W</div>
        
        {hasPrevious && Math.abs(percentChange) > 0.1 && (
          <div className="flex items-center mt-1">
            <span className={`text-xs ${isIncrease ? 'text-destructive' : 'text-primary'} flex items-center`}>
              {isIncrease ? (
                <ArrowUp size={12} className="mr-1" />
              ) : (
                <ArrowDown size={12} className="mr-1" />
              )}
              {Math.abs(percentChange).toFixed(1)}% from previous
            </span>
          </div>
        )}
        
        <div className="mt-3">
          <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
            <div 
              className={`h-full ${totalPower > 1000 ? 'bg-destructive' : 'bg-primary'} transition-all duration-300`} 
              style={{ width: `${Math.min(100, (totalPower / 1500) * 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0 W</span>
            <span>1500 W</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PowerStatsCard;
