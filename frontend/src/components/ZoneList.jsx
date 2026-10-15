import React from 'react';
import { ZoneCard } from './ZoneCard';
import { Camera, Layers } from 'lucide-react';

export function ZoneList({
  zones = [],
  selectedZoneId,
  onSelectZone,
  onUpdateCapacity,
  onDeleteZone,
  regionName = 'Entire Campus'
}) {
  const activeCount = zones.filter((z) => z.status === 'active').length;

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-bold text-white tracking-wide uppercase">
            {regionName} &mdash; Camera Feeds &amp; Points
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{activeCount} Active</span>
            <span className="text-slate-500">/</span>
            <span>{zones.length} Registered</span>
          </span>
        </div>
      </div>

      {zones.length === 0 ? (
        <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center bg-slate-950/40">
          <Camera className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-400 mb-1">No cameras registered for {regionName}.</p>
          <p className="text-xs text-slate-500">Use the interactive map or drawer to add camera points to this region!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {zones.map((zone) => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              isSelected={selectedZoneId === zone.id}
              onSelect={onSelectZone}
              onUpdateCapacity={onUpdateCapacity}
              onDeleteZone={onDeleteZone}
            />
          ))}
        </div>
      )}
    </div>
  );
}
