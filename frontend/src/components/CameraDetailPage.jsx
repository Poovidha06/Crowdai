import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Video, Camera, Upload, Square, RefreshCw, Radio,
  Users, Settings, ShieldAlert, CheckCircle, Activity, Sparkles,
  Clock, MapPin, Sliders, Check, AlertTriangle, TrendingUp, Info
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import {
  fetchCameraDetail, updateCameraCapacity, startCameraWebcam,
  uploadCameraVideo, stopCameraStream, reconnectCameraStream,
  fetchZoneHistory, resolveAlert, attachCameraStreamUrl
} from '../services/api';
import { CameraTimeSeriesChart } from './CameraTimeSeriesChart';

export function CameraDetailPage({ cameraId, onBack, onAlertResolved }) {
  const [camera, setCamera] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Capacity & Threshold Form State
  const [capacity, setCapacity] = useState(100);
  const [warningThreshold, setWarningThreshold] = useState(75);
  const [criticalThreshold, setCriticalThreshold] = useState(90);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Time filter for trend chart
  const [timeFilter, setTimeFilter] = useState('live');
  const [historicalData, setHistoricalData] = useState([]);
  const [historySummary, setHistorySummary] = useState(null);

  // RTSP URL State
  const [showRtspModal, setShowRtspModal] = useState(false);
  const [rtspUrl, setRtspUrl] = useState('rtsp://192.168.1.100:554/live');

  const fileInputRef = useRef(null);

  // Load Camera Data
  const loadCamera = async () => {
    try {
      const data = await fetchCameraDetail(cameraId);
      if (data) {
        setCamera(data);
        setCapacity(data.capacity || 100);
        setWarningThreshold(data.warning_threshold || 75);
        setCriticalThreshold(data.critical_threshold || 90);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load camera details');
    } finally {
      setLoading(false);
    }
  };

  // Load Historical Trend Data
  const loadHistory = async () => {
    if (timeFilter === 'live') return;
    try {
      const hist = await fetchZoneHistory(cameraId, timeFilter);
      if (hist && hist.datapoints) {
        setHistoricalData(hist.datapoints);
        setHistorySummary(hist);
      }
    } catch (err) {
      console.warn('Could not load historical data:', err);
    }
  };

  useEffect(() => {
    loadCamera();
    const interval = setInterval(loadCamera, 3000);
    return () => clearInterval(interval);
  }, [cameraId]);

  useEffect(() => {
    loadHistory();
  }, [cameraId, timeFilter]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const updated = await updateCameraCapacity(cameraId, {
        capacity: parseInt(capacity, 10),
        warning_threshold: parseFloat(warningThreshold),
        critical_threshold: parseFloat(criticalThreshold)
      });
      if (updated) {
        setCamera(updated);
        setSuccessMsg('Camera capacity and crowding thresholds saved successfully!');
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      setErrorMsg(`Failed to save configuration: ${err.message}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleStartWebcam = async () => {
    setErrorMsg(null);
    try {
      await startCameraWebcam(cameraId, 0);
      await loadCamera();
    } catch (err) {
      setErrorMsg('Failed to start webcam: ' + err.message);
    }
  };

  const handleUploadVideo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setErrorMsg(null);
    try {
      await uploadCameraVideo(cameraId, file);
      await loadCamera();
    } catch (err) {
      setErrorMsg('Failed to upload video: ' + err.message);
    }
  };

  const handleStopStream = async () => {
    try {
      await stopCameraStream(cameraId);
      await loadCamera();
    } catch (err) {
      setErrorMsg('Failed to stop stream: ' + err.message);
    }
  };

  const handleReconnect = async () => {
    try {
      await reconnectCameraStream(cameraId);
      await loadCamera();
    } catch (err) {
      setErrorMsg('Failed to reconnect stream: ' + err.message);
    }
  };

  const handleAttachRtsp = async (e) => {
    e.preventDefault();
    if (!rtspUrl.trim()) return;
    setErrorMsg(null);
    try {
      await attachCameraStreamUrl(cameraId, rtspUrl.trim());
      setShowRtspModal(false);
      setSuccessMsg('RTSP stream connected successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadCamera();
    } catch (err) {
      setErrorMsg('Failed to attach RTSP stream: ' + err.message);
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      await resolveAlert(alertId);
      if (onAlertResolved) onAlertResolved();
      await loadCamera();
    } catch (err) {
      setErrorMsg('Failed to resolve alert: ' + err.message);
    }
  };

  if (loading && !camera) {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-8 bg-slate-900/60 border border-slate-800 rounded-3xl">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="relative">
            <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-blue-500/60 animate-pulse" />
            </div>
          </div>
          <p className="text-sm font-semibold text-slate-300">Loading camera data...</p>
          <p className="text-xs text-slate-500">Fetching detection pipeline telemetry</p>
        </div>
      </div>
    );
  }

  if (!camera) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-slate-900/60 border border-slate-800 rounded-3xl text-center">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
        <h3 className="text-lg font-bold text-white mb-2">Camera Not Found</h3>
        <p className="text-sm text-slate-400 mb-6">Camera ID '{cameraId}' is not registered in the system.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
        >
          Return to Cameras Grid
        </button>
      </div>
    );
  }

  const statusConfig = {
    Normal: {
      badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      bar: 'bg-emerald-500',
      text: 'text-emerald-400',
      chartColor: '#10b981'
    },
    Warning: {
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      bar: 'bg-amber-500',
      text: 'text-amber-400',
      chartColor: '#f59e0b'
    },
    Critical: {
      badge: 'bg-rose-500/25 text-rose-300 border-rose-500/50 animate-pulse',
      bar: 'bg-rose-500',
      text: 'text-rose-400',
      chartColor: '#f43f5e'
    }
  };

  const currentStatus = camera.crowd_status || 'Normal';
  const statusStyle = statusConfig[currentStatus] || statusConfig.Normal;
  const isLive = camera.connection_status === 'live';
  const isReconnecting = camera.connection_status === 'reconnecting';

  // Chart data source
  const chartData = timeFilter === 'live'
    ? (camera.trend_history || [])
    : historicalData;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Top Breadcrumb & Control Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
            title="Back to All Camera Dashboards"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-extrabold text-white tracking-wide">
                {camera.name}
              </h2>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-blue-400">
                {camera.id}
              </span>
              <span className={`text-xs font-extrabold px-3 py-0.5 rounded-full border uppercase ${statusStyle.badge}`}>
                {currentStatus} Crowd
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              <span className="text-slate-300 font-semibold">{camera.region_name}</span>
              <span>&bull;</span>
              <span className="text-slate-400">{camera.monitoring_zone}</span>
            </div>
          </div>
        </div>

        {/* Live Stream Telemetry & Quick Action Pill */}
        <div className="flex items-center gap-3">
          {isLive ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>LIVE AI PIPELINE &bull; {camera.fps || 18.5} FPS</span>
            </div>
          ) : isReconnecting ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>RECONNECTING...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              <span>OFFLINE</span>
            </div>
          )}

          <button
            onClick={onBack}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors"
          >
            Close Expanded View
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 font-bold ml-2">&times;</button>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main 2-Column Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Big Stream Player, Controls & Telemetry HUD */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Main Video Stream Monitor */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                  Live Camera Feed &amp; YOLO Detection Overlay
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                Res: 640x360 &bull; YOLOv8
              </span>
            </div>

            {/* Video Canvas Container */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner">
              {isLive ? (
                <>
                  <img
                    src={`${camera.video_feed_url || `/api/cameras/${camera.id}/feed`}?t=${Date.now()}`}
                    alt={`${camera.name} Full Stream`}
                    className="w-full h-full object-cover"
                  />
                  {/* Real-Time Detection Count Overlay Badge */}
                  <div className="absolute top-4 left-4 bg-slate-950/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/80 flex items-center gap-2 shadow-xl">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
                    <span className="text-xs font-bold text-slate-200">
                      AI Detected: <strong className="text-white text-sm">{camera.people_count || 0}</strong> people
                    </span>
                  </div>

                  {/* Telemetry Tag */}
                  <div className="absolute bottom-4 left-4 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300">
                    Confidence: <strong className="text-indigo-400">{Math.round((camera.detection_confidence || 0.88) * 100)}%</strong> &bull; FPS: <strong className="text-emerald-400">{camera.fps || 19}</strong>
                  </div>
                </>
              ) : (
                <div className="text-center p-8">
                  <div className="mx-auto w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-4">
                    <Camera className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-bold text-slate-200 mb-1">
                    {isReconnecting ? 'Reconnecting to Video Feed...' : 'Camera Stream Offline'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
                    Connect a local webcam, upload a recorded surveillance video, or initiate stream reconnection.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={handleStartWebcam}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Start Webcam</span>
                    </button>
                    <button
                      onClick={handleReconnect}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Reconnect</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Stream Action Toolbar */}
            <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={handleStartWebcam}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 active:scale-95 transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>Connect Webcam</span>
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleUploadVideo}
                  accept="video/mp4,video/avi,video/mov,video/mkv"
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 active:scale-95 transition-all"
                >
                  <Upload className="w-4 h-4 text-indigo-400" />
                  <span>Upload Video</span>
                </button>

                <button
                  onClick={handleReconnect}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reconnect</span>
                </button>

                <button
                  onClick={() => setShowRtspModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  <span>RTSP Stream</span>
                </button>
              </div>

              {isLive && (
                <button
                  onClick={handleStopStream}
                  className="px-3.5 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-2 active:scale-95 transition-all"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Stop Stream</span>
                </button>
              )}
            </div>
          </div>

          {/* AI Pipeline Telemetry Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <span>Processing FPS</span>
              </div>
              <span className="text-xl font-extrabold text-white tracking-tight">
                {camera.fps || 18.5}
              </span>
              <span className="text-[10px] text-slate-500 block">Frame rate</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Detection Conf</span>
              </div>
              <span className="text-xl font-extrabold text-indigo-400 tracking-tight">
                {Math.round((camera.detection_confidence || 0.88) * 100)}%
              </span>
              <span className="text-[10px] text-slate-500 block">YOLO accuracy</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>People Detected</span>
              </div>
              <span className="text-xl font-extrabold text-white tracking-tight">
                {camera.people_count || 0}
              </span>
              <span className="text-[10px] text-slate-500 block">Current count</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Last Processed</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-200 block truncate">
                {camera.last_processed_time ? new Date(camera.last_processed_time).toLocaleTimeString() : 'Live'}
              </span>
              <span className="text-[10px] text-slate-500 block">ISO Sync</span>
            </div>
          </div>
        </div>

        {/* Right Column: Threshold Configurator, Full Trend Graph & Active Alerts */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Crowd Status & Occupancy Meter */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                Crowd Density Status
              </h3>
              <span className={`text-xs font-extrabold px-3 py-1 rounded-full border uppercase ${statusStyle.badge}`}>
                {currentStatus}
              </span>
            </div>

            <div className="flex items-baseline justify-between mb-3">
              <div>
                <span className="text-3xl font-black text-white tracking-tight">
                  {camera.people_count || 0}
                </span>
                <span className="text-xs text-slate-400 ml-1.5">/ {camera.capacity || 50} max capacity</span>
              </div>
              <span className={`text-2xl font-black ${statusStyle.text}`}>
                {typeof camera.occupancy === 'number' ? camera.occupancy.toFixed(1) : '0.0'}%
              </span>
            </div>

            <div className="w-full bg-slate-950 rounded-full h-3 p-0.5 border border-slate-800 overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${statusStyle.bar}`}
                style={{ width: `${Math.min(100, Math.max(3, camera.occupancy || 0))}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>0% Safe</span>
              <span className="text-amber-400 font-semibold">Warning: {camera.warning_threshold || 75}%</span>
              <span className="text-rose-400 font-semibold">Critical: {camera.critical_threshold || 90}%</span>
            </div>
          </div>

          {/* Configured Capacity & Crowding Threshold Form */}
          <form
            onSubmit={handleSaveConfig}
            className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                  Capacity &amp; Threshold Configuration
                </h3>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">Camera-Specific</span>
            </div>

            {/* Capacity Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300">Maximum Camera Capacity</label>
                <span className="text-xs font-mono font-bold text-blue-400">{capacity} Persons</span>
              </div>
              <input
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white text-sm font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Warning Threshold Slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300">Warning Threshold (% Occupancy)</label>
                <span className="text-xs font-mono font-bold text-amber-400">{warningThreshold}%</span>
              </div>
              <input
                type="range"
                min="30"
                max="95"
                value={warningThreshold}
                onChange={(e) => setWarningThreshold(e.target.value)}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Critical Threshold Slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300">Critical Overcapacity Threshold (%)</label>
                <span className="text-xs font-mono font-bold text-rose-400">{criticalThreshold}%</span>
              </div>
              <input
                type="range"
                min="60"
                max="100"
                value={criticalThreshold}
                onChange={(e) => setCriticalThreshold(e.target.value)}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingConfig}
              className="mt-2 w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSavingConfig ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Capacity &amp; Thresholds</span>
                </>
              )}
            </button>
          </form>

          {/* Real-time Crowd Trend Graph */}
          <CameraTimeSeriesChart
            cameraId={cameraId}
            cameraName={camera.name}
            regionName={camera.region_name}
            capacity={camera.capacity}
            warningThreshold={camera.warning_threshold}
            criticalThreshold={camera.critical_threshold}
          />

          {/* Active Alerts Specific to this Camera */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                  Camera-Specific Active Alerts
                </h3>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300">
                {camera.active_alerts ? camera.active_alerts.length : 0} Active
              </span>
            </div>

            {camera.active_alerts && camera.active_alerts.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {camera.active_alerts.map((alt) => (
                  <div
                    key={alt.id}
                    className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start justify-between gap-3"
                  >
                    <div>
                      <span className="font-bold block text-white">{alt.title}</span>
                      <p className="text-[11px] text-rose-300/90 mt-0.5">{alt.message}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Triggered: {new Date(alt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleResolveAlert(alt.id)}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold shrink-0 transition-colors"
                    >
                      Resolve
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2.5">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <div>
                  <span className="font-bold block">No Active Alerts</span>
                  <p className="text-[11px] text-emerald-400/80">
                    Camera feed density is within safety thresholds.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RTSP Stream URL Modal */}
      {showRtspModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                Connect RTSP / IP Camera Stream
              </h4>
              <button onClick={() => setShowRtspModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAttachRtsp} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">RTSP or HTTP Stream URL</label>
                <input
                  type="text"
                  required
                  value={rtspUrl}
                  onChange={(e) => setRtspUrl(e.target.value)}
                  placeholder="rtsp://admin:pass@192.168.1.100:554/live"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRtspModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Connect Stream
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
