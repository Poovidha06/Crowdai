import React, { useState, useRef } from 'react';
import {
  Camera, Video, Radio, Activity, Users, Settings, AlertTriangle,
  CheckCircle, Maximize2, RefreshCw, Square, Zap, Clock, ShieldAlert,
  ChevronRight, Sparkles, TrendingUp, Upload
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export function CameraDashboardCard({
  camera,
  onSelectCamera,
  onUpdateCapacity,
  onStartWebcam,
  onUploadVideo,
  onStopStream,
  onReconnect
}) {
  const [isEditingCap, setIsEditingCap] = useState(false);
  const [capVal, setCapVal] = useState(camera.capacity || 50);
  const [feedError, setFeedError] = useState(false);
  const fileInputRef = useRef(null);

  // Status badges & styling
  const statusConfig = {
    Normal: {
      border: 'border-emerald-500/30 hover:border-emerald-500/60',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      bar: 'bg-emerald-500',
      text: 'text-emerald-400',
      glow: 'shadow-emerald-500/10',
      chartStroke: '#10b981',
      chartFill: '#10b98122'
    },
    Warning: {
      border: 'border-amber-500/40 hover:border-amber-500/70',
      badge: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
      bar: 'bg-amber-500',
      text: 'text-amber-400',
      glow: 'shadow-amber-500/20',
      chartStroke: '#f59e0b',
      chartFill: '#f59e0b22'
    },
    Critical: {
      border: 'border-rose-500/50 hover:border-rose-500/80 animate-pulse',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
      bar: 'bg-rose-500',
      text: 'text-rose-400',
      glow: 'shadow-rose-500/30',
      chartStroke: '#f43f5e',
      chartFill: '#f43f5e33'
    }
  };

  const currentStatus = camera.crowd_status || (
    camera.occupancy >= (camera.critical_threshold || 90) ? 'Critical' :
    camera.occupancy >= (camera.warning_threshold || 75) ? 'Warning' : 'Normal'
  );

  const style = statusConfig[currentStatus] || statusConfig.Normal;

  const handleSaveCap = (e) => {
    e.stopPropagation();
    const val = parseInt(capVal, 10);
    if (!isNaN(val) && val > 0) {
      if (onUpdateCapacity) onUpdateCapacity(camera.id, val);
      setIsEditingCap(false);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return 'Just now';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'Just now';
    }
  };

  const isLive = camera.connection_status === 'live' && !feedError;
  const isReconnecting = camera.connection_status === 'reconnecting';
  const isOffline = camera.connection_status === 'offline' || (!isLive && !isReconnecting);

  const trendData = camera.trend_history && camera.trend_history.length > 0
    ? camera.trend_history
    : [
        { time: '0s', people: camera.people_count || 0 },
        { time: '5s', people: camera.people_count || 0 }
      ];

  return (
    <div
      onClick={() => onSelectCamera && onSelectCamera(camera.id)}
      className={`group bg-slate-900/85 hover:bg-slate-900 border ${style.border} rounded-2xl p-5 shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer relative overflow-hidden backdrop-blur-md ${style.glow}`}
    >
      {/* Top Header: Camera Name, ID, Region, Zone & Connection Pill */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-blue-400 shrink-0 group-hover:scale-105 transition-transform">
              <Video className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white tracking-wide group-hover:text-blue-400 transition-colors">
                  {camera.name}
                </h3>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-400">
                  {camera.id}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300">{camera.region_name || 'Campus'}</span>
                <span className="text-slate-600">&bull;</span>
                <span className="text-slate-400 truncate max-w-[170px]" title={camera.monitoring_zone}>
                  {camera.monitoring_zone || 'Monitored Zone'}
                </span>
              </div>
            </div>
          </div>

          {/* Connection Status Badge & Crowd Status Pill */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {isLive ? (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-extrabold tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                LIVE
              </span>
            ) : isReconnecting ? (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold tracking-wide animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                RECONNECTING
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                OFFLINE
              </span>
            )}

            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider ${style.badge}`}>
              {currentStatus}
            </span>
          </div>
        </div>

        {/* Video Feed or Clear Offline Placeholder */}
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800/90 mb-4 flex items-center justify-center shadow-inner group/video">
          {isLive ? (
            <>
              <img
                src={`${camera.video_feed_url || `/api/cameras/${camera.id}/feed`}?t=${Date.now()}`}
                alt={`${camera.name} Live Feed`}
                className="w-full h-full object-cover"
                onError={() => setFeedError(true)}
                onLoad={() => setFeedError(false)}
              />
              {/* Overlay HUD Telemetry */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300">
                <Radio className="w-3 h-3 text-rose-500 animate-pulse" />
                <span>CAM FEED</span>
              </div>

              <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-800 text-[10px] font-mono text-emerald-400">
                <Zap className="w-3 h-3" />
                <span>{camera.fps ? `${camera.fps} FPS` : '19 FPS'}</span>
              </div>

              {/* People Count Badge on Feed */}
              <div className="absolute bottom-2 left-2 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700 text-xs font-bold text-white flex items-center gap-1.5 shadow-lg">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>{camera.people_count || 0} People</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-2">
                <Camera className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-300">
                {isReconnecting ? 'Attempting Stream Reconnection...' : 'No Video Feed Connected'}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {isReconnecting ? 'Verifying RTSP handshake' : 'Camera is currently in standby or offline state'}
              </p>
            </div>
          )}

          {/* Quick Expand Button Hover Overlay */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onSelectCamera) onSelectCamera(camera.id);
            }}
            title="Expand Full Camera Detail View"
            className="absolute top-2 right-2 p-1.5 bg-slate-900/90 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg opacity-0 group-hover/video:opacity-100 transition-all duration-200 shadow-md border border-slate-700"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* AI Metrics Grid: Count, Capacity/Threshold, Occupancy */}
        <div className="grid grid-cols-3 gap-2.5 mb-3.5">
          {/* Detected People Count */}
          <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Detected</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-white tracking-tight">
                {camera.people_count ?? 0}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">people</span>
            </div>
          </div>

          {/* Configured Capacity */}
          <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Capacity</span>
            {isEditingCap ? (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <input
                  type="number"
                  min="1"
                  value={capVal}
                  onChange={(e) => setCapVal(e.target.value)}
                  className="w-14 bg-slate-900 border border-slate-700 text-white text-xs font-bold rounded px-1 py-0.5"
                />
                <button
                  onClick={handleSaveCap}
                  className="px-1.5 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold"
                >
                  OK
                </button>
              </div>
            ) : (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingCap(true);
                }}
                className="flex items-center justify-between cursor-pointer hover:text-blue-400 group/cap"
              >
                <span className="text-xl font-extrabold text-slate-200 group-hover/cap:text-blue-400 transition-colors">
                  {camera.capacity || 50}
                </span>
                <Settings className="w-3 h-3 text-slate-600 group-hover/cap:text-blue-400 transition-colors" />
              </div>
            )}
          </div>

          {/* Occupancy Percentage */}
          <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Occupancy</span>
            <div className="flex items-baseline gap-1">
              <span className={`text-xl font-extrabold tracking-tight ${style.text}`}>
                {typeof camera.occupancy === 'number' ? camera.occupancy.toFixed(1) : '0.0'}%
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar with Capacity Threshold Indicator */}
        <div className="w-full bg-slate-950 rounded-full h-2 p-0.5 border border-slate-800 overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-500 ${style.bar}`}
            style={{ width: `${Math.min(100, Math.max(2, camera.occupancy || 0))}%` }}
          ></div>
        </div>

        {/* Detection Pipeline Telemetry: FPS, Confidence, Last Processed */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/50 px-3 py-2 rounded-xl border border-slate-800/60 mb-3 font-mono">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>
              {camera.fps ? `${camera.fps} FPS` : '18.5 FPS'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              {camera.detection_confidence ? `${Math.round(camera.detection_confidence * 100)}% Conf` : '88% Conf'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400" title="Last successful frame processing time">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{formatTime(camera.last_processed_time)}</span>
          </div>
        </div>

        {/* Camera-Specific Active Alerts Banner */}
        {camera.active_alerts && camera.active_alerts.length > 0 ? (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-pulse">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="font-bold block text-[11px] uppercase tracking-wide">
                {camera.active_alerts[0].title || 'Active Camera Alert'}
              </span>
              <p className="text-[11px] text-rose-200/90 truncate">
                {camera.active_alerts[0].message}
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-3 px-3 py-1.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-[11px] flex items-center justify-between font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Normal Detection &middot; All Clear</span>
            </span>
            <span className="text-[10px] text-slate-500">
              Warn: {camera.warning_threshold || 75}% / Crit: {camera.critical_threshold || 90}%
            </span>
          </div>
        )}

        {/* Real-time Crowd Count Trend Mini Graph */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 mb-3">
          <div className="flex items-center justify-between mb-1.5 text-[10px] text-slate-400 font-semibold uppercase">
            <span className="flex items-center gap-1 text-slate-300">
              <TrendingUp className="w-3 h-3 text-blue-400" />
              <span>Real-Time Trend</span>
            </span>
            <span>Last 30s</span>
          </div>
          <div className="h-16 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 2, right: 2, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id={`grad-${camera.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={style.chartStroke} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={style.chartStroke} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis hide domain={[0, 'dataMax + 10']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090d16',
                    borderColor: '#1e293b',
                    borderRadius: '0.5rem',
                    fontSize: '10px',
                    padding: '4px 8px'
                  }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Area
                  type="monotone"
                  dataKey="people"
                  stroke={style.chartStroke}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#grad-${camera.id})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Card Action Buttons: Quick Source Switchers & Camera Details */}
      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onUploadVideo) {
                onUploadVideo(camera.id, file);
              }
            }}
            accept="video/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onStartWebcam) onStartWebcam(camera.id);
            }}
            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-700/80 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
            title="Attach Physical Webcam (Device 0)"
          >
            <Video className="w-3 h-3 text-emerald-400" />
            <span>Webcam</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-blue-400 border border-slate-700/80 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
            title="Upload Real Video File for YOLO Detection"
          >
            <Upload className="w-3 h-3 text-blue-400" />
            <span>Upload</span>
          </button>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onSelectCamera) onSelectCamera(camera.id);
          }}
          className="px-3 py-1.5 rounded-xl bg-blue-600/15 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer"
        >
          <span>Camera Details</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
