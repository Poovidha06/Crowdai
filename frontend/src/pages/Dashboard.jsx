import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { StatCard } from '../components/StatCard';
import { LiveMap } from '../components/LiveMap';
import { ZoneList } from '../components/ZoneList';
import { VideoMonitor } from '../components/VideoMonitor';
import { AlertPanel } from '../components/AlertPanel';
import { CrowdChart } from '../components/CrowdChart';
import { CameraDashboardGrid } from '../components/CameraDashboardGrid';
import { CameraDetailPage } from '../components/CameraDetailPage';
import { CombinedRegionAnalytics } from '../components/CombinedRegionAnalytics';
import { CameraTimeSeriesChart } from '../components/CameraTimeSeriesChart';
import { CombinedRegionChart } from '../components/CombinedRegionChart';
import { SmartAlertPanel } from '../components/SmartAlertPanel';
import { analyticsWS } from '../services/websocket';
import {
  fetchRegions, fetchLocationHeatmap, fetchActiveAlerts,
  resolveAlert, updateZoneCapacity, fetchZoneHistory,
  createRegion, updateRegion, deleteRegion, deleteZone,
  fetchCameras, updateCameraCapacity, startCameraWebcam,
  uploadCameraVideo, stopCameraStream, reconnectCameraStream,
  attachCameraStreamUrl
} from '../services/api';
import { Users, Building2, Percent, Bell, Camera, RotateCcw, MapPin, Sparkles } from 'lucide-react';

