
import React, { useState } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PowerChartProps {
  powerHistory: {
    timestamp: string;
    total: number;
    socket1: number;
    socket2: number;
    socket3: number;
  }[];
  predictions?: {
    timestamp: string;
    predicted: number;
    actual?: number;
  }[];
}

const PowerChart: React.FC<PowerChartProps> = ({ 
  powerHistory,
  predictions
}) => {
  const [timeRange, setTimeRange] = useState('1h');
  
  // Filter data based on selected time range
  const getFilteredData = () => {
    const now = new Date().getTime();
    let rangeInMs;
    
    switch (timeRange) {
      case '1h':
        rangeInMs = 60 * 60 * 1000;
        break;
      case '6h':
        rangeInMs = 6 * 60 * 60 * 1000;
        break;
      case '24h':
        rangeInMs = 24 * 60 * 60 * 1000;
        break;
      default:
        rangeInMs = 60 * 60 * 1000;
    }
    
    return powerHistory.filter(item => {
      const itemTime = new Date(item.timestamp).getTime();
      return now - itemTime < rangeInMs;
    });
  };
  
  // Prepare chart data by merging history and predictions
  const prepareChartData = () => {
    const filteredHistory = getFilteredData();
    
    // Process historical data
    const historyData = filteredHistory.map(item => ({
      timestamp: item.timestamp,
      total: item.total,
      socket1: item.socket1,
      socket2: item.socket2,
      socket3: item.socket3,
      predicted: undefined
    }));
    
    // If we have predictions, add them
    if (predictions && predictions.length > 0) {
      const predictionData = predictions.map(item => ({
        timestamp: item.timestamp,
        predicted: item.predicted,
        actual: item.actual,
        total: item.actual || undefined,
        socket1: undefined,
        socket2: undefined,
        socket3: undefined
      }));
      
      return [...historyData, ...predictionData];
    }
    
    return historyData;
  };
  
  const chartData = prepareChartData();
  
  // Format date for x-axis labels
  const formatXAxis = (tickItem: string) => {
    const date = new Date(tickItem);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Custom tooltip content
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const date = new Date(label);
      const formattedDate = date.toLocaleString();
      
      return (
        <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
          <p className="text-sm font-medium mb-2">{formattedDate}</p>
          {payload.map((entry: any, index: number) => {
            if (entry.value !== undefined && entry.value !== null) {
              return (
                <p 
                  key={`item-${index}`} 
                  className="text-xs" 
                  style={{ color: entry.color }}
                >
                  {entry.name}: {entry.value.toFixed(1)} W
                </p>
              );
            }
            return null;
          })}
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <Card className="glass-card col-span-3">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          Power Consumption History
        </CardTitle>
        <Select
          value={timeRange}
          onValueChange={setTimeRange}
        >
          <SelectTrigger className="w-[80px]">
            <SelectValue placeholder="Timeframe" />
          </SelectTrigger>
          <SelectContent className="glass-card">
            <SelectItem value="1h">1 hour</SelectItem>
            <SelectItem value="6h">6 hours</SelectItem>
            <SelectItem value="24h">24 hours</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="h-[300px] pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{
              top: 10,
              right: 10,
              left: 0,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorSocket1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorSocket2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorSocket3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={formatXAxis} 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="socket1" 
              name="Socket 1"
              stroke="#3b82f6" 
              fill="url(#colorSocket1)" 
              stackId="1"
              strokeWidth={1.5}
            />
            <Area 
              type="monotone" 
              dataKey="socket2" 
              name="Socket 2"
              stroke="#f59e0b" 
              fill="url(#colorSocket2)" 
              stackId="1"
              strokeWidth={1.5}
            />
            <Area 
              type="monotone" 
              dataKey="socket3" 
              name="Socket 3"
              stroke="#ec4899" 
              fill="url(#colorSocket3)" 
              stackId="1"
              strokeWidth={1.5}
            />
            {predictions && predictions.length > 0 && (
              <Area 
                type="monotone" 
                dataKey="predicted" 
                name="Predicted"
                stroke="#8b5cf6" 
                fill="url(#colorPredicted)"
                strokeDasharray="5 5"
                strokeWidth={2}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default PowerChart;
