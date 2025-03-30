
import React, { useState, useEffect } from 'react';
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
  const [chartData, setChartData] = useState<any[]>([]);
  
  // Process data when it changes or timeRange changes
  useEffect(() => {
    if (!powerHistory || powerHistory.length === 0) {
      console.log("No power history data available");
      setChartData([]);
      return;
    }
    
    console.log("Processing power history data:", powerHistory.length, "items");
    
    // Ensure we have valid data before proceeding
    const validData = powerHistory.filter(item => {
      return item && 
             item.timestamp && 
             (typeof item.total === 'number' || 
              typeof item.socket1 === 'number' || 
              typeof item.socket2 === 'number' || 
              typeof item.socket3 === 'number');
    });
    
    console.log("Valid data after filtering:", validData.length, "items");
    
    if (validData.length === 0) {
      console.log("No valid power history data after filtering");
      setChartData([]);
      return;
    }
    
    // Log the first few items to debug
    console.log("Sample data items:", validData.slice(0, 3));
    
    const preparedData = prepareChartData(validData);
    setChartData(preparedData);
  }, [powerHistory, timeRange, predictions]);
  
  // Filter data based on selected time range
  const getFilteredData = (data: any[]) => {
    if (!data || data.length === 0) {
      return [];
    }
    
    // For old dates (2023), don't filter by time range, just use all data
    const hasOldDates = data.some(d => {
      try {
        const date = new Date(d.timestamp);
        return date.getFullYear() < 2024;
      } catch (e) {
        return false;
      }
    });
    
    if (hasOldDates) {
      console.log("Using historical data (2023), not filtering by time range");
      return data;
    }
    
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
    
    // Ensure the timestamp is in the correct format
    try {
      return data.filter(item => {
        // Make sure timestamp is a valid date string
        if (!item.timestamp) return false;
        
        // Try to parse the timestamp
        let itemTime;
        try {
          itemTime = new Date(item.timestamp).getTime();
        } catch (error) {
          console.warn("Invalid timestamp format:", item.timestamp);
          return false;
        }
        
        if (isNaN(itemTime)) {
          console.warn("Invalid timestamp:", item.timestamp);
          return false;
        }
        
        return now - itemTime < rangeInMs;
      });
    } catch (error) {
      console.error("Error filtering data:", error);
      return [];
    }
  };
  
  // Prepare chart data by merging history and predictions
  const prepareChartData = (validHistory: any[]) => {
    if (validHistory.length === 0) {
      console.log("No valid history data to prepare");
      return [];
    }
    
    // For 2023 data, don't apply time range filtering
    const isHistoricalData = validHistory.some(item => {
      try {
        const date = new Date(item.timestamp);
        return date.getFullYear() < 2024;
      } catch (e) {
        return false;
      }
    });
    
    // Process historical data
    const historyData = validHistory.map(item => ({
      timestamp: item.timestamp,
      total: item.total || 0,
      socket1: item.socket1 || 0,
      socket2: item.socket2 || 0,
      socket3: item.socket3 || 0,
      predicted: undefined
    }));
    
    // Apply sorting to ensure data is in chronological order
    historyData.sort((a, b) => {
      try {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        if (isNaN(dateA) || isNaN(dateB)) {
          return 0;
        }
        return dateA - dateB;
      } catch (e) {
        return 0;
      }
    });
    
    console.log("Sorted history data:", historyData.length, "items");
    
    // Apply filtering only if not historical data
    const filteredData = isHistoricalData ? historyData : getFilteredData(historyData);
    
    // Take only the last 60 points if we have too many
    const trimmedData = filteredData.length > 60 ? filteredData.slice(-60) : filteredData;
    
    console.log("Trimmed data for chart:", trimmedData.length, "items");
    
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
      
      return [...trimmedData, ...predictionData];
    }
    
    return trimmedData;
  };
  
  // Format date for x-axis labels
  const formatXAxis = (tickItem: string) => {
    try {
      const date = new Date(tickItem);
      if (isNaN(date.getTime())) {
        return "Invalid";
      }
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error("Error formatting X-axis:", error, tickItem);
      return "Error";
    }
  };
  
  // Custom tooltip content
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      try {
        const date = new Date(label);
        const formattedDate = isNaN(date.getTime()) 
          ? "Invalid date" 
          : date.toLocaleString();
        
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
      } catch (error) {
        console.error("Error rendering tooltip:", error);
        return <div>Error displaying tooltip</div>;
      }
    }
    
    return null;
  };
  
  // Check if we have chart data to display
  const hasValidChartData = chartData && chartData.length > 0;
  
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
        {hasValidChartData ? (
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
                strokeWidth={1.5}
              />
              <Area 
                type="monotone" 
                dataKey="socket2" 
                name="Socket 2"
                stroke="#f59e0b" 
                fill="url(#colorSocket2)" 
                strokeWidth={1.5}
              />
              <Area 
                type="monotone" 
                dataKey="socket3" 
                name="Socket 3"
                stroke="#ec4899" 
                fill="url(#colorSocket3)" 
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
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No power data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PowerChart;
