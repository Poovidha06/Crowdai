import React, { useState, useEffect } from 'react';
import {
  Users, Building2, Percent, Bell, Camera, ShieldAlert,
  AlertTriangle, CheckCircle, RefreshCw, Sliders, Info,
  Activity, Clock, ChevronDown, ChevronUp, Layers, HelpCircle
} from 'lucide-react';
import { fetchRegionCombinedAnalytics, updateRegionOverlap } from '../services/api';
import { analyticsWS } from '../services/websocket';

export function CombinedRegionAnalytics({
  selectedRegionId = 'reg-entire-campus',
  regions = [],
  onSelectRegion,
  onSelectCamera
}) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showOverlapSettings, setShowOverlapSettings] = useState(false);
  const [overlapVal, setOverlapVal] = useState(15);
  const [isUpdatingOverlap, setIsUpdatingOverlap] = useState(false);

  const loadAnalytics = async () => {
    try {
      const data = await fetchRegionCombinedAnalytics(selectedRegionId);
      if (data) {
        setAnalytics(data);
        setOverlapVal(data.overlap_percentage || 15);
      }
    } catch (err) {
      console.warn('Failed to load combined region analytics:', err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    const interval = setInterval(loadAnalytics, 2500);

    // Auto-update metrics immediately as new camera results arrive over WebSocket
    const unsubscribe = analyticsWS.subscribe((wsData) => {
      if (wsData.cameras || wsData.people_count !== undefined) {
        loadAnalytics();
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [selectedRegionId]);

  const handleSaveOverlap = async () => {
    setIsUpdatingOverlap(true);
    try {
      const updated = await updateRegionOverlap(selectedRegionId, parseFloat(overlapVal));
      if (updated) {
        setAnalytics(updated);
      }
    } catch (err) {
      console.error('Failed to update overlap:', err);
    } finally {
      setIsUpdatingOverlap(false);
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'Just now';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'Just now';
    }
  };

  if (loading && !analytics) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400 text-sm font-semibold">
          <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
          <span>Synthesizing multi-camera regional telemetry...</span>
        </div>
      </div>
    );
  }

  const data = analytics || {
    region_id: selectedRegionId,
    region_name: 'Selected Region',
    total_active_cameras: 0,
    total_offline_cameras: 0,
    total_registered_cameras: 0,
    coverage_percentage: 0.0,
    raw_people_count: 0,
    overlap_deduction: 0,
    overlap_percentage: 15.0,
    combined_people_count: 0,
    is_estimated_aggregate: false,
    overlap_strategy: 'direct_camera_count',
    limitation_note: 'No feeds currently reporting.',
    maximum_capacity: 100,
    overall_occupancy: 0.0,
    warning_cameras_count: 0,
    critical_cameras_count: 0,
    total_active_alerts: 0,
    active_alerts: [],
    latest_update_timestamp: new Date().toISOString(),
    crowd_status: 'Normal',
    offline_cameras: [],
    data_integrity_warning: null
  };

  const statusStyles = {
    Normal: {
      badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      bar: 'bg-emerald-500',
      text: 'text-emerald-400',
      glow: 'shadow-emerald-500/10'
    },
    Warning: {
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      bar: 'bg-amber-500',
      text: 'text-amber-400',
      glow: 'shadow-amber-500/20'
    },
    Critical: {
      badge: 'bg-rose-500/25 text-rose-300 border-rose-500/50 animate-pulse',
      bar: 'bg-rose-500',
      text: 'text-rose-400',
      glow: 'shadow-rose-500/30'
    }
  };

  const currentStyle = statusStyles[data.crowd_status] || statusStyles.Normal;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md flex flex-col gap-6">
      {/* 1. Header Bar: Region Selector, Status Badge & Last Sync Timestamp */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-white tracking-wide uppercase">
                  {data.region_name} &mdash; Multi-Camera Analytics
                </h2>
                <span className={`text-xs font-black px-3 py-0.5 rounded-full border uppercase ${currentStyle.badge}`}>
                  {data.crowd_status} Crowd
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Unified regional telemetry synthesized from all active camera detection pipelines
              </p>
            </div>
          </div>
        </div>

        {/* Region Switcher & Last Timestamp Badge */}
        <div className="flex items-center gap-3 flex-wrap">
          {regions && regions.length > 0 && onSelectRegion && (
            <select
              value={selectedRegionId}
              onChange={(e) => onSelectRegion(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer"
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

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Latest: <strong>{formatTimestamp(data.latest_update_timestamp)}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. Core Combined Metrics Cards (Grid of 6 Key Multi-Camera KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Metric 1: Combined People Count (with Overlap Calibration Badge) */}
        <div className="bg-slate-950/70 border border-slate-800/90 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span className="uppercase text-[10px] text-slate-500 font-bold">Combined Count</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white tracking-tight">
                {data.combined_people_count}
              </span>
              <span className="text-xs text-slate-400 font-medium">people</span>
            </div>
            {data.is_estimated_aggregate ? (
              <span className="inline-block mt-1 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                Calibrated Aggregate
              </span>
            ) : (
              <span className="inline-block mt-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Direct Camera Sum
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 mt-2 font-mono">
            Raw: {data.raw_people_count} &bull; Deduct: -{data.overlap_deduction}
          </div>
        </div>

        {/* Metric 2: Maximum Regional Capacity */}
        <div className="bg-slate-950/70 border border-slate-800/90 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span className="uppercase text-[10px] text-slate-500 font-bold">Region Capacity</span>
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-2xl font-black text-white tracking-tight">
              {data.maximum_capacity}
            </span>
            <span className="text-xs text-slate-400 ml-1 font-medium">max cap</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-2">
            Safety threshold across cameras
          </span>
        </div>

        {/* Metric 3: Overall Occupancy % */}
        <div className="bg-slate-950/70 border border-slate-800/90 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span className="uppercase text-[10px] text-slate-500 font-bold">Overall Occupancy</span>
            <Percent className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <span className={`text-2xl font-black tracking-tight ${currentStyle.text}`}>
              {typeof data.overall_occupancy === 'number' ? data.overall_occupancy.toFixed(1) : '0.0'}%
            </span>
          </div>
          {/* Visual Mini Progress Bar */}
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden mt-2 border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${currentStyle.bar}`}
              style={{ width: `${Math.min(100, Math.max(3, data.overall_occupancy || 0))}%` }}
            ></div>
          </div>
        </div>

        {/* Metric 4: Total Active Cameras */}
        <div className="bg-slate-950/70 border border-slate-800/90 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span className="uppercase text-[10px] text-slate-500 font-bold">Active Cameras</span>
            <Camera className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white tracking-tight">
                {data.total_active_cameras}
              </span>
              <span className="text-xs text-slate-400">/ {data.total_registered_cameras} live</span>
            </div>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold mt-2">
            {data.coverage_percentage}% Live Coverage
          </span>
        </div>

        {/* Metric 5: Number of Offline Cameras (Explicit Stale Tracking) */}
        <div className={`p-4 rounded-2xl flex flex-col justify-between border ${
          data.total_offline_cameras > 0
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            : 'bg-slate-950/70 border-slate-800/90 text-slate-300'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span className="uppercase text-[10px] font-bold">Offline Cameras</span>
            <AlertTriangle className={`w-4 h-4 ${data.total_offline_cameras > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-600'}`} />
          </div>
          <div>
            <span className={`text-2xl font-black tracking-tight ${data.total_offline_cameras > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
              {data.total_offline_cameras}
            </span>
            <span className="text-xs text-slate-400 ml-1">unmonitored</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-2 font-medium">
            {data.total_offline_cameras > 0 ? 'Not assumed zero count' : 'All cameras online'}
          </span>
        </div>

        {/* Metric 6: Cameras in Warning / Critical & Total Alerts */}
        <div className="bg-slate-950/70 border border-slate-800/90 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span className="uppercase text-[10px] text-slate-500 font-bold">Cameras In Alert</span>
            <Bell className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-black text-white tracking-tight">
                {data.warning_cameras_count + data.critical_cameras_count}
              </span>
              <span className="text-xs text-slate-400">cams</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-2 font-mono">
            <span className="text-amber-400">{data.warning_cameras_count} Warn</span>
            <span>&bull;</span>
            <span className="text-rose-400">{data.critical_cameras_count} Crit</span>
          </div>
        </div>
      </div>

      {/* 3. Explicit Data Integrity & Stale Detection Banner */}
      {data.data_integrity_warning ? (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="text-white block text-sm mb-0.5">
              Partial Coverage &amp; Stale Detection Warning
            </strong>
            <p className="text-amber-200/90 text-xs leading-relaxed">
              {data.data_integrity_warning}
            </p>
            {data.offline_cameras && data.offline_cameras.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-amber-500/20 flex flex-wrap gap-2">
                {data.offline_cameras.map((off) => (
                  <button
                    key={off.id}
                    type="button"
                    onClick={() => onSelectCamera && onSelectCamera(off.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-amber-500/30 hover:border-amber-500 text-[11px] font-mono text-amber-300 transition-colors cursor-pointer text-left"
                    title="Click to view camera detail & diagnostics"
                  >
                    <span className="font-bold underline decoration-amber-500/40">{off.name}</span>
                    <span className="text-slate-500">&bull;</span>
                    <span>Last count: <strong>{off.last_known_count}</strong></span>
                    <span className="text-slate-500">&bull;</span>
                    <span className="text-amber-400 uppercase text-[10px]">{off.status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">
              Full Multi-Camera Coverage &mdash; All {data.total_registered_cameras} cameras reporting valid timestamped frames.
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Sync Time: {formatTimestamp(data.latest_update_timestamp)}
          </span>
        </div>
      )}

      {/* 4. Double-Counting Prevention Strategy & Overlap Calibration Disclosure */}
      <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wide">
              Shared-Area Overlap &amp; Double-Counting Calibration
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
              Strategy: {data.overlap_strategy}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowOverlapSettings(!showOverlapSettings)}
            className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            <span>{showOverlapSettings ? 'Hide Calibration Settings' : 'Configure Overlap Deduction'}</span>
            {showOverlapSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Limitation Documentation Alert Callout */}
        <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-slate-300 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed text-slate-300">
            <strong className="text-white block mb-0.5">Double-Counting Prevention Notice:</strong>
            {data.limitation_note}
            <span className="block mt-1 text-slate-400">
              When multiple cameras observe contiguous spaces, raw counts are adjusted using calibrated shared-area overlap modeling. Cross-camera biometric ReID is not active; values represent a calibrated estimated aggregate.
            </span>
          </div>
        </div>

        {/* Expandable Overlap Deduction Slider */}
        {showOverlapSettings && (
          <div className="mt-2 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1 w-full">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-semibold">Shared Vantage Overlap Deduction</span>
                <span className="font-mono font-bold text-blue-400">{overlapVal}% Deduction</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="5"
                value={overlapVal}
                onChange={(e) => setOverlapVal(e.target.value)}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>0% (Raw Sum)</span>
                <span>15% (Recommended)</span>
                <span>40% (High Overlap)</span>
              </div>
            </div>

            <button
              onClick={handleSaveOverlap}
              disabled={isUpdatingOverlap}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/20 active:scale-95 disabled:opacity-50 shrink-0"
            >
              {isUpdatingOverlap ? 'Saving...' : 'Apply Calibration'}
            </button>
          </div>
        )}
      </div>

      {/* 5. Active Alerts in Region List */}
      {data.active_alerts && data.active_alerts.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wide">
                Active Alerts in {data.region_name} ({data.total_active_alerts})
              </h4>
            </div>
            <span className="text-[10px] font-mono text-rose-400 uppercase font-bold">Immediate Attention</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {data.active_alerts.map((alt) => (
              <div
                key={alt.id}
                className="p-2.5 rounded-xl bg-slate-950/80 border border-rose-500/30 text-xs flex items-start justify-between gap-2"
              >
                <div>
                  <strong className="text-white block text-[11px]">{alt.title}</strong>
                  <p className="text-rose-200/90 text-[11px] mt-0.5">{alt.message}</p>
                </div>
                <span className="text-[10px] font-mono text-slate-500 shrink-0">
                  {formatTimestamp(alt.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
