import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine, ReferenceDot
} from 'recharts';
import {
  Layers, Users, TrendingUp, Sliders, RefreshCw, AlertTriangle,
  Eye, EyeOff, ShieldAlert, Info, Bell
} from 'lucide-react';
import { fetchRegionCombinedHistory } from '../services/api';
import { analyticsWS } from '../services/websocket';

export function CombinedRegionChart({
  selectedRegionId = 'reg-entire-campus',
  regions = [],
  onSelectRegion,
  onInspectCamera
}) {
  const [timeFilter, setTimeFilter] = useState('15m'); // '5m' | '15m' | '1h' | '24h'
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visibleSeries, setVisibleSeries] = useState({}); // camera_id -> boolean
  const [showOccupancyLine, setShowOccupancyLine] = useState(true);
  const [showCapacityLine, setShowCapacityLine] = useState(true);
  const [showIndividualCameras, setShowIndividualCameras] = useState(true);
  const [showAlertMarkers, setShowAlertMarkers] = useState(true);

  const loadData = async () => {
    try {
      const data = await fetchRegionCombinedHistory(selectedRegionId, timeFilter);
      if (data) {
        setHistoryData(data);
        // Default visible series if not already set
        setVisibleSeries((prev) => {
          const next = { ...prev };
          (data.camera_series || []).forEach((c) => {
            if (next[c.id] === undefined) {
              next[c.id] = true;
            }
          });
          return next;
        });
      }
    } catch (err) {
      console.warn('Failed to load region combined history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);

    const unsubscribe = analyticsWS.subscribe((wsData) => {
      if (wsData.cameras || wsData.people_count !== undefined) {
        loadData();
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [selectedRegionId, timeFilter]);

  const toggleCameraSeries = (camId) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [camId]: !prev[camId]
    }));
  };

  const toggleAllCameras = (enable) => {
    if (!historyData?.camera_series) return;
    const next = {};
    historyData.camera_series.forEach((c) => {
      next[c.id] = enable;
    });
    setVisibleSeries(next);
  };

  const timeOptions = [
    { id: '5m', label: '5 Min' },
    { id: '15m', label: '15 Min' },
    { id: '1h', label: '1 Hour' },
    { id: '24h', label: '24 Hours' }
  ];

  const data = historyData || {
    region_id: selectedRegionId,
    region_name: 'Selected Region',
    maximum_capacity: 100,
    peak_combined_people: 0,
    avg_combined_people: 0,
    peak_occupancy: 0,
    overlap_percentage: 15,
    datapoints: [],
    camera_series: [],
    alert_events: []
  };

  // Flatten camera readings for Recharts
  const formattedDatapoints = (data.datapoints || []).map((pt) => {
    const flattened = {
      ...pt,
      time: pt.time,
      combined: pt.combined_people,
      occupancy: pt.occupancy
    };
    if (pt.camera_counts) {
      Object.keys(pt.camera_counts).forEach((cid) => {
        flattened[`cam_${cid}`] = pt.camera_counts[cid];
      });
    }
    return flattened;
  });

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md flex flex-col gap-5">
      {/* 1. Header Bar: Region Selector, Time Range Filters & Live Indicator */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold text-white tracking-wide uppercase">
                  {data.region_name} &mdash; Combined Multi-Camera Trend
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                  -{data.overlap_percentage}% Overlap Deducted
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Timestamp-synchronized regional crowd density aggregated with calibrated overlap compensation
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Region switcher and Time Range Pills */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {regions && regions.length > 0 && onSelectRegion && (
            <select
              value={selectedRegionId}
              onChange={(e) => onSelectRegion(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="reg-entire-campus">Entire Campus (All Cameras)</option>
              {regions
                .filter((r) => r.id !== 'reg-entire-campus')
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          )}

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {timeOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setTimeFilter(opt.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  timeFilter === opt.id
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs text-emerald-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Real-Time Sync</span>
          </div>
        </div>
      </div>

      {/* 2. Series Toggles & Trend KPI Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-1.5 text-slate-300 font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showCapacityLine}
              onChange={(e) => setShowCapacityLine(e.target.checked)}
              className="accent-rose-500 rounded cursor-pointer"
            />
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-rose-500 rounded inline-block"></span>
              <span>Capacity Threshold ({data.maximum_capacity})</span>
            </span>
          </label>

          <label className="flex items-center gap-1.5 text-slate-300 font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showOccupancyLine}
              onChange={(e) => setShowOccupancyLine(e.target.checked)}
              className="accent-purple-500 rounded cursor-pointer"
            />
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-purple-500 rounded inline-block"></span>
              <span>Occupancy % Trend</span>
            </span>
          </label>

          <label className="flex items-center gap-1.5 text-slate-300 font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showIndividualCameras}
              onChange={(e) => setShowIndividualCameras(e.target.checked)}
              className="accent-blue-500 rounded cursor-pointer"
            />
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>Camera Feeds Series</span>
            </span>
          </label>

          <label className="flex items-center gap-1.5 text-slate-300 font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAlertMarkers}
              onChange={(e) => setShowAlertMarkers(e.target.checked)}
              className="accent-amber-500 rounded cursor-pointer"
            />
            <span className="flex items-center gap-1">
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>Alert Markers ({data.alert_events?.length || 0})</span>
            </span>
          </label>
        </div>

        {/* Summary Badges */}
        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
          <span>Peak Combined: <strong className="text-white">{data.peak_combined_people}</strong></span>
          <span>&bull;</span>
          <span>Avg: <strong className="text-white">{data.avg_combined_people}</strong></span>
          <span>&bull;</span>
          <span>Peak Density: <strong className="text-indigo-400">{data.peak_occupancy}%</strong></span>
        </div>
      </div>

      {/* 3. Interactive Camera Series Legend Pills */}
      {showIndividualCameras && data.camera_series && data.camera_series.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>Toggle Individual Camera Comparison Series:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleAllCameras(true)}
                className="text-blue-400 hover:text-blue-300 font-bold underline"
              >
                Select All
              </button>
              <span>&bull;</span>
              <button
                type="button"
                onClick={() => toggleAllCameras(false)}
                className="text-slate-400 hover:text-slate-300 font-bold underline"
              >
                Hide All
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {data.camera_series.map((cam) => {
              const isVisible = visibleSeries[cam.id] !== false;
              return (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => toggleCameraSeries(cam.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
                    isVisible
                      ? 'bg-slate-950 text-slate-200 border-slate-700 shadow-sm'
                      : 'bg-slate-950/40 text-slate-500 border-slate-900 opacity-60'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: isVisible ? cam.color : '#475569' }}
                  ></span>
                  <span>{cam.name}</span>
                  {isVisible ? (
                    <Eye className="w-3 h-3 text-slate-400" />
                  ) : (
                    <EyeOff className="w-3 h-3 text-slate-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Chart Visualization Area */}
      <div className="w-full h-80 min-h-[300px]">
        {loading && formattedDatapoints.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500 font-semibold gap-2">
            <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
            <span>Aligning multi-camera telemetry and computing regional trend...</span>
          </div>
        ) : formattedDatapoints.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-xs text-slate-500 gap-1 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
            <AlertTriangle className="w-6 h-6 text-slate-600 mb-1" />
            <span className="font-semibold text-slate-400">No Timestamped Readings Available</span>
            <span>Cameras in {data.region_name} are either offline or awaiting initialization.</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={formattedDatapoints} margin={{ top: 16, right: 16, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="combinedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} minTickGap={25} />
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
                    const pt = payload[0].payload;
                    return (
                      <div className="bg-slate-950/95 border border-slate-800 p-3.5 rounded-2xl shadow-2xl text-xs font-sans max-w-xs">
                        <div className="text-slate-400 font-mono text-[10px] mb-2 border-b border-slate-800 pb-1">
                          {label} &bull; {pt.timestamp ? new Date(pt.timestamp).toLocaleTimeString() : 'Live'}
                        </div>

                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <span className="flex items-center gap-1.5 font-bold text-white">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                            Combined Count:
                          </span>
                          <span className="text-sm font-black text-white">{pt.combined_people}</span>
                        </div>

                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                            Occupancy:
                          </span>
                          <span className="font-bold text-purple-300">{pt.occupancy}%</span>
                        </div>

                        <div className="text-[10px] text-slate-500 font-mono my-1.5 py-1 border-t border-slate-800">
                          Raw Sum: {pt.raw_people} &bull; Overlap Deduction: -{pt.overlap_deduction}
                        </div>

                        {/* Individual Camera Breakdown */}
                        {pt.camera_counts && Object.keys(pt.camera_counts).length > 0 && (
                          <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex flex-col gap-1 max-h-32 overflow-y-auto">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Camera Points:</span>
                            {Object.entries(pt.camera_counts).map(([cid, count]) => {
                              const camMeta = data.camera_series?.find((c) => c.id === cid);
                              return (
                                <div key={cid} className="flex items-center justify-between text-[11px]">
                                  <span className="flex items-center gap-1 text-slate-300 truncate max-w-[140px]">
                                    <span
                                      className="w-1.5 h-1.5 rounded-full shrink-0"
                                      style={{ backgroundColor: camMeta?.color || '#3b82f6' }}
                                    ></span>
                                    <span>{camMeta?.name || cid}</span>
                                  </span>
                                  <strong className="text-white ml-2">{count}</strong>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Regional Capacity Reference Line */}
              {showCapacityLine && (
                <ReferenceLine
                  yAxisId="left"
                  y={data.maximum_capacity}
                  stroke="#f43f5e"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: `Regional Capacity: ${data.maximum_capacity}`,
                    fill: '#f43f5e',
                    fontSize: 10,
                    position: 'top'
                  }}
                />
              )}

              {/* Primary Regional Combined Count Area & Line */}
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="combined"
                name="Combined Regional Count"
                stroke="#6366f1"
                strokeWidth={3}
                fill="url(#combinedGrad)"
                dot={{ r: 3, fill: '#6366f1' }}
                activeDot={{ r: 7, fill: '#818cf8', stroke: '#fff', strokeWidth: 2 }}
                isAnimationActive={false}
              />

              {/* Optional Occupancy Percentage Line */}
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

              {/* Individual Camera Lines */}
              {showIndividualCameras &&
                (data.camera_series || []).map((cam) => {
                  if (visibleSeries[cam.id] === false) return null;
                  return (
                    <Line
                      key={cam.id}
                      yAxisId="left"
                      type="monotone"
                      dataKey={`cam_${cam.id}`}
                      name={cam.name}
                      stroke={cam.color}
                      strokeWidth={1.5}
                      dot={false}
                      strokeOpacity={0.85}
                      isAnimationActive={false}
                    />
                  );
                })}

              {/* Alert Event Reference Dots */}
              {showAlertMarkers &&
                (data.alert_events || []).map((alt) => {
                  // Find corresponding datapoint index or time
                  const matchPt = formattedDatapoints.find(
                    (p) => p.time === alt.time || (p.timestamp && p.timestamp.startsWith(alt.timestamp?.slice(0, 16)))
                  );
                  if (!matchPt) return null;
                  const isCrit = alt.severity === 'critical';
                  return (
                    <ReferenceDot
                      key={alt.id}
                      yAxisId="left"
                      x={matchPt.time}
                      y={matchPt.combined}
                      r={6}
                      fill={isCrit ? '#ef4444' : '#f59e0b'}
                      stroke="#fff"
                      strokeWidth={1.5}
                    />
                  );
                })}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 5. Alerts Occurred Strip */}
      {data.alert_events && data.alert_events.length > 0 && (
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="font-semibold text-slate-300">
              {data.alert_events.length} Alert Events recorded during this observation window.
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Dots plotted on trend line at incident timestamps
          </span>
        </div>
      )}
    </div>
  );
}
