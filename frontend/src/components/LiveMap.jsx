import React, { useState, useEffect, useRef } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, Circle, Polygon, Polyline, Tooltip, useMap, useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import {
  Map, Flame, MapPin, Navigation, Crosshair, Search, Globe,
  PlusCircle, Trash2, X, Check, Camera, Edit2, RotateCcw,
  Sparkles, Layers, Undo2, Info, Video, Activity, Users, Settings,
  Radio, ShieldAlert, Sliders, ExternalLink, RefreshCw, Upload, AlertTriangle,
  Flag, School, GraduationCap, Milestone, Loader2
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';

// Custom Leaflet Icons
const createCameraIcon = (status, isSelected, label = '') => {
  const colorMap = {
    active: '#10b981',
    standby: '#f59e0b',
    offline: '#ef4444',
    reconnecting: '#06b6d4',
    LOW: '#10b981',
    MODERATE: '#3b82f6',
    HIGH: '#f59e0b',
    CRITICAL: '#f43f5e'
  };
  const color = colorMap[status] || '#10b981';
  const size = isSelected ? 'w-9 h-9 scale-110' : 'w-7 h-7';

  return L.divIcon({
    className: 'custom-camera-marker',
    html: `
      <div class="relative flex items-center justify-center">
        ${isSelected ? '<span class="absolute -inset-3 rounded-full bg-blue-500/30 animate-ping"></span><span class="absolute -inset-1.5 rounded-2xl border-2 border-blue-400 animate-pulse"></span>' : ''}
        <div style="background-color: #0b0f19; border-color: ${isSelected ? '#38bdf8' : color};" class="${size} rounded-xl border-2 flex items-center justify-center text-white shadow-xl transition-all duration-300 relative group cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="${isSelected ? '#38bdf8' : color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
            <circle cx="12" cy="13" r="3"/>
          </svg>
          <span style="background-color: ${color};" class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-slate-900 ${status === 'active' || isSelected ? 'animate-pulse' : ''}"></span>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
};

const vertexPointIcon = (index) => L.divIcon({
  className: 'vertex-point-marker',
  html: `
    <div class="w-6 h-6 bg-emerald-500 text-slate-950 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-[10px] font-extrabold animate-bounce">
      ${index + 1}
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const userGpsIcon = L.divIcon({
  className: 'user-gps-marker',
  html: `
    <div class="relative flex items-center justify-center w-6 h-6">
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
      <span class="relative inline-flex rounded-full h-4 w-4 bg-cyan-500 border-2 border-white shadow-lg"></span>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const searchedPinIcon = L.divIcon({
  className: 'searched-pin-marker',
  html: `
    <div class="relative flex items-center justify-center w-8 h-8 bg-purple-600 rounded-full border-2 border-white shadow-xl text-white animate-bounce">
      <div class="w-3 h-3 bg-white rounded-full"></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const TILE_LAYERS = {
  google_streets: {
    name: 'Google Streets',
    label: 'Google Maps (Streets, Gullies & POIs)',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    maxZoom: 22,
    maxNativeZoom: 20
  },
  google_hybrid: {
    name: 'Google Satellite',
    label: 'Google Satellite + Roads',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    maxZoom: 22,
    maxNativeZoom: 20
  },
  osm_streets: {
    name: 'Detailed OSM',
    label: 'Detailed OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 20,
    maxNativeZoom: 19
  },
  dark: {
    name: 'Dark Mode',
    label: 'Dark Surveillance View',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
    maxZoom: 20,
    maxNativeZoom: 19
  }
};

// Map Fly / Fit Bounds Controller
function MapFlyController({ flyTarget, polygonBounds }) {
  const map = useMap();
  const lastTargetRef = useRef(null);
  const lastBoundsRef = useRef(null);

  useEffect(() => {
    if (polygonBounds && polygonBounds !== lastBoundsRef.current && Array.isArray(polygonBounds) && polygonBounds.length >= 3) {
      lastBoundsRef.current = polygonBounds;
      try {
        map.fitBounds(polygonBounds, {
          padding: [50, 50],
          maxZoom: 18,
          animate: true,
          duration: 1.0
        });
      } catch (err) {
        if (flyTarget && typeof flyTarget.lat === 'number' && typeof flyTarget.lng === 'number' && !isNaN(flyTarget.lat) && !isNaN(flyTarget.lng)) {
          map.flyTo([flyTarget.lat, flyTarget.lng], flyTarget.zoom || 15, { animate: true, duration: 1.0 });
        }
      }
    } else if (
      flyTarget &&
      typeof flyTarget.lat === 'number' &&
      typeof flyTarget.lng === 'number' &&
      !isNaN(flyTarget.lat) &&
      !isNaN(flyTarget.lng) &&
      (flyTarget.lat !== lastTargetRef.current?.lat || flyTarget.lng !== lastTargetRef.current?.lng || flyTarget.zoom !== lastTargetRef.current?.zoom)
    ) {
      lastTargetRef.current = flyTarget;
      map.flyTo([flyTarget.lat, flyTarget.lng], flyTarget.zoom || 15, {
        animate: true,
        duration: 1.2
      });
    }
  }, [flyTarget, polygonBounds, map]);

  useEffect(() => {
    map.invalidateSize();
  }, [map]);

  return null;
}

// Map Click Handler for Pick Location & Draw Modes
function MapClickHandler({ isPickMode, isDrawMode, onPickLocation, onDrawVertex }) {
  useMapEvents({
    click(e) {
      if (isPickMode && onPickLocation) {
        onPickLocation(e.latlng.lat, e.latlng.lng);
      } else if (isDrawMode && onDrawVertex) {
        onDrawVertex(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

export function LiveMap({
  regions = [],
  selectedRegionId = 'reg-entire-campus',
  onSelectRegion,
  selectedZoneId,
  onSelectZone,
  cameras = [],
  onInspectCamera,
  onStartWebcam,
  onUploadVideo,
  onAttachStreamUrl,
  onUpdateCameraCapacity,
  heatmapData = [],
  onCreateRegion,
  onUpdateRegion,
  onDeleteRegion,
  onDeleteZone,
  externalFlyTarget = null,
  onFlyToConsumed
}) {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [tileStyle, setTileStyle] = useState('google_streets');
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);
  const [polygonBounds, setPolygonBounds] = useState(null);

  // Reverse Geocoding Street / POI resolution state
  const [reverseGeoLoading, setReverseGeoLoading] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState(null);

  // Pick Any Location on Map Mode
  const [isPickLocationMode, setIsPickLocationMode] = useState(false);
  const [showRegionSetupModal, setShowRegionSetupModal] = useState(false);
  const [pickedCoords, setPickedCoords] = useState(null);
  const [isCreatingRegion, setIsCreatingRegion] = useState(false);

  // Custom Region & Camera Points Configuration State
  const [regName, setRegName] = useState('');
  const [regDesc, setRegDesc] = useState('');
  const [regCapacity, setRegCapacity] = useState(200);
  const [regColor, setRegColor] = useState('#10b981');
  const [cameraCount, setCameraCount] = useState(3);
  const [cameraPointConfigs, setCameraPointConfigs] = useState([]);

  // Draw Polygon Mode
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [drawnVertices, setDrawnVertices] = useState([]);

  // Edit Selected Region State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRegionName, setEditRegionName] = useState('');
  const [editRegionDesc, setEditRegionDesc] = useState('');
  const [editRegionColor, setEditRegionColor] = useState('#3b82f6');

  // RTSP URL Modal State
  const [showRtspModal, setShowRtspModal] = useState(false);
  const [rtspUrl, setRtspUrl] = useState('');
  const [activeCamForRtsp, setActiveCamForRtsp] = useState(null);

  // Inspector Drawer for Clicked Camera Point
  const [showInspector, setShowInspector] = useState(false);

  const fileInputRef = useRef(null);

  const selectedRegion = regions.find((r) => r.id === selectedRegionId) || regions[0];

  // Helper to get active camera object from cameras array or region's zones
  const activeCameraObj = cameras.find((c) => c.id === selectedZoneId) ||
    (selectedRegion?.zones || []).find((z) => z.id === selectedZoneId) ||
    cameras[0] || null;

  // React to region changes: move map to selected region
  useEffect(() => {
    if (!selectedRegion) return;

    try {
      const boundaryCoords = JSON.parse(selectedRegion.boundary || '[]');
      if (boundaryCoords.length >= 3) {
        const latLngs = boundaryCoords.map((c) => [c[0], c[1]]);
        setPolygonBounds(latLngs);
        setFlyTarget(null);
        return;
      }
    } catch (e) {
      // Fallback
    }

    setPolygonBounds(null);
    setFlyTarget({
      lat: selectedRegion.center_lat || 9.9252,
      lng: selectedRegion.center_lng || 78.1198,
      zoom: selectedRegion.zoom_level || (selectedRegion.id === 'reg-entire-campus' ? 15 : 16)
    });
  }, [selectedRegionId, regions]);

  // React to external fly target
  useEffect(() => {
    if (!externalFlyTarget) return;
    setPolygonBounds(null);
    setFlyTarget({
      lat: externalFlyTarget.lat,
      lng: externalFlyTarget.lng,
      zoom: externalFlyTarget.zoom || 15
    });
    if (externalFlyTarget.displayName) {
      setSearchedLocation({
        lat: externalFlyTarget.lat,
        lng: externalFlyTarget.lng,
        displayName: externalFlyTarget.displayName
      });
    }
    if (onFlyToConsumed) onFlyToConsumed();
  }, [externalFlyTarget]);

  // REQUIREMENT 5: When a user clicks a camera point, ZOOM OUT to region level and open output inspector!
  const handleCameraPointClick = (cam) => {
    if (onSelectZone) onSelectZone(cam.id);
    setShowInspector(true);

    // Zoom out to zoom 15/16 so the user sees the camera point in its wider geographical context
    setPolygonBounds(null);
    setFlyTarget({
      lat: cam.latitude || selectedRegion?.center_lat || 9.9252,
      lng: cam.longitude || selectedRegion?.center_lng || 78.1198,
      zoom: 15
    });
  };

  // Sync camera point configs whenever cameraCount or pickedCoords changes
  useEffect(() => {
    const coords = pickedCoords || {
      lat: selectedRegion?.center_lat || 9.9252,
      lng: selectedRegion?.center_lng || 78.1198
    };
    const count = Math.max(1, Math.min(10, cameraCount));
    const radius = 0.00045;
    const configs = [];

    for (let i = 0; i < count; i++) {
      let lat = coords.lat;
      let lng = coords.lng;
      if (count > 1) {
        const angle = (2 * Math.PI * i) / count;
        lat = coords.lat + radius * Math.sin(angle);
        lng = coords.lng + radius * Math.cos(angle);
      }
      configs.push({
        name: `${regName || 'Point'} Cam ${i + 1}`,
        capacity: Math.round((parseInt(regCapacity, 10) || 200) / count) || 60,
        latitude: lat,
        longitude: lng,
        source_type: 'real_footage', // Instantaneous real video feed with YOLOv8
        source_path: null
      });
    }
    setCameraPointConfigs(configs);
  }, [cameraCount, pickedCoords, regName, regCapacity, selectedRegion]);

  // Handle Map Click in "Pick Location" mode with Street & POI Reverse Geocoding
  const handleMapPickLocation = async (lat, lng) => {
    setPickedCoords({ lat, lng });
    setResolvedAddress(null);
    setReverseGeoLoading(true);
    setRegName(`Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    setRegDesc(`Resolving street and regional details...`);
    setCameraCount(3);
    setIsPickLocationMode(false);
    setShowRegionSetupModal(true);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const street = addr.road || addr.pedestrian || addr.amenity || addr.building || addr.suburb || addr.neighbourhood || '';
        const area = addr.suburb || addr.neighbourhood || addr.city_district || addr.town || addr.city || '';
        const city = addr.city || addr.town || addr.village || addr.county || '';
        const state = addr.state || '';
        const pin = addr.postcode || '';

        const nameCandidate = [street, area, city].filter(Boolean).slice(0, 2).join(', ') || data.name || `Point ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        setRegName(nameCandidate);
        const fullDesc = [street, area, city, state, pin].filter(Boolean).join(', ') || data.display_name;
        setRegDesc(fullDesc);
        setResolvedAddress({
          road: street,
          area,
          city,
          state,
          pin,
          fullAddress: fullDesc
        });
      }
    } catch (e) {
      // Fallback description
      setRegDesc(`Location at Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`);
    } finally {
      setReverseGeoLoading(false);
    }
  };

  // Handle Search Result Setup Click
  const handleSetupSearchedLocation = () => {
    if (!searchedLocation) return;
    setPickedCoords({ lat: searchedLocation.lat, lng: searchedLocation.lng });
    const namePart = searchedLocation.displayName?.split(',')[0] || 'Searched Location';
    setRegName(namePart);
    setRegDesc(searchedLocation.displayName || 'Monitored area from search');
    setCameraCount(3);
    setShowRegionSetupModal(true);
  };

  // Handle submit of Create Region with configured camera points
  const handleCreateRegionSubmit = async (e) => {
    e.preventDefault();
    if (isCreatingRegion) return;

    const coords = pickedCoords || {
      lat: selectedRegion?.center_lat || 9.9252,
      lng: selectedRegion?.center_lng || 78.1198
    };

    if (!regName.trim()) {
      alert("Please provide a name for the region.");
      return;
    }

    setIsCreatingRegion(true);

    try {
      // Build boundary polygon around center point & camera points
      const rad = 0.0008;
      const boundaryPoints = [
        [coords.lat + rad, coords.lng - rad],
        [coords.lat + rad, coords.lng + rad],
        [coords.lat - rad, coords.lng + rad],
        [coords.lat - rad, coords.lng - rad]
      ];

      // Format clean camera point definitions
      const validPoints = (cameraPointConfigs || []).map((cp, idx) => ({
        name: cp.name || `${regName.trim()} Cam ${idx + 1}`,
        capacity: parseInt(cp.capacity, 10) || Math.round((parseInt(regCapacity, 10) || 200) / cameraCount) || 60,
        latitude: cp.latitude || coords.lat,
        longitude: cp.longitude || coords.lng,
        source_type: 'real_footage', // Instantaneous real video feed with YOLO
        source_path: null
      }));

      const payload = {
        name: regName.trim(),
        description: regDesc.trim() || `Monitored region with ${cameraCount} camera points`,
        center_lat: coords.lat,
        center_lng: coords.lng,
        zoom_level: 16,
        boundary: JSON.stringify(boundaryPoints),
        color: regColor || '#10b981',
        is_custom: true,
        initial_capacity: parseInt(regCapacity, 10) || 200,
        camera_count: cameraCount,
        camera_points: validPoints
      };

      if (onCreateRegion) {
        await onCreateRegion(payload);
      }

      setShowRegionSetupModal(false);
      setPickedCoords(null);
    } catch (err) {
      console.error("Failed to create region:", err);
      alert(`Could not create region: ${err.message || 'Please check input and try again.'}`);
    } finally {
      setIsCreatingRegion(false);
    }
  };

  // Handle Draw Polygon Vertices
  const handleMapVertexClick = (lat, lng) => {
    if (!isDrawMode) return;
    setDrawnVertices((prev) => [...prev, [lat, lng]]);
  };

  const handleFinishDrawPolygon = () => {
    if (drawnVertices.length < 3) {
      alert('Please click at least 3 points on the map to define a region boundary.');
      return;
    }
    const centerLat = drawnVertices.reduce((sum, v) => sum + v[0], 0) / drawnVertices.length;
    const centerLng = drawnVertices.reduce((sum, v) => sum + v[1], 0) / drawnVertices.length;
    setPickedCoords({ lat: centerLat, lng: centerLng });
    setRegName(`Drawn Region ${regions.filter((r) => r.is_custom).length + 1}`);
    setRegDesc(`Custom polygon region`);
    setCameraCount(3);
    setIsDrawMode(false);
    setShowRegionSetupModal(true);
  };

  // Open RTSP Stream Dialog
  const handleOpenRtspDialog = (camId) => {
    setActiveCamForRtsp(camId);
    setRtspUrl('rtsp://192.168.1.100:554/stream1');
    setShowRtspModal(true);
  };

  const handleSaveRtsp = async (e) => {
    e.preventDefault();
    if (!activeCamForRtsp || !rtspUrl.trim()) return;
    if (onAttachStreamUrl) {
      await onAttachStreamUrl(activeCamForRtsp, rtspUrl.trim());
    }
    setShowRtspModal(false);
  };

  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setSearchedLocation(null);
        setIsLocating(false);
        setFlyTarget({ lat: latitude, lng: longitude, zoom: 15 });
      },
      (error) => {
        setIsLocating(false);
        alert(`Failed to get live location: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSearchLocation = async (e, customQuery = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const query = (customQuery || searchQuery).trim();
    if (!query) return;

    setIsSearching(true);
    try {
      // 1. Search with India country code priority
      let res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=10&addressdetails=1&extratags=1&countrycodes=in&q=${encodeURIComponent(query)}`
      );
      let data = await res.json();

      // 2. Global fallback if not found in India
      if (!data || data.length === 0) {
        res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=8&addressdetails=1&q=${encodeURIComponent(query)}`
        );
        data = await res.json();
      }

      setIsSearching(false);

      if (data && data.length > 0) {
        const first = data[0];
        const lat = parseFloat(first.lat);
        const lng = parseFloat(first.lon);
        const type = first.type || '';
        const category = first.class || '';

        // Deep street-level zoom for streets, colleges, schools, institutions
        let zoom = 15;
        if (['highway', 'road', 'pedestrian', 'residential', 'living_street', 'track', 'path'].includes(type) || category === 'highway') {
          zoom = 19; // Street level
        } else if (['university', 'college', 'school', 'kindergarten', 'hospital', 'clinic', 'building', 'amenity'].includes(type) || category === 'amenity') {
          zoom = 18; // Campus / School / POI level
        } else if (['suburb', 'neighbourhood', 'quarter'].includes(type) || category === 'place') {
          zoom = 16;
        } else if (['city', 'town', 'village', 'municipality'].includes(type)) {
          zoom = 14;
        } else if (['county', 'district', 'state_district'].includes(type)) {
          zoom = 12;
        } else if (['state', 'country'].includes(type)) {
          zoom = 8;
        }

        setSearchedLocation({ lat, lng, displayName: first.display_name });
        setFlyTarget({ lat, lng, zoom });
      } else {
        alert(`Location '${query}' not found. Please try another street, college, school or city name.`);
      }
    } catch (err) {
      setIsSearching(false);
      alert(`Search failed: ${err.message}`);
    }
  };

  // Cameras displayed on the map
  const displayedCameras = selectedRegionId === 'reg-entire-campus'
    ? (cameras.length > 0 ? cameras : regions.flatMap((r) => r.zones || []))
    : (cameras.filter((c) => c.region_id === selectedRegionId).length > 0
        ? cameras.filter((c) => c.region_id === selectedRegionId)
        : (selectedRegion?.zones || []));

  const statusColors = {
    LOW: '#10b981',
    MODERATE: '#3b82f6',
    HIGH: '#f59e0b',
    CRITICAL: '#f43f5e',
    Normal: '#10b981',
    Warning: '#f59e0b',
    Critical: '#f43f5e'
  };

  return (
    <div className="relative bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-2xl backdrop-blur-md flex flex-col gap-4">
      {/* Top Map Control Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white tracking-wide flex items-center gap-2">
              <span>Interactive Surveillance Map</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {displayedCameras.length} Monitored Cameras
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Choose any location worldwide, set camera points with real video feeds, and zoom out on click
            </p>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* REQUIREMENT 1: Pick Location Anywhere on Map */}
          <button
            onClick={() => {
              setIsPickLocationMode(!isPickLocationMode);
              setIsDrawMode(false);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
              isPickLocationMode
                ? 'bg-purple-600 text-white border-purple-400 ring-2 ring-purple-500/50 animate-pulse'
                : 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border-purple-500/40'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5 text-purple-400" />
            <span>{isPickLocationMode ? 'Click Map to Pick' : 'Choose Location on Map'}</span>
          </button>

          {/* Draw Custom Polygon Region */}
          <button
            onClick={() => {
              setIsDrawMode(!isDrawMode);
              setIsPickLocationMode(false);
              setDrawnVertices([]);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
              isDrawMode
                ? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-500/50'
                : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/40'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isDrawMode ? 'Drawing Active' : 'Draw Region Polygon'}</span>
          </button>

          {/* GPS Current Location */}
          <button
            onClick={handleLocateUser}
            disabled={isLocating}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            title="Locate me via GPS"
          >
            <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
            <span>GPS</span>
          </button>

          {/* Tile Layer Switcher */}
          <div className="flex items-center rounded-xl bg-slate-800 border border-slate-700 p-0.5">
            {Object.keys(TILE_LAYERS).map((k) => (
              <button
                key={k}
                onClick={() => setTileStyle(k)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  tileStyle === k ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title={TILE_LAYERS[k].label}
              >
                {TILE_LAYERS[k].name}
              </button>
            ))}
          </div>

          {/* Heatmap Toggle */}
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
              showHeatmap
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'text-amber-400' : 'text-slate-400'}`} />
            <span>{showHeatmap ? 'Heatmap: On' : 'Heatmap'}</span>
          </button>
        </div>
      </div>

      {/* Pick Location Instruction Banner */}
      {isPickLocationMode && (
        <div className="p-3 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center justify-between gap-3 shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-purple-400 shrink-0 animate-spin" />
            <span>
              <strong>Choose Location Mode Active:</strong> Click anywhere on the map to place a monitoring region and configure its camera points!
            </span>
          </div>
          <button
            onClick={() => setIsPickLocationMode(false)}
            className="px-2.5 py-1 bg-slate-900/80 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-bold border border-slate-700"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Draw Region Instruction Banner */}
      {isDrawMode && (
        <div className="p-3 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center justify-between gap-3 shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-emerald-400 shrink-0 animate-bounce" />
            <span>
              <strong>Draw Custom Boundary:</strong> Click on the map to define polygon vertices ({drawnVertices.length}/3+ placed).
            </span>
          </div>
          <div className="flex items-center gap-2">
            {drawnVertices.length > 0 && (
              <button
                onClick={() => setDrawnVertices((prev) => prev.slice(0, -1))}
                className="px-2 py-1 bg-slate-900/80 hover:bg-slate-800 text-slate-300 rounded-lg text-[11px] font-bold"
              >
                Undo
              </button>
            )}
            <button
              disabled={drawnVertices.length < 3}
              onClick={handleFinishDrawPolygon}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-[11px] font-extrabold flex items-center gap-1 shadow-md cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Complete &amp; Add Cameras ({drawnVertices.length})
            </button>
          </div>
        </div>
      )}

      {/* India & Global Location Search Bar + Quick Indian Jump Pills */}
      <div className="relative z-10 flex flex-col gap-2">
        <form onSubmit={handleSearchLocation} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search any small street, college, school, district in India (e.g. MG Road, Anna University, KV Madurai, Marine Drive)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/20 active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Quick Indian Landmark / Street Jump Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
          <span className="text-[10px] uppercase font-bold text-slate-500 shrink-0 flex items-center gap-1">
            <Flag className="w-3 h-3 text-amber-400" />
            <span>India Jumps:</span>
          </span>
          {[
            { label: 'TCE Madurai', lat: 9.8824, lng: 78.0818, zoom: 18 },
            { label: 'IIT Madras', lat: 12.9915, lng: 80.2337, zoom: 18 },
            { label: 'IIT Bombay', lat: 19.1334, lng: 72.9133, zoom: 18 },
            { label: 'KV Madurai', lat: 9.9351, lng: 78.1362, zoom: 18 },
            { label: 'DPS Delhi', lat: 28.5663, lng: 77.1764, zoom: 18 },
            { label: 'MG Road Bangalore', lat: 12.9756, lng: 77.6066, zoom: 18 },
            { label: 'Marine Drive Mumbai', lat: 18.9432, lng: 72.8230, zoom: 18 },
            { label: 'Connaught Place Delhi', lat: 28.6328, lng: 77.2197, zoom: 18 },
            { label: 'Ranganathan St Chennai', lat: 13.0405, lng: 80.2307, zoom: 19 },
            { label: 'South Masi St Madurai', lat: 9.9174, lng: 78.1172, zoom: 18 },
            { label: 'Park Street Kolkata', lat: 22.5516, lng: 88.3524, zoom: 18 }
          ].map((pill) => (
            <button
              key={pill.label}
              type="button"
              onClick={() => {
                setFlyTarget({ lat: pill.lat, lng: pill.lng, zoom: pill.zoom });
                setSearchedLocation({ lat: pill.lat, lng: pill.lng, displayName: pill.label });
              }}
              className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-blue-500/40 text-[10px] font-semibold whitespace-nowrap transition-colors cursor-pointer"
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map Canvas Container */}
      <div className={`relative flex-1 bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden min-h-[420px] z-0 ${isPickLocationMode || isDrawMode ? 'cursor-crosshair' : ''}`}>
        <MapContainer
          center={[selectedRegion?.center_lat || 9.9252, selectedRegion?.center_lng || 78.1198]}
          zoom={selectedRegion?.zoom_level || 15}
          maxZoom={22}
          minZoom={4}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '100%', minHeight: '420px', backgroundColor: '#090d16' }}
        >
          <MapFlyController flyTarget={flyTarget} polygonBounds={polygonBounds} />
          <MapClickHandler
            isPickMode={isPickLocationMode}
            isDrawMode={isDrawMode}
            onPickLocation={handleMapPickLocation}
            onDrawVertex={handleMapVertexClick}
          />

          <TileLayer
            key={tileStyle}
            url={TILE_LAYERS[tileStyle]?.url || TILE_LAYERS.google_streets.url}
            attribution={TILE_LAYERS[tileStyle]?.attribution || '&copy; Google Maps'}
            maxZoom={TILE_LAYERS[tileStyle]?.maxZoom || 22}
            maxNativeZoom={TILE_LAYERS[tileStyle]?.maxNativeZoom || 20}
          />

          {/* Region Boundaries / Polygons */}
          {regions.map((reg) => {
            let boundaryCoords = [];
            try {
              boundaryCoords = JSON.parse(reg.boundary || '[]');
            } catch (err) {
              boundaryCoords = [];
            }
            if (boundaryCoords.length < 3) return null;

            const isSelected = reg.id === selectedRegionId;
            const isEntireCampus = reg.id === 'reg-entire-campus';
            const strokeColor = isSelected ? (reg.color || '#38bdf8') : (reg.color || '#64748b');
            const fillColor = reg.color || '#3b82f6';
            const weight = isSelected ? 3.5 : (isEntireCampus ? 2 : 1.5);
            const fillOpacity = isSelected ? 0.28 : (isEntireCampus ? 0.05 : 0.12);
            const dashArray = isEntireCampus ? '6, 6' : (isSelected ? null : '4, 4');

            return (
              <Polygon
                key={`poly-${reg.id}`}
                positions={boundaryCoords}
                pathOptions={{
                  color: strokeColor,
                  weight: weight,
                  fillColor: fillColor,
                  fillOpacity: fillOpacity,
                  dashArray: dashArray
                }}
                eventHandlers={{
                  click: () => onSelectRegion(reg.id)
                }}
              >
                <Tooltip sticky direction="top" className="custom-leaflet-tooltip">
                  <div className="text-xs font-sans font-bold text-slate-100">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: strokeColor }}></span>
                      <span>{reg.name}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal block mt-0.5">
                      {reg.registered_cameras || (reg.zones?.length || 0)} Cameras
                    </span>
                  </div>
                </Tooltip>
              </Polygon>
            );
          })}

          {/* Drawing Preview Polyline & Polygon */}
          {isDrawMode && drawnVertices.length >= 2 && (
            <Polyline
              positions={drawnVertices}
              pathOptions={{ color: '#10b981', weight: 3, dashArray: '6, 6' }}
            />
          )}
          {isDrawMode && drawnVertices.length >= 3 && (
            <Polygon
              positions={drawnVertices}
              pathOptions={{ color: '#10b981', weight: 2, fillColor: '#10b981', fillOpacity: 0.2 }}
            />
          )}
          {isDrawMode &&
            drawnVertices.map((v, idx) => (
              <Marker key={`draw-pt-${idx}`} position={v} icon={vertexPointIcon(idx)} />
            ))}

          {/* Searched Location Pin */}
          {searchedLocation && (
            <Marker position={[searchedLocation.lat, searchedLocation.lng]} icon={searchedPinIcon}>
              <Popup>
                <div className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-sans max-w-[240px]">
                  <strong className="text-purple-400 block text-sm mb-1 font-extrabold">Searched Location</strong>
                  <p className="text-slate-300 text-[11px] mb-2">{searchedLocation.displayName}</p>
                  <button
                    type="button"
                    onClick={handleSetupSearchedLocation}
                    className="w-full py-1.5 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Set Up Monitored Region Here</span>
                  </button>
                </div>
              </Popup>
            </Marker>
          )}

          {/* User Live GPS Pin */}
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userGpsIcon}>
              <Popup>
                <div className="p-2 bg-slate-900 text-slate-100 rounded-lg text-xs font-sans">
                  <strong className="text-cyan-400 block text-sm mb-1">Your Live GPS Location</strong>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Heatmap Density Circles */}
          {showHeatmap &&
            heatmapData.map((hp) => (
              <Circle
                key={`heat-${hp.zone_id}`}
                center={[hp.latitude, hp.longitude]}
                radius={90 * (hp.weight || 0.5) + 35}
                pathOptions={{
                  fillColor: statusColors[hp.status] || '#3b82f6',
                  fillOpacity: Math.max(0.3, (hp.weight || 0.3) * 0.65),
                  color: statusColors[hp.status] || '#3b82f6',
                  weight: 1
                }}
              />
            ))}

          {/* Camera Point Pins */}
          {displayedCameras.map((cam) => {
            const camLat = typeof cam.latitude === 'number' ? cam.latitude : (typeof cam.lat === 'number' ? cam.lat : null);
            const camLng = typeof cam.longitude === 'number' ? cam.longitude : (typeof cam.lng === 'number' ? cam.lng : null);
            if (camLat === null || camLng === null || isNaN(camLat) || isNaN(camLng)) {
              return null;
            }

            const isSelected = selectedZoneId === cam.id;
            const camIcon = createCameraIcon(cam.status || cam.crowd_status, isSelected, cam.name);

            return (
              <Marker
                key={`cam-${cam.id}`}
                position={[camLat, camLng]}
                icon={camIcon}
                eventHandlers={{
                  click: () => handleCameraPointClick(cam)
                }}
              >
                <Tooltip sticky direction="top" className="custom-leaflet-tooltip">
                  <div className="text-xs font-sans font-bold text-slate-100">
                    <span className="flex items-center gap-1.5 text-blue-400">
                      <Camera className="w-3 h-3" />
                      <span>{cam.name}</span>
                    </span>
                    <span className="text-[10px] text-slate-300 font-mono block mt-0.5">
                      Live AI Count: {cam.people_count || 0} / {cam.capacity || 100}
                    </span>
                  </div>
                </Tooltip>
              </Marker>
            );
          })}
        </MapContainer>

        {/* REQUIREMENT 5: Slide-In Camera Point Inspector & Live Outputs Overlay */}
        {showInspector && activeCameraObj && (
          <div className="absolute bottom-4 right-4 z-40 w-96 max-w-[calc(100%-2rem)] bg-slate-950/95 border border-slate-700/80 rounded-3xl p-4 shadow-2xl backdrop-blur-xl animate-fade-in flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
                <div>
                  <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-blue-400" />
                    <span>{activeCameraObj.name}</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID: {activeCameraObj.id} &bull; {activeCameraObj.region_name || selectedRegion?.name}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowInspector(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Video Preview with Real YOLO Detection */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 aspect-video flex items-center justify-center">
              <img
                src={`/api/cameras/${activeCameraObj.id}/feed?t=${Date.now()}`}
                alt={activeCameraObj.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div style={{ display: 'none' }} className="flex-col items-center justify-center text-slate-400 text-xs gap-1.5 p-4 text-center">
                <Radio className="w-6 h-6 text-slate-500 animate-pulse" />
                <span>Camera Stream Offline / Reconnecting...</span>
              </div>
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>REAL YOLO FEED</span>
              </div>
            </div>

            {/* Camera Real-Time Outputs */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 text-center">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">AI Count</span>
                <span className="text-sm font-extrabold text-white font-mono">{activeCameraObj.people_count || 0}</span>
                <span className="text-[9px] text-slate-500 block font-mono">/ {activeCameraObj.capacity || 100}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 text-center">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Occupancy</span>
                <span className="text-sm font-extrabold text-white font-mono">
                  {activeCameraObj.occupancy ? activeCameraObj.occupancy.toFixed(1) : '0.0'}%
                </span>
                <span className={`text-[9px] font-bold block ${statusColors[activeCameraObj.crowd_status || 'Normal']}`}>
                  {activeCameraObj.crowd_status || 'Normal'}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 text-center">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Inference</span>
                <span className="text-sm font-extrabold text-white font-mono">{activeCameraObj.fps || 16} FPS</span>
                <span className="text-[9px] text-blue-400 block font-mono">
                  {Math.round((activeCameraObj.detection_confidence || 0.88) * 100)}% Conf
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <button
                type="button"
                onClick={() => {
                  if (onInspectCamera) onInspectCamera(activeCameraObj.id);
                }}
                className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Full Camera Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => onStartWebcam && onStartWebcam(activeCameraObj.id)}
                className="py-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="Attach Physical Webcam (Device 0)"
              >
                <Video className="w-3.5 h-3.5 text-emerald-400" />
                <span>Webcam</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenRtspDialog(activeCameraObj.id)}
                className="py-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="Enter RTSP Stream URL"
              >
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span>RTSP</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* REQUIREMENT 2: Modal to Set Region Name & Number of Camera Points with Real Inputs */}
      {showRegionSetupModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-xl w-full shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <div>
                  <h4 className="text-base font-extrabold text-white">Configure Region &amp; Camera Points</h4>
                  <span className="text-xs text-slate-400">Set region perimeter and number of real-world surveillance cameras</span>
                </div>
              </div>
              <button onClick={() => setShowRegionSetupModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Reverse-geocoded India Street / POI resolution badge */}
            {reverseGeoLoading ? (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-pulse mb-3">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
                <span>Resolving exact street, college, school &amp; district details in India...</span>
              </div>
            ) : resolvedAddress ? (
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs flex items-start gap-2.5 mb-3">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="font-extrabold text-white text-xs block truncate">
                    {resolvedAddress.road || resolvedAddress.area || 'Identified Street / Location'}
                  </span>
                  <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                    {resolvedAddress.fullAddress}
                  </span>
                </div>
              </div>
            ) : null}

            <form onSubmit={handleCreateRegionSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1 uppercase">Region Location Name</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. City Plaza, Station Terminal 3, Sports Arena"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1 uppercase">Description</label>
                <input
                  type="text"
                  value={regDesc}
                  onChange={(e) => setRegDesc(e.target.value)}
                  placeholder="e.g. Monitored public perimeter and access gates"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1 uppercase">Region Total Capacity</label>
                  <input
                    type="number"
                    min="10"
                    required
                    value={regCapacity}
                    onChange={(e) => setRegCapacity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1 uppercase">Region Color</label>
                  <div className="flex items-center gap-2 mt-1">
                    {['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4'].map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setRegColor(col)}
                        style={{ backgroundColor: col }}
                        className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                          regColor === col ? 'scale-125 border-white ring-2 ring-emerald-500' : 'border-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* REQUIREMENT 2: Set Number of Camera Points */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-blue-400" />
                      Number of Camera Points in this Region
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Specify camera coverage density for real-time video surveillance
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCameraCount((prev) => Math.max(1, prev - 1))}
                      className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 text-white font-extrabold text-sm hover:bg-slate-800 active:scale-95"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm font-extrabold text-blue-400 font-mono">
                      {cameraCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCameraCount((prev) => Math.min(10, prev + 1))}
                      className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 text-white font-extrabold text-sm hover:bg-slate-800 active:scale-95"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Camera Points Distribution Preview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {cameraPointConfigs.map((cp, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col gap-1 text-xs">
                      <div className="flex items-center justify-between">
                        <strong className="text-white text-[11px] flex items-center gap-1">
                          <Camera className="w-3 h-3 text-emerald-400" />
                          {cp.name}
                        </strong>
                        <span className="text-[10px] text-slate-400 font-mono">Cap: {cp.capacity}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Source:</span>
                        <span className="text-emerald-400 font-semibold">
                          Real CCTV Video (YOLO)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isCreatingRegion}
                  onClick={() => setShowRegionSetupModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingRegion}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-600/30 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isCreatingRegion ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Region &amp; Cameras...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Create Region &amp; Launch {cameraCount} Cameras</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
            <form onSubmit={handleSaveRtsp} className="space-y-3">
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
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold"
                >
                  Connect Stream
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Map Helper Footer */}
      <div className="relative z-10 flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 gap-2">
        <span className="flex items-center gap-1.5 font-semibold text-slate-300">
          <Navigation className="w-3.5 h-3.5 text-blue-400" />
          Click any camera point to zoom out and inspect its live outputs, graphs, alerts, and actions.
        </span>
        <span className="text-slate-500 text-[10px]">
          Leaflet OpenStreetMap &bull; 100% Real YOLOv8 AI Telemetry
        </span>
      </div>
    </div>
  );
}
