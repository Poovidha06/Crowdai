import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine, Legend
} from 'recharts';
import { TrendingUp, Clock, Sliders, RefreshCw, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { fetchCameraHistory } from '../services/api';
import { analyticsWS } from '../services/websocket';

export function CameraTimeSeriesChart({
  cameraId,
  cameraName = 'Camera',
  regionName = 'Campus Area',
  capacity = 100,
  warningThreshold = 75,
  criticalThreshold = 90,
  onInspectCamera
}) {
  const [timeFilter, setTimeFilter] = useState('15m'); // '5m' | '15m' | '1h' | '24h'
  const [chartData, setChartData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCapacityLine, setShowCapacityLine] = useState(true);
  const [showWarningLine, setShowWarningLine] = useState(true);
  const [showOccupancyLine, setShowOccupancyLine] = useState(false);

  const loadData = async () => {
    if (!cameraId) return;
    try {
      const data = await fetchCameraHistory(cameraId, timeFilter);
      if (data && data.datapoints) {
        setChartData(data.datapoints);
        setSummary(data);
      }
    } catch (err) {
      console.warn(`Error loading history for ${cameraId}:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);

    // Auto-update as new camera results arrive over WebSocket
    const unsubscribe = analyticsWS.subscribe((wsData) => {
      if (wsData.cameras) {
        const thisCam = wsData.cameras.find((c) => c.id === cameraId);
        if (thisCam) {
          loadData();
        }
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [cameraId, timeFilter]);

  const timeOptions = [
    { id: '5m', label: '5 Min' },
    { id: '15m', label: '15 Min' },
    { id: '1h', label: '1 Hour' },
    { id: '24h', label: '24 Hours' }
  ];

  const warningValue = Math.round((capacity * warningThreshold) / 100);
  const criticalValue = Math.round((capacity * criticalThreshold) / 100);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col gap-4 backdrop-blur-md">
      {/* Chart Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              {cameraName} &mdash; People Count Trend
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
              {regionName}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Real-time time-series telemetry filtered specifically for {cameraId}
          </p>
        </div>

        {/* Time Filter Pills & Live Status */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {timeOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setTimeFilter(opt.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  timeFilter === opt.id
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-emerald-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live Stream</span>
          </div>
        </div>
      </div>

      {/* Threshold & Metric Toggles Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-1.5 text-slate-300 text-[11px] font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showCapacityLine}
              onChange={(e) => setShowCapacityLine(e.target.checked)}
              className="accent-rose-500 rounded cursor-pointer"
            />
            <span className="flex items-center gap-1">
              <span className="w-2 h-0.5 bg-rose-500 rounded inline-block"></span>
              <span>Capacity ({capacity})</span>
            </span>
          </label>

          <label className="flex items-center gap-1.5 text-slate-300 text-[11px] font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showWarningLine}
              onChange={(e) => setShowWarningLine(e.target.checked)}
              className="accent-amber-500 rounded cursor-pointer"
            />
            <span className="flex items-center gap-1">
              <span className="w-2 h-0.5 bg-amber-500 rounded inline-block"></span>
              <span>Warning ({warningValue})</span>
            </span>
          </label>

          <label className="flex items-center gap-1.5 text-slate-300 text-[11px] font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showOccupancyLine}
              onChange={(e) => setShowOccupancyLine(e.target.checked)}
              className="accent-purple-500 rounded cursor-pointer"
            />
            <span className="flex items-center gap-1">
              <span className="w-2 h-0.5 bg-purple-500 rounded inline-block"></span>
              <span>Occupancy %</span>
            </span>
          </label>
        </div>

        {summary && (
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span>Peak: <strong className="text-white">{summary.peak_people}</strong></span>
            <span>&bull;</span>
            <span>Avg: <strong className="text-white">{summary.avg_people}</strong></span>
            <span>&bull;</span>
            <span>Peak Occ: <strong className="text-blue-400">{summary.peak_occupancy}%</strong></span>
          </div>
        )}
      </div>

      {/* Main Chart Canvas */}
      <div className="w-full h-64 min-h-[240px]">
        {loading && chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500 font-semibold gap-2">
            <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
            <span>Loading time-series readings for {cameraName}...</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-xs text-slate-500 gap-1 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
            <AlertCircle className="w-6 h-6 text-slate-600 mb-1" />
            <span className="font-semibold text-slate-400">No Valid Detections In Range</span>
            <span>Camera may be offline or initializing detection pipeline.</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 12, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="time"
                stroke="#64748b"
                tick={{ fontSize: 10 }}
                minTickGap={20}
              />
              <YAxis
                yAxisId="left"
                stroke="#64748b"
                tick={{ fontSize: 10 }}
                allowDecimals={false}
              />
              {showOccupancyLine && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#a855f7"
                  tick={{ fontSize: 10 }}
                  unit="%"
                  domain={[0, 120]}
                />
              )}
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-950/95 border border-slate-800 p-3 rounded-xl shadow-2xl text-xs font-sans">
                        <div className="text-slate-400 font-mono text-[10px] mb-1">
                          {label} ({data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'Live'})
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                          <span className="text-slate-200">People Count:</span>
                          <strong className="text-white text-sm">{data.people}</strong>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                          <span className="text-slate-200">Occupancy:</span>
                          <strong className="text-purple-300">{data.occupancy}%</strong>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 pt-1 border-t border-slate-800">
                          Capacity Limit: {capacity} &bull; Status: {data.status || 'Normal'}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Reference Lines for Capacity & Thresholds */}
              {showCapacityLine && (
                <ReferenceLine
                  yAxisId="left"
                  y={capacity}
                  stroke="#f43f5e"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: `Capacity: ${capacity}`,
                    fill: '#f43f5e',
                    fontSize: 10,
                    position: 'top'
                  }}
                />
              )}

              {showWarningLine && (
                <ReferenceLine
                  yAxisId="left"
                  y={warningValue}
                  stroke="#f59e0b"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  label={{
                    value: `Warn: ${warningValue}`,
                    fill: '#f59e0b',
                    fontSize: 10,
                    position: 'insideBottomRight'
                  }}
                />
              )}

              {/* Main People Count Line */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="people"
                name="People Count"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ r: 2.5, fill: '#3b82f6' }}
                activeDot={{ r: 6, fill: '#60a5fa', stroke: '#fff', strokeWidth: 2 }}
                isAnimationActive={false}
              />

              {/* Optional Occupancy Line */}
              {showOccupancyLine && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="occupancy"
                  name="Occupancy %"
                  stroke="#a855f7"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
