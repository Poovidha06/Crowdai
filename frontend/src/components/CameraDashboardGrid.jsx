import React, { useState } from 'react';
import { CameraDashboardCard } from './CameraDashboardCard';
import { Camera, Search, Filter, Radio, ShieldAlert, CheckCircle, RefreshCw, Layers } from 'lucide-react';

export function CameraDashboardGrid({
  cameras = [],
  regions = [],
  selectedRegionId = 'all',
  onSelectRegion,
  onSelectCamera,
  onUpdateCapacity,
  onStartWebcam,
  onUploadVideo,
  onStopStream,
  onReconnect,
  onNavigateToAnalytics
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'live', 'alert', 'offline'

  // Filter cameras
  const filteredCameras = cameras.filter((cam) => {
    // Search query match (name or id or monitoring zone)
    const matchesSearch =
      cam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cam.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cam.monitoring_zone && cam.monitoring_zone.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (cam.region_name && cam.region_name.toLowerCase().includes(searchQuery.toLowerCase()));

    // Region match
    const matchesRegion =
      !selectedRegionId || selectedRegionId === 'all' || selectedRegionId === 'reg-entire-campus'
        ? true
        : cam.region_id === selectedRegionId;

    // Status filter match
    let matchesStatus = true;
    if (statusFilter === 'live') {
      matchesStatus = cam.connection_status === 'live';
    } else if (statusFilter === 'alert') {
      matchesStatus = cam.crowd_status === 'Warning' || cam.crowd_status === 'Critical' || (cam.active_alerts && cam.active_alerts.length > 0);
    } else if (statusFilter === 'offline') {
      matchesStatus = cam.connection_status === 'offline';
    }

    return matchesSearch && matchesRegion && matchesStatus;
  });

  const liveCount = cameras.filter((c) => c.connection_status === 'live').length;
  const alertCount = cameras.filter((c) => c.crowd_status === 'Warning' || c.crowd_status === 'Critical' || (c.active_alerts && c.active_alerts.length > 0)).length;
  const totalPeople = cameras.reduce((acc, c) => acc + (c.people_count || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Control Bar: Title, Search, Filter Pills & Telemetry Summary */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-wide uppercase flex items-center gap-2">
                INDEPENDENT CAMERA DASHBOARDS
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                  {cameras.length} Active Endpoints
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Independent AI detection pipeline, live stream &amp; real-time trend per camera point
              </p>
            </div>
          </div>

          {/* Quick Stats Pill Strip */}
          <div className="flex items-center gap-2.5 flex-wrap text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span><strong>{liveCount}</strong> Live Feeds</span>
            </span>

            <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-semibold flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-blue-400" />
              <span><strong>{totalPeople}</strong> Total People</span>
            </span>

            <span className={`px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-2 ${
              alertCount > 0
                ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 animate-pulse'
                : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span><strong>{alertCount}</strong> In Warning/Critical</span>
            </span>

            {onNavigateToAnalytics && (
              <button
                type="button"
                onClick={onNavigateToAnalytics}
                className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ml-auto sm:ml-0"
                title="Open unified multi-camera analytics for this region"
              >
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Regional Analytics</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter & Search Controls */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search camera name, ID, or zone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 text-xs">
            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({cameras.length})
              </button>
              <button
                onClick={() => setStatusFilter('live')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                  statusFilter === 'live'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Live ({liveCount})
              </button>
              <button
                onClick={() => setStatusFilter('alert')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                  statusFilter === 'alert'
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Alerts ({alertCount})
              </button>
              <button
                onClick={() => setStatusFilter('offline')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                  statusFilter === 'offline'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Offline ({cameras.length - liveCount})
              </button>
            </div>

            {/* Region Select Filter */}
            {regions && regions.length > 0 && (
              <select
                value={selectedRegionId}
                onChange={(e) => onSelectRegion && onSelectRegion(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500 shrink-0"
              >
                <option value="all">All Regions</option>
                {regions.map((reg) => (
                  <option key={reg.id} value={reg.id}>
                    {reg.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Responsive Grid of Independent Camera Dashboards */}
      {filteredCameras.length === 0 ? (
        <div className="p-12 border border-dashed border-slate-800 rounded-3xl text-center bg-slate-950/40">
          <Camera className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-300 mb-1">No Camera Endpoints Matched</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Try adjusting your search query, status filter, or region selection.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              if (onSelectRegion) onSelectRegion('all');
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCameras.map((camera) => (
            <CameraDashboardCard
              key={camera.id}
              camera={camera}
              onSelectCamera={onSelectCamera}
              onUpdateCapacity={onUpdateCapacity}
              onStartWebcam={onStartWebcam}
              onUploadVideo={onUploadVideo}
              onStopStream={onStopStream}
              onReconnect={onReconnect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
