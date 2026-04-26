import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, Droplets, Thermometer, Cpu, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { TelemetryData, AlertLevel, AiSuggestion } from './types.ts';
import { generateEnvironmentalAdvice } from './services/geminiService.ts';
import { LedIndicator } from './components/LedIndicator.tsx';
import { MetricCard } from './components/MetricCard.tsx';

// --- Simulation Helpers ---
const generateNoise = (base: number, variance: number) => {
  return base + (Math.random() * variance * 2 - variance);
};

// Simplified Heat Index calculation for simulation purposes
const calculateHeatIndex = (temp: number, humidity: number): number => {
  // A very basic approximation for visual effect
  return temp + (0.33 * humidity) - 15; 
};

const determineAlertLevel = (temp: number, humidity: number): AlertLevel => {
  if (temp > 32 || humidity > 80) return 'CRITICAL';
  if (temp > 28 || humidity > 65) return 'WARNING';
  return 'NORMAL';
};

export default function App() {
  // --- State ---
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryData[]>([]);
  const [currentTelemetry, setCurrentTelemetry] = useState<TelemetryData | null>(null);
  const [alertLevel, setAlertLevel] = useState<AlertLevel>('NORMAL');
  
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
  const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false);

  // Refs for simulation to avoid dependency cycles in intervals
  const simBaseTemp = useRef(24);
  const simBaseHum = useRef(50);
  const simTrend = useRef(1); // 1 for rising, -1 for falling

  // --- Simulation Effect ---
  useEffect(() => {
    // Initialize with some historical data
    const initialHistory: TelemetryData[] = [];
    let t = Date.now() - 60000 * 20; // 20 mins ago
    for (let i = 0; i < 20; i++) {
      const temp = generateNoise(24, 2);
      const hum = generateNoise(50, 5);
      initialHistory.push({
        temperature: temp,
        humidity: hum,
        heatIndex: calculateHeatIndex(temp, hum),
        timestamp: t + (i * 60000)
      });
    }
    setTelemetryHistory(initialHistory);
    setCurrentTelemetry(initialHistory[initialHistory.length - 1]);

    // Start real-time simulation
    const interval = setInterval(() => {
      // Slowly drift base values to simulate environmental changes
      if (Math.random() > 0.9) simTrend.current *= -1;
      
      simBaseTemp.current += (0.1 * simTrend.current) + generateNoise(0, 0.2);
      simBaseHum.current += (0.5 * simTrend.current) + generateNoise(0, 1);

      // Clamp values to somewhat realistic ranges for a facility
      simBaseTemp.current = Math.max(18, Math.min(36, simBaseTemp.current));
      simBaseHum.current = Math.max(30, Math.min(90, simBaseHum.current));

      const newTemp = generateNoise(simBaseTemp.current, 0.5);
      const newHum = generateNoise(simBaseHum.current, 2);
      
      const newData: TelemetryData = {
        temperature: newTemp,
        humidity: newHum,
        heatIndex: calculateHeatIndex(newTemp, newHum),
        timestamp: Date.now()
      };

      setCurrentTelemetry(newData);
      setTelemetryHistory(prev => {
        const newHistory = [...prev, newData];
        if (newHistory.length > 30) newHistory.shift(); // Keep last 30 points
        return newHistory;
      });

      const newLevel = determineAlertLevel(newTemp, newHum);
      setAlertLevel(newLevel);

    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, []);

  // --- AI Orchestration Effect ---
  const fetchAdvice = useCallback(async (data: TelemetryData, level: AlertLevel) => {
    setIsGeneratingAdvice(true);
    try {
      const text = await generateEnvironmentalAdvice(data, level);
      setAiSuggestion({
        text,
        timestamp: Date.now(),
        level
      });
    } catch (error) {
      console.error("Failed to fetch advice", error);
    } finally {
      setIsGeneratingAdvice(false);
    }
  }, []);

  // Trigger AI when alert level changes significantly, or on initial load
  useEffect(() => {
    if (!currentTelemetry) return;

    // Initial fetch
    if (!aiSuggestion) {
      fetchAdvice(currentTelemetry, alertLevel);
      return;
    }

    // Fetch if level changes to WARNING or CRITICAL
    if (alertLevel !== aiSuggestion.level && alertLevel !== 'NORMAL') {
       fetchAdvice(currentTelemetry, alertLevel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertLevel, currentTelemetry]); // Intentionally omitting aiSuggestion to avoid loops


  const handleManualRefresh = () => {
    if (currentTelemetry) {
      fetchAdvice(currentTelemetry, alertLevel);
    }
  };

  if (!currentTelemetry) {
    return <div className="flex items-center justify-center min-h-screen">Initializing Telemetry...</div>;
  }

  // Determine trends for UI
  const prevTelemetry = telemetryHistory.length > 1 ? telemetryHistory[telemetryHistory.length - 2] : currentTelemetry;
  const tempTrend = currentTelemetry.temperature > prevTelemetry.temperature + 0.2 ? 'up' : currentTelemetry.temperature < prevTelemetry.temperature - 0.2 ? 'down' : 'stable';
  const humTrend = currentTelemetry.humidity > prevTelemetry.humidity + 1 ? 'up' : currentTelemetry.humidity < prevTelemetry.humidity - 1 ? 'down' : 'stable';

  // Format data for Recharts
  const chartData = telemetryHistory.map(d => ({
    time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    Temp: Number(d.temperature.toFixed(1)),
    Hum: Number(d.humidity.toFixed(1))
  }));

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-dashboard-border">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cpu className="text-blue-400" />
            EcoSentinel Orchestrator
          </h1>
          <p className="text-dashboard-muted text-sm mt-1">Autonomous ESP32 Telemetry & Control Node</p>
        </div>
        
        {/* Hardware Status Indicators */}
        <div className="flex items-center gap-6 bg-dashboard-card p-3 rounded-xl border border-dashboard-border">
          <div className="text-sm font-medium text-dashboard-muted mr-2">SYSTEM STATUS:</div>
          <LedIndicator 
            color="green" 
            active={alertLevel === 'NORMAL'} 
            label="NOMINAL" 
          />
          <LedIndicator 
            color="yellow" 
            active={alertLevel === 'WARNING'} 
            label="WARN" 
          />
          <LedIndicator 
            color="red" 
            active={alertLevel === 'CRITICAL'} 
            label="ALERT" 
          />
        </div>
      </header>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard 
          title="Ambient Temperature" 
          value={currentTelemetry.temperature} 
          unit="°C" 
          icon={Thermometer}
          trend={tempTrend}
          alertLevel={currentTelemetry.temperature > 32 ? 'CRITICAL' : currentTelemetry.temperature > 28 ? 'WARNING' : 'NORMAL'}
        />
        <MetricCard 
          title="Relative Humidity" 
          value={currentTelemetry.humidity} 
          unit="%" 
          icon={Droplets}
          trend={humTrend}
          alertLevel={currentTelemetry.humidity > 80 ? 'CRITICAL' : currentTelemetry.humidity > 65 ? 'WARNING' : 'NORMAL'}
        />
        <MetricCard 
          title="Calculated Heat Index" 
          value={currentTelemetry.heatIndex} 
          unit="HI" 
          icon={Activity}
          alertLevel={alertLevel}
        />
      </div>

      {/* AI Orchestration Panel */}
      <div className="bg-dashboard-card border border-dashboard-border rounded-xl overflow-hidden">
        <div className="bg-slate-800/50 p-4 border-b border-dashboard-border flex justify-between items-center">
          <h2 className="font-semibold flex items-center gap-2">
            <Activity size={18} className="text-purple-400" />
            AI Orchestration Agent
          </h2>
          <button 
            onClick={handleManualRefresh}
            disabled={isGeneratingAdvice}
            className="text-xs flex items-center gap-1 bg-dashboard-bg hover:bg-slate-700 px-3 py-1.5 rounded-md border border-dashboard-border transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={isGeneratingAdvice ? "animate-spin" : ""} />
            {isGeneratingAdvice ? "Analyzing..." : "Request Analysis"}
          </button>
        </div>
        <div className="p-6">
          {isGeneratingAdvice && !aiSuggestion ? (
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-2 bg-slate-700 rounded w-3/4"></div>
                <div className="h-2 bg-slate-700 rounded w-5/6"></div>
              </div>
            </div>
          ) : aiSuggestion ? (
            <div className="flex items-start gap-4">
              <div className="mt-1">
                {aiSuggestion.level === 'NORMAL' && <CheckCircle2 className="text-green-500" size={24} />}
                {aiSuggestion.level === 'WARNING' && <AlertTriangle className="text-yellow-500" size={24} />}
                {aiSuggestion.level === 'CRITICAL' && <AlertTriangle className="text-red-500 animate-pulse" size={24} />}
              </div>
              <div>
                <div className="text-sm text-dashboard-muted mb-1">
                  Latest Directive • {new Date(aiSuggestion.timestamp).toLocaleTimeString()}
                </div>
                <p className="text-lg leading-relaxed text-slate-200">
                  {aiSuggestion.text}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-dashboard-muted">Awaiting telemetry data for analysis...</p>
          )}
        </div>
      </div>

      {/* Telemetry Chart */}
      <div className="bg-dashboard-card border border-dashboard-border rounded-xl p-6">
        <h2 className="font-semibold mb-6 text-dashboard-muted uppercase tracking-wider text-sm">Telemetry History (Last 30 Cycles)</h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis 
                dataKey="time" 
                stroke="#94a3b8" 
                fontSize={12} 
                tickMargin={10}
                minTickGap={30}
              />
              <YAxis 
                yAxisId="left" 
                stroke="#94a3b8" 
                fontSize={12} 
                domain={['dataMin - 2', 'dataMax + 2']} 
                tickFormatter={(val) => `${val}°`}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                stroke="#94a3b8" 
                fontSize={12} 
                domain={['dataMin - 5', 'dataMax + 5']}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                itemStyle={{ color: '#f8fafc' }}
              />
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="Temp" 
                stroke="#f87171" 
                strokeWidth={2} 
                dot={false} 
                isAnimationActive={false}
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="Hum" 
                stroke="#60a5fa" 
                strokeWidth={2} 
                dot={false} 
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
