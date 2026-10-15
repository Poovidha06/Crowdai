import React, { useState, useEffect } from 'react';
import {
  Bell, ShieldAlert, AlertTriangle, Info, CheckCircle,
  XCircle, Filter, Search, Trash2, Check, ExternalLink,
  RefreshCw, Volume2, VolumeX, Eye
} from 'lucide-react';
import {
  fetchFilteredAlerts, acknowledgeAlert, resolveAlert,
  clearAlert, clearAllResolvedAlerts
} from '../services/api';
import { analyticsWS } from '../services/websocket';

export function SmartAlertPanel({
  regions = [],
  cameras = [],
  selectedRegionId = 'all',
  onSelectCamera,
  onZoomToMapCamera
}) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState(selectedRegionId || 'all');
  const [cameraFilter, setCameraFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'acknowledged' | 'resolved'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [latestCriticalAlert, setLatestCriticalAlert] = useState(null);

  // Sync region filter when prop changes
  useEffect(() => {
    if (selectedRegionId) {
      setRegionFilter(selectedRegionId);
    }
  }, [selectedRegionId]);

  const loadAlerts = async () => {
    try {
      const data = await fetchFilteredAlerts({
        region_id: regionFilter,
        camera_id: cameraFilter,
        severity: severityFilter,
        status: statusFilter,
        limit: 100
      });
      if (data) {
        setAlerts(data);

        // Check if there's an unacknowledged critical alert for user notification
        const criticalUnack = data.find(
          (a) => a.severity === 'critical' && !a.acknowledged && !a.resolved
        );
        if (criticalUnack) {
          setLatestCriticalAlert(criticalUnack);
        } else {
          setLatestCriticalAlert(null);
        }
      }
    } catch (err) {
      console.warn('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 2500);

    // WebSocket trigger on alert broadcast
    const unsubscribe = analyticsWS.subscribe((wsData) => {
      if (wsData.alerts || wsData.cameras) {
        loadAlerts();
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [regionFilter, cameraFilter, severityFilter, statusFilter]);

  // Action Handlers
  const handleAcknowledge = async (alertId) => {
    try {
      await acknowledgeAlert(alertId, 'Security Operator');
      loadAlerts();
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const handleResolve = async (alertId) => {
    try {
      await resolveAlert(alertId);
      loadAlerts();
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  const handleClear = async (alertId) => {
    try {
      await clearAlert(alertId);
      loadAlerts();
    } catch (err) {
      console.error('Failed to clear alert:', err);
    }
  };

  const handleClearAllResolved = async () => {
    try {
      await clearAllResolvedAlerts();
      loadAlerts();
    } catch (err) {
      console.error('Failed to clear resolved alerts:', err);
    }
  };

  // Client-side text search filter
  const filteredAlerts = alerts.filter((alt) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      alt.message.toLowerCase().includes(q) ||
      alt.title.toLowerCase().includes(q) ||
      (alt.camera_name && alt.camera_name.toLowerCase().includes(q)) ||
      (alt.region_name && alt.region_name.toLowerCase().includes(q)) ||
      alt.alert_type.toLowerCase().includes(q)
    );
  });

  const severityStyles = {
    critical: {
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      icon: ShieldAlert,
      iconColor: 'text-rose-400',
      card: 'bg-rose-950/20 border-rose-500/40'
    },
    warning: {
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: AlertTriangle,
      iconColor: 'text-amber-400',
      card: 'bg-amber-950/20 border-amber-500/40'
    },
    system: {
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      icon: AlertCircleIcon,
      iconColor: 'text-purple-400',
      card: 'bg-purple-950/20 border-purple-500/40'
    },
    info: {
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      icon: Info,
      iconColor: 'text-blue-400',
      card: 'bg-slate-900/60 border-slate-800'
    }
  };

  function AlertCircleIcon(props) {
    return <AlertTriangle {...props} />;
  }

  const activeCount = alerts.filter((a) => !a.resolved).length;
  const criticalCount = alerts.filter((a) => a.severity === 'critical' && !a.resolved).length;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md flex flex-col gap-5">
      {/* 1. Header Bar: Title, Counters & Audio Alert Toggle */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-600/20 border border-amber-500/30 text-amber-400 shrink-0">
            <Bell className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-extrabold text-white tracking-wide uppercase">
                UNIFIED MULTI-CAMERA SMART ALERTS
              </h3>
              <span className={`text-xs font-bold px-3 py-0.5 rounded-full border ${
                criticalCount > 0
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}>
                {activeCount} Active ({criticalCount} Critical)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Autonomous crowd anomalies, overcapacity breaches, rapid surges &amp; hardware health events
            </p>
          </div>
        </div>

        {/* Top Actions: Clear Resolved & Sound Mute Toggle */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
            title={soundEnabled ? 'Alert chimes enabled' : 'Alert chimes muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          <button
            type="button"
            onClick={handleClearAllResolved}
            className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Clear Resolved</span>
          </button>
        </div>
      </div>

      {/* 2. Critical Alert Banner / Immediate User Notification */}
      {latestCriticalAlert && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 flex items-start justify-between gap-3 animate-pulse shadow-lg shadow-rose-900/30">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white text-sm block">
                CRITICAL ALERT: {latestCriticalAlert.title}
              </strong>
              <p className="text-xs text-rose-200/90 mt-0.5 leading-relaxed">
                {latestCriticalAlert.message}
              </p>
              <div className="flex items-center gap-2 text-[11px] font-mono text-rose-300 mt-2">
                <span>Camera: <strong>{latestCriticalAlert.camera_name}</strong></span>
                <span>&bull;</span>
                <span>Region: <strong>{latestCriticalAlert.region_name}</strong></span>
                <span>&bull;</span>
                <span>Detected: <strong>{latestCriticalAlert.people_count} people</strong> ({latestCriticalAlert.occupancy}%)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {latestCriticalAlert.camera_id && onSelectCamera && (
              <button
                type="button"
                onClick={() => {
                  onSelectCamera(latestCriticalAlert.camera_id);
                  if (onZoomToMapCamera) onZoomToMapCamera(latestCriticalAlert.camera_id);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Inspect Feed</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleAcknowledge(latestCriticalAlert.id)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl text-xs font-bold transition-all active:scale-95"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* 3. Comprehensive Filter Controls Bar */}
      <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 items-center">
          {/* Search Box */}
          <div className="relative col-span-1 sm:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search alert title, camera, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-white text-xs rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Region Filter */}
          <div>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Regions</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="system">System</option>
              <option value="info">Info</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active (Unresolved)</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Alert Cards Stream List */}
      <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
        {loading && alerts.length === 0 ? (
          <div className="py-12 flex items-center justify-center text-xs text-slate-500 font-semibold gap-2">
            <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
            <span>Synchronizing smart alert registry...</span>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-950/40">
            <CheckCircle className="w-10 h-10 text-emerald-500/70 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-300">All Clear &mdash; No Active Alerts</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              All monitored camera points and regions are currently operating within safe configured capacity thresholds.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alt) => {
            const sev = severityStyles[alt.severity] || severityStyles.warning;
            const IconComp = sev.icon;
            const isResolved = alt.resolved;
            const isAck = alt.acknowledged;

            return (
              <div
                key={alt.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isResolved
                    ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                    : sev.card
                }`}
              >
                {/* Left: Icon, Details & Metadata */}
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 bg-slate-950 border border-slate-800 ${sev.iconColor}`}>
                    <IconComp className="w-5 h-5" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-white tracking-wide uppercase">
                        {alt.title}
                      </h4>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${sev.badge}`}>
                        {alt.severity}
                      </span>
                      {isAck && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30">
                          Ack by {alt.acknowledged_by || 'Staff'}
                        </span>
                      )}
                      {isResolved && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          Resolved
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 mt-1 leading-snug">
                      {alt.message}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 mt-2 flex-wrap">
                      {alt.camera_name && (
                        <span>Camera: <strong className="text-white">{alt.camera_name}</strong></span>
                      )}
                      {alt.region_name && (
                        <>
                          <span>&bull;</span>
                          <span>Region: <strong className="text-slate-300">{alt.region_name}</strong></span>
                        </>
                      )}
                      {alt.people_count > 0 && (
                        <>
                          <span>&bull;</span>
                          <span>Count: <strong className="text-white">{alt.people_count}</strong></span>
                        </>
                      )}
                      {alt.occupancy > 0 && (
                        <>
                          <span>&bull;</span>
                          <span>Density: <strong className="text-purple-300">{alt.occupancy}%</strong></span>
                        </>
                      )}
                      <span>&bull;</span>
                      <span className="text-slate-500">{new Date(alt.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Action Buttons (Inspect, Acknowledge, Resolve, Clear) */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {alt.camera_id && onSelectCamera && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectCamera(alt.camera_id);
                        if (onZoomToMapCamera) onZoomToMapCamera(alt.camera_id);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-blue-600/20 text-slate-300 hover:text-blue-300 border border-slate-800 hover:border-blue-500/40 text-xs font-semibold flex items-center gap-1 transition-all"
                      title="Inspect camera detail view"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                      <span>View</span>
                    </button>
                  )}

                  {!isAck && !isResolved && (
                    <button
                      type="button"
                      onClick={() => handleAcknowledge(alt.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-all"
                      title="Acknowledge alert without resolving"
                    >
                      Ack
                    </button>
                  )}

                  {!isResolved && (
                    <button
                      type="button"
                      onClick={() => handleResolve(alt.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
                      title="Mark alert as resolved"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Resolve</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleClear(alt.id)}
                    className="p-1.5 rounded-xl bg-slate-950 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 border border-slate-800 transition-colors"
                    title="Dismiss / delete alert"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
