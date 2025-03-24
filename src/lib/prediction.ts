
import { PowerPrediction } from './types';

// Simple linear regression function
export const predictFuturePower = (
  historicalData: { timestamp: string; total: number }[],
  predictionHours: number = 1
): PowerPrediction[] => {
  // Need at least 2 data points for a simple trend
  if (historicalData.length < 2) {
    return [];
  }

  // Get the last 60 minutes of data if available (for our prediction)
  const recentData = historicalData.slice(-60);
  
  // Calculate simple moving average for smoothing
  const sma = (values: number[], window: number) => {
    const result = [];
    for (let i = 0; i <= values.length - window; i++) {
      const windowSlice = values.slice(i, i + window);
      const sum = windowSlice.reduce((acc, val) => acc + val, 0);
      result.push(sum / window);
    }
    return result;
  };
  
  // Extract values for prediction
  const values = recentData.map(d => d.total);
  const smoothedValues = sma(values, Math.min(10, Math.floor(values.length / 2)));
  
  // If we can't calculate smoothed values, return empty predictions
  if (smoothedValues.length < 2) {
    return [];
  }

  // Simple linear regression
  const x = Array.from({ length: smoothedValues.length }, (_, i) => i);
  const y = smoothedValues;
  
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
  const sumXX = x.reduce((a, b) => a + b * b, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Generate predictions for the next 'predictionHours' hours (assuming 1 data point per minute)
  const predictions: PowerPrediction[] = [];
  const lastTimestamp = new Date(recentData[recentData.length - 1].timestamp);
  
  for (let i = 1; i <= predictionHours * 60; i++) {
    const predictedValue = slope * (x.length + i) + intercept;
    const predictedTimestamp = new Date(lastTimestamp.getTime() + i * 60000);
    
    // Add some random variation to make it more realistic
    const noise = Math.random() * 50 - 25; // Random noise between -25 and 25
    
    predictions.push({
      timestamp: predictedTimestamp.toISOString(),
      predicted: Math.max(0, predictedValue + noise) // Ensure we don't predict negative power
    });
  }
  
  return predictions;
};

// Function to adjust prediction based on real-time data
export const adjustPredictions = (
  currentPredictions: PowerPrediction[],
  actualValue: number
): PowerPrediction[] => {
  if (currentPredictions.length === 0) return [];
  
  // Calculate error factor based on first prediction vs actual
  const firstPredicted = currentPredictions[0].predicted;
  const errorFactor = actualValue / firstPredicted;
  
  // Apply a weighted correction that diminishes over time
  return currentPredictions.map((pred, index) => {
    // Weight starts at 1 and decreases with index
    const weight = Math.max(0, 1 - index / currentPredictions.length);
    const weightedError = 1 + (errorFactor - 1) * weight;
    
    return {
      ...pred,
      predicted: pred.predicted * weightedError,
      actual: index === 0 ? actualValue : undefined
    };
  });
};