export function Dashboard() {
  const [regions, setRegions] = useState([
    {
      id: 'reg-entire-campus',
      name: 'Entire Campus',
      description: 'Full monitored campus',
      center_lat: 9.9252,
      center_lng: 78.1198,
      zoom_level: 16,
      registered_cameras: 12,
      active_cameras: 10,
      total_people: 0,
      total_capacity: 1000,
      overall_occupancy: 0.0,
      is_custom: false,
      zones: []
    }
  ]);

  const [cameras, setCameras] = useState([]);
  const [activeTab, setActiveTab] = useState('cameras'); // 'cameras' | 'overview'
  const [selectedCameraId, setSelectedCameraId] = useState(null);

  const [selectedRegionId, setSelectedRegionId] = useState('reg-entire-campus');
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [timeFilter, setTimeFilter] = useState('today');
  const [isConnected, setIsConnected] = useState(false);
  const [sourceType, setSourceType] = useState('stopped');
  const [flyToTarget, setFlyToTarget] = useState(null);

  // Load Regions, Cameras, and analytics periodically
  const loadData = async () => {
    try {
      // 1. Fetch Cameras
      const camList = await fetchCameras();
      if (camList && camList.length > 0) {
        setCameras(camList);
      }

      // 2. Fetch Regions
      const regList = await fetchRegions();
      if (regList && regList.length > 0) {
        setRegions(regList);

        if (!regList.some((r) => r.id === selectedRegionId) && selectedRegionId !== 'all') {
          setSelectedRegionId('reg-entire-campus');
        }

        const currentReg = regList.find((r) => r.id === selectedRegionId) || regList[0];
        const currentZones = selectedRegionId === 'reg-entire-campus'
          ? regList.flatMap((r) => r.zones || [])
          : (currentReg?.zones || []);

        if (currentZones.length > 0) {
          setSelectedZoneId((prevId) => {
            if (!prevId || !currentZones.some((z) => z.id === prevId)) {
              return currentZones[0].id;
            }
            return prevId;
          });
        }
      }

      // 3. Heatmap data
      const heat = await fetchLocationHeatmap('loc-tce-campus');
      if (heat) setHeatmapData(heat);

      // 4. Active Alerts
      const alts = await fetchActiveAlerts();
      if (alts) setAlerts(alts);

      // 5. Trend History
      if (selectedZoneId) {
        const hist = await fetchZoneHistory(selectedZoneId, timeFilter);
        if (hist && hist.datapoints && hist.datapoints.length > 0) {
          const formatted = hist.datapoints.map((d) => ({ time: d.time, people: d.people }));
          setTrendData(formatted);
        }
      }
    } catch (err) {
      console.warn('Backend sync warning:', err.message);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, [selectedRegionId, selectedZoneId, timeFilter]);

  // WebSocket real-time subscription
  useEffect(() => {
    analyticsWS.connect();
    setIsConnected(true);

    const unsubscribe = analyticsWS.subscribe((data) => {
      setIsConnected(true);
      if (data.source) setSourceType(data.source);

      // Multi-camera telemetry update
      if (data.cameras && Array.isArray(data.cameras) && data.cameras.length > 0) {
        setCameras(data.cameras);
      }

      // Live update people count for active camera
      if (data.people_count !== undefined) {
        setRegions((prevRegions) =>
          prevRegions.map((reg) => {
            let regUpdated = false;
            const updatedZones = (reg.zones || []).map((z) => {
              if (z.id === selectedZoneId || (z.id === 'cam-main-entry' && !selectedZoneId)) {
                regUpdated = true;
                return {
                  ...z,
                  people_count: data.people_count,
                  capacity: data.capacity || z.capacity,
                  occupancy: data.occupancy || z.occupancy,
                  status_level: data.status || z.status_level
                };
              }
              return z;
            });

            if (reg.id === 'reg-entire-campus') {
              const totalP = updatedZones.reduce((acc, z) => acc + (z.people_count || 0), 0);
              const totalC = updatedZones.reduce((acc, z) => acc + (z.capacity || 0), 0);
              return {
                ...reg,
                total_people: totalP,
                total_capacity: totalC,
                overall_occupancy: totalC > 0 ? (totalP / totalC) * 100 : 0.0,
                zones: updatedZones
              };
            }

            if (regUpdated) {
              const totalP = updatedZones.reduce((acc, z) => acc + (z.people_count || 0), 0);
              const totalC = updatedZones.reduce((acc, z) => acc + (z.capacity || 0), 0);
              return {
                ...reg,
                total_people: totalP,
                total_capacity: totalC,
                overall_occupancy: totalC > 0 ? (totalP / totalC) * 100 : 0.0,
                zones: updatedZones
              };
            }

            return reg;
          })
        );

        if (data.timestamp) {
          const timeStr = new Date(data.timestamp).toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
          });
          setTrendData((prev) => {
            const updated = [...prev, { time: timeStr, people: data.people_count }];
            return updated.slice(-25);
          });
        }
      }
    });

    return () => {
      unsubscribe();
      analyticsWS.disconnect();
    };
  }, [selectedZoneId]);

  // Camera Management Handlers
  const handleCameraCapacityUpdate = async (cameraId, newCapacity) => {
    try {
      await updateCameraCapacity(cameraId, { capacity: newCapacity });
      loadData();
    } catch (err) {
      console.error('Failed to update camera capacity:', err);
    }
  };

  const handleStartCameraWebcam = async (cameraId) => {
    try {
      await startCameraWebcam(cameraId, 0);
      loadData();
    } catch (err) {
      console.error('Failed to start webcam on camera:', err);
    }
  };

  const handleUploadCameraVideo = async (cameraId, file) => {
    try {
      await uploadCameraVideo(cameraId, file);
      loadData();
    } catch (err) {
      console.error('Failed to upload video to camera:', err);
    }
  };

  const handleStopCameraStream = async (cameraId) => {
    try {
      await stopCameraStream(cameraId);
      loadData();
    } catch (err) {
      console.error('Failed to stop camera stream:', err);
    }
  };

  const handleReconnectCameraStream = async (cameraId) => {
    try {
      await reconnectCameraStream(cameraId);
      loadData();
    } catch (err) {
      console.error('Failed to reconnect camera stream:', err);
    }
  };

  const handleAttachCameraStreamUrl = async (cameraId, streamUrl) => {
    try {
      await attachCameraStreamUrl(cameraId, streamUrl);
      loadData();
    } catch (err) {
      console.error('Failed to attach RTSP stream URL:', err);
      alert(`Failed to attach stream URL: ${err.message}`);
    }
  };

  // Region CRUD Handlers
  const handleCreateRegion = async (regionData) => {
    try {
      const created = await createRegion(regionData);
      if (created) {
        setSelectedRegionId(created.id);
        setActiveTab('cameras');
        setFlyToTarget({
          lat: created.center_lat,
          lng: created.center_lng,
          zoom: 16,
          displayName: created.name
        });
        await loadData();
        return created;
      }
    } catch (err) {
      console.error('Failed to create region:', err);
      alert(`Failed to create region: ${err.message}`);
      throw err;
    }
  };

  const handleUpdateRegion = async (regionId, regionData) => {
    try {
      await updateRegion(regionId, regionData);
      await loadData();
    } catch (err) {
      console.error('Failed to update region:', err);
      alert(`Failed to update region: ${err.message}`);
    }
  };

  const handleDeleteRegion = async (regionId) => {
    try {
      await deleteRegion(regionId);
      setSelectedRegionId('reg-entire-campus');
      await loadData();
    } catch (err) {
      console.error('Failed to delete region:', err);
      alert(`Failed to delete region: ${err.message}`);
    }
  };

  const handleDeleteZone = async (zoneId) => {
    try {
      await deleteZone(zoneId);
      await loadData();
    } catch (err) {
      console.error('Failed to delete camera zone:', err);
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      await resolveAlert(alertId);
      loadData();
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  // Legacy stream controls
  const handleStartWebcam = async () => {
    try {
      const res = await fetch('/api/webcam/start', { method: 'POST' });
      if (res.ok) {
        setSourceType('webcam');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleUploadVideo = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload_video', { method: 'POST', body: formData });
      if (res.ok) {
        setSourceType('file');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleStopVideo = async () => {
    try {
      await fetch('/api/webcam/stop', { method: 'POST' });
      setSourceType('stopped');
    } catch (err) {
      console.error('Failed to stop video:', err);
    }
  };

  // Selected region computation
  const activeRegion = regions.find((r) => r.id === selectedRegionId) || regions[0];

  const activeRegionZones = selectedRegionId === 'reg-entire-campus'
    ? regions.flatMap((r) => r.zones || [])
    : (activeRegion?.zones || []);

  const activeZone = activeRegionZones.find((z) => z.id === selectedZoneId) || activeRegionZones[0] || null;

  const activeZoneIds = new Set(activeRegionZones.map((z) => z.id));
  const filteredAlerts = selectedRegionId === 'reg-entire-campus'
    ? alerts
    : alerts.filter((a) => activeZoneIds.has(a.zone_id));

  const activeRegionCameras = selectedRegionId === 'reg-entire-campus'
    ? cameras
    : cameras.filter((c) => c.region_id === selectedRegionId);

  const totalPeople = activeRegion?.total_people ?? activeRegionZones.reduce((acc, z) => acc + (z.people_count || 0), 0);
  const totalCapacity = activeRegion?.total_capacity ?? activeRegionZones.reduce((acc, z) => acc + (z.capacity || 0), 0);
  const overallOccupancy = totalCapacity > 0 ? (totalPeople / totalCapacity) * 100 : 0.0;
  const registeredCams = activeRegion?.registered_cameras ?? activeRegionZones.length;
  const activeCams = activeRegion?.active_cameras ?? activeRegionZones.filter((z) => z.status === 'active' || z.status === 'live').length;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar with Location Selector Dropdown & View Mode Switcher */}
      <Header
        capacity={activeZone?.capacity || 100}
        onUpdateCapacity={(cap) => handleCameraCapacityUpdate(selectedZoneId || 'cam-main-entry', cap)}
        isConnected={isConnected}
        regions={regions}
        selectedRegionId={selectedRegionId}
        onSelectRegion={setSelectedRegionId}
        onFlyToLocation={(lat, lng, zoom, displayName) => {
          setFlyToTarget({ lat, lng, zoom: zoom || 15, displayName });
          setActiveTab('overview');
        }}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setSelectedCameraId(null);
          setActiveTab(tab);
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-6">
        {/* VIEW 1: Dedicated Camera Detail Page / Expanded View */}
        {selectedCameraId ? (
          <CameraDetailPage
            cameraId={selectedCameraId}
            onBack={() => setSelectedCameraId(null)}
            onAlertResolved={loadData}
          />
        ) : activeTab === 'cameras' ? (
          /* VIEW 2: Independent Dashboard for Every Camera Grid View */
          <CameraDashboardGrid
            cameras={cameras}
            regions={regions}
            selectedRegionId={selectedRegionId}
            onSelectRegion={setSelectedRegionId}
            onSelectCamera={(camId) => setSelectedCameraId(camId)}
            onUpdateCapacity={handleCameraCapacityUpdate}
            onStartWebcam={handleStartCameraWebcam}
            onUploadVideo={handleUploadCameraVideo}
            onStopStream={handleStopCameraStream}
            onReconnect={handleReconnectCameraStream}
            onNavigateToAnalytics={() => setActiveTab('combined')}
          />
        ) : activeTab === 'combined' ? (
          /* VIEW 3: Section 6 - Comprehensive Real-Time Analytics & Combined/Camera Graphs */
          <div className="flex flex-col gap-6">
            {/* Unified Multi-Camera Regional Telemetry & Overlap Settings */}
            <CombinedRegionAnalytics
              selectedRegionId={selectedRegionId}
              regions={regions}
              onSelectRegion={setSelectedRegionId}
              onSelectCamera={(camId) => setSelectedCameraId(camId)}
            />

            {/* Section 6B: Combined Region Multi-Camera Time-Series Graph */}
            <CombinedRegionChart
              selectedRegionId={selectedRegionId}
              regions={regions}
              onSelectRegion={setSelectedRegionId}
              onInspectCamera={(camId) => setSelectedCameraId(camId)}
            />

            {/* Section 6A: Individual Camera Historical Density Graphs */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md flex flex-col gap-5">
              <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-extrabold text-white tracking-wide flex items-center gap-2">
                    <span>Camera-Specific Real-Time Density Graphs</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {activeRegionCameras.length} Monitored Points
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Individual time-series line charts showing people counts, capacity &amp; warning reference lines, and occupancy trends for {activeRegion?.name || 'Selected Region'}
                  </p>
                </div>
              </div>

              {activeRegionCameras.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                  No cameras registered in this region. Select &quot;Entire Campus&quot; or register new cameras.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {activeRegionCameras.map((cam) => (
                    <CameraTimeSeriesChart
                      key={cam.id}
                      cameraId={cam.id}
                      cameraName={cam.name}
                      regionName={cam.region_name || activeRegion?.name}
                      capacity={cam.capacity || 100}
                      warningThreshold={cam.warning_threshold || 75}
                      criticalThreshold={cam.critical_threshold || 90}
                      onInspectCamera={(camId) => setSelectedCameraId(camId)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'alerts' ? (
          /* VIEW 4: Section 7 - Unified Multi-Camera Smart Alert System */
          <SmartAlertPanel
            regions={regions}
            cameras={cameras}
            selectedRegionId={selectedRegionId}
            onSelectCamera={(camId) => setSelectedCameraId(camId)}
            onZoomToMapCamera={(camId) => {
              setSelectedZoneId(camId);
              setActiveTab('overview');
            }}
          />
        ) : (
          /* VIEW 4: Campus Map & Region Overview */
          <>
            {/* Unified Multi-Camera Regional Telemetry Panel */}
            <CombinedRegionAnalytics
              selectedRegionId={selectedRegionId}
              regions={regions}
              onSelectRegion={setSelectedRegionId}
              onSelectCamera={(camId) => setSelectedCameraId(camId)}
            />

            {/* Region Status & Quick Navigation Control Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <div
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ backgroundColor: activeRegion?.color || '#3b82f6' }}
                ></div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-white tracking-wide">
                      {activeRegion?.name || 'Entire Campus'}
                    </h2>
                    {activeRegion?.is_custom && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Custom Region
                      </span>
                    )}
                    {selectedRegionId === 'reg-entire-campus' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Campus Perimeter
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    {activeRegion?.description || 'Geographical crowd monitoring area'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span>
                    <strong className="text-white">{registeredCams}</strong> Registered
                    (<strong className="text-emerald-400">{activeCams} Active</strong>)
                  </span>
                </div>

                {selectedRegionId !== 'reg-entire-campus' && (
                  <button
                    onClick={() => setSelectedRegionId('reg-entire-campus')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-sm active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                    <span>Return to Entire Campus</span>
                  </button>
                )}
              </div>
            </div>

            {/* 4 Region-Specific Summary Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="TOTAL PEOPLE"
                value={totalPeople}
                description={`In ${activeRegion?.name || 'Campus'}`}
                icon={Users}
                color="blue"
              />
              <StatCard
                title="TOTAL CAPACITY"
                value={totalCapacity}
                description="Region Safety Threshold"
                icon={Building2}
                color="emerald"
              />
              <StatCard
                title="OVERALL OCCUPANCY"
                value={`${overallOccupancy.toFixed(1)}%`}
                description="Region Density Ratio"
                icon={Percent}
                color={overallOccupancy > 80 ? 'rose' : 'purple'}
              />
              <StatCard
                title="ACTIVE ALERTS"
                value={filteredAlerts.length}
                description="In Selected Region"
                icon={Bell}
                color={filteredAlerts.length > 0 ? 'red' : 'amber'}
              />
            </div>

            {/* Camera Points List */}
            <ZoneList
              zones={activeRegionZones}
              selectedZoneId={selectedZoneId}
              onSelectZone={(zoneId) => {
                setSelectedZoneId(zoneId);
              }}
              onUpdateCapacity={async (zoneId, cap) => {
                await updateCameraCapacity(zoneId, { capacity: cap });
                loadData();
              }}
              onDeleteZone={handleDeleteZone}
              regionName={activeRegion?.name || 'Entire Campus'}
            />

            {/* Middle Section: Interactive LiveMap + Video Stream Monitor */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <LiveMap
                regions={regions}
                selectedRegionId={selectedRegionId}
                onSelectRegion={setSelectedRegionId}
                selectedZoneId={selectedZoneId}
                onSelectZone={(zoneId) => {
                  setSelectedZoneId(zoneId);
                }}
                cameras={cameras}
                onInspectCamera={(camId) => setSelectedCameraId(camId)}
                onStartWebcam={handleStartCameraWebcam}
                onUploadVideo={handleUploadCameraVideo}
                onAttachStreamUrl={handleAttachCameraStreamUrl}
                onUpdateCameraCapacity={handleCameraCapacityUpdate}
                heatmapData={heatmapData}
                onCreateRegion={handleCreateRegion}
                onUpdateRegion={handleUpdateRegion}
                onDeleteRegion={handleDeleteRegion}
                onDeleteZone={handleDeleteZone}
                externalFlyTarget={flyToTarget}
                onFlyToConsumed={() => setFlyToTarget(null)}
              />

              <VideoMonitor
                source={sourceType}
                onStartWebcam={handleStartWebcam}
                onUploadVideo={handleUploadVideo}
                onStopVideo={handleStopVideo}
                peopleCount={activeZone?.people_count || 0}
              />
            </div>

            {/* Bottom Section: Unified Smart Alerts Panel + Combined Region Multi-Camera Chart */}
            <div className="flex flex-col lg:flex-row gap-6 items-stretch">
              <div className="w-full lg:w-2/5">
                <SmartAlertPanel
                  regions={regions}
                  cameras={cameras}
                  selectedRegionId={selectedRegionId}
                  onSelectCamera={(camId) => setSelectedCameraId(camId)}
                  onZoomToMapCamera={(camId) => {
                    setSelectedZoneId(camId);
                  }}
                />
              </div>

              <div className="w-full lg:w-3/5">
                <CombinedRegionChart
                  selectedRegionId={selectedRegionId}
                  regions={regions}
                  onSelectRegion={setSelectedRegionId}
                  onInspectCamera={(camId) => setSelectedCameraId(camId)}
                />
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950/60 py-4 px-6 text-center text-xs text-slate-500">
        CrowdVision AI Phase 2 &copy; 2026 &mdash; Smart Multi-Zone Crowd Management System (FastAPI + YOLO + React + Independent Camera Pipelines)
      </footer>
    </div>
  );
}
