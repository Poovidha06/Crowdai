import React, { useState } from 'react';
import { Eye, Users, Settings, Activity, Camera, MapPin, Layers, Bell } from 'lucide-react';
import { LocationSelector } from './LocationSelector';

export function Header({
  capacity,
  onUpdateCapacity,
  isConnected,
  regions = [],
  selectedRegionId = 'reg-entire-campus',
  onSelectRegion,
  onOpenAddCustomRegion,
  onFlyToLocation,
  activeTab = 'cameras',
  onSelectTab
}) {
  const [inputCapacity, setInputCapacity] = useState(capacity || 50);
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync internal input capacity when prop changes
  React.useEffect(() => {
    if (capacity !== undefined) setInputCapacity(capacity);
  }, [capacity]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = parseInt(inputCapacity, 10);
    if (isNaN(val) || val <= 0) return;
    setIsUpdating(true);
    await onUpdateCapacity(val);
    setIsUpdating(false);
  };

  return (
    <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-0 z-50 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Logo & Title & Navigation Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10 shrink-0">
              <Eye className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                CrowdVision <span className="text-blue-500 font-extrabold">AI</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Smart Multi-Zone
                </span>
              </h1>
              <p className="text-xs text-slate-400">Independent Camera Detection Pipelines &amp; Density Telemetry</p>
            </div>
          </div>

          {/* Navigation View Switcher */}
          {onSelectTab && (
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => onSelectTab('cameras')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'cameras'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Camera Dashboards</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('combined')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'combined'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Regional Analytics &amp; Graphs</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('alerts')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'alerts'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Smart Alerts</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('overview')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'overview'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Campus Map &amp; Overview</span>
              </button>
            </div>
          )}

          {/* Mobile Connection Status */}
          <div className="flex lg:hidden items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-[10px]">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <span className="text-slate-300 font-semibold">{isConnected ? 'LIVE WS' : 'RECONNECT'}</span>
          </div>
        </div>

        {/* Top-Right Control Area: Location Dropdown near Max Capacity Setting */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
          {/* Functional Location / Region Selector Dropdown */}
          <LocationSelector
            regions={regions}
            selectedRegionId={selectedRegionId}
            onSelectRegion={onSelectRegion}
            onOpenAddCustomRegion={onOpenAddCustomRegion}
            onFlyToLocation={onFlyToLocation}
          />

          {/* Max Capacity Configuration Form */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 p-1.5 rounded-xl">
            <div className="flex items-center gap-1.5 px-2 text-slate-400 text-xs font-medium">
              <Settings className="w-3.5 h-3.5 text-blue-400" />
              <span>Max Capacity:</span>
            </div>
            <input
              type="number"
              min="1"
              value={inputCapacity}
              onChange={(e) => setInputCapacity(e.target.value)}
              className="w-20 bg-slate-950 border border-slate-700 text-white text-sm font-semibold rounded-lg px-2.5 py-1 text-center focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              type="submit"
              disabled={isUpdating}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-all shadow-md shadow-blue-600/20 active:scale-95 disabled:opacity-50"
            >
              Set
            </button>
          </form>

          {/* Desktop Connection Status Badge */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse' : 'bg-amber-400'}`}></span>
            <span className="text-slate-300 font-medium">
              {isConnected ? 'LIVE WS' : 'RECONNECTING'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
