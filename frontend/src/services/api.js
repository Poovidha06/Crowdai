const API_BASE = '/api';

export async function fetchLocations() {
  const res = await fetch(`${API_BASE}/locations`);
  if (!res.ok) throw new Error('Failed to fetch locations');
  return res.json();
}

export async function fetchLocationSummary(locationId) {
  const res = await fetch(`${API_BASE}/locations/${locationId}/summary`);
  if (!res.ok) throw new Error('Failed to fetch location summary');
  return res.json();
}

export async function fetchLocationHeatmap(locationId) {
  const res = await fetch(`${API_BASE}/locations/${locationId}/heatmap`);
  if (!res.ok) throw new Error('Failed to fetch location heatmap');
  return res.json();
}

export async function fetchZoneHistory(zoneId, timeFilter = 'today') {
  const res = await fetch(`${API_BASE}/zones/${zoneId}/history?time_filter=${timeFilter}`);
  if (!res.ok) throw new Error('Failed to fetch zone history');
  return res.json();
}

export async function fetchActiveAlerts() {
  const res = await fetch(`${API_BASE}/alerts`);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function resolveAlert(alertId) {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/resolve`, {
    method: 'PUT'
  });
  if (!res.ok) throw new Error('Failed to resolve alert');
  return res.json();
}

export async function updateZoneCapacity(zoneId, newCapacity) {
  const res = await fetch(`${API_BASE}/zones/${zoneId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ capacity: newCapacity })
  });
  if (!res.ok) throw new Error('Failed to update zone capacity');
  return res.json();
}

export async function createZone(locationId, zoneData) {
  const payload = { location_id: locationId, ...zoneData };
  const res = await fetch(`${API_BASE}/locations/${locationId}/zones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to create zone');
  }
  return res.json();
}

export async function deleteZone(zoneId) {
  const res = await fetch(`${API_BASE}/zones/${zoneId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete zone');
  return res.json();
}

// ----------------------------
// Region & Monitoring Area APIs
// ----------------------------
export async function fetchRegions() {
  const res = await fetch(`${API_BASE}/regions`);
  if (!res.ok) throw new Error('Failed to fetch regions');
  return res.json();
}

export async function fetchRegion(regionId) {
  const res = await fetch(`${API_BASE}/regions/${regionId}`);
  if (!res.ok) throw new Error('Failed to fetch region');
  return res.json();
}

export async function createRegion(regionData) {
  const res = await fetch(`${API_BASE}/regions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(regionData)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to create custom region');
  }
  return res.json();
}

export async function updateRegion(regionId, regionData) {
  const res = await fetch(`${API_BASE}/regions/${regionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(regionData)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to update region');
  }
  return res.json();
}

export async function deleteRegion(regionId) {
  const res = await fetch(`${API_BASE}/regions/${regionId}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to delete region');
  }
  return res.json();
}

// ----------------------------
// Dedicated Camera Endpoints
// ----------------------------
export async function fetchCameras() {
  const res = await fetch(`${API_BASE}/cameras`);
  if (!res.ok) throw new Error('Failed to fetch cameras');
  return res.json();
}

export async function fetchCameraDetail(cameraId) {
  const res = await fetch(`${API_BASE}/cameras/${cameraId}`);
  if (!res.ok) throw new Error('Failed to fetch camera details');
  return res.json();
}

export async function updateCameraCapacity(cameraId, { capacity, warning_threshold, critical_threshold }) {
  const res = await fetch(`${API_BASE}/cameras/${cameraId}/capacity`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ capacity, warning_threshold, critical_threshold })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to update camera capacity');
  }
  return res.json();
}

export async function startCameraWebcam(cameraId, deviceIndex = 0) {
  const res = await fetch(`${API_BASE}/cameras/${cameraId}/webcam?device_index=${deviceIndex}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to start webcam on camera');
  return res.json();
}

export async function uploadCameraVideo(cameraId, file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/cameras/${cameraId}/upload_video`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('Failed to upload video for camera');
  return res.json();
}

export async function stopCameraStream(cameraId) {
  const res = await fetch(`${API_BASE}/cameras/${cameraId}/stop`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to stop camera stream');
  return res.json();
}

export async function reconnectCameraStream(cameraId) {
  const res = await fetch(`${API_BASE}/cameras/${cameraId}/reconnect`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to initiate camera reconnection');
  return res.json();
}

// ----------------------------
// Combined Multi-Camera Regional Analytics
// ----------------------------
export async function fetchRegionCombinedAnalytics(regionId, overlapPercent = null) {
  const query = overlapPercent !== null ? `?overlap_percent=${overlapPercent}` : '';
  const res = await fetch(`${API_BASE}/regions/${regionId}/combined-analytics${query}`);
  if (!res.ok) throw new Error('Failed to fetch combined region analytics');
  return res.json();
}

export async function updateRegionOverlap(regionId, overlapPercentage) {
  const res = await fetch(`${API_BASE}/regions/${regionId}/overlap`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ overlap_percentage: overlapPercentage })
  });
  if (!res.ok) throw new Error('Failed to update overlap deduction setting');
  return res.json();
}

// ----------------------------
// Section 6: Camera & Regional Time-Series History
// ----------------------------
export async function fetchCameraHistory(cameraId, timeFilter = '15m') {
  const res = await fetch(`${API_BASE}/cameras/${cameraId}/history?time_filter=${timeFilter}`);
  if (!res.ok) throw new Error(`Failed to fetch history for camera ${cameraId}`);
  return res.json();
}

export async function fetchRegionCombinedHistory(regionId, timeFilter = '15m', overlapPercent = null) {
  const query = overlapPercent !== null ? `&overlap_percent=${overlapPercent}` : '';
  const res = await fetch(`${API_BASE}/regions/${regionId}/history?time_filter=${timeFilter}${query}`);
  if (!res.ok) throw new Error(`Failed to fetch combined history for region ${regionId}`);
  return res.json();
}

// ----------------------------
// Section 7: Smart Multi-Camera Alerts & Actions
// ----------------------------
export async function fetchFilteredAlerts(filters = {}) {
  const params = new URLSearchParams();
  if (filters.region_id && filters.region_id !== 'all') params.append('region_id', filters.region_id);
  if (filters.camera_id && filters.camera_id !== 'all') params.append('camera_id', filters.camera_id);
  if (filters.severity && filters.severity !== 'all') params.append('severity', filters.severity);
  if (filters.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters.limit) params.append('limit', filters.limit);

  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/alerts${qs}`);
  if (!res.ok) throw new Error('Failed to fetch filtered alerts');
  return res.json();
}

export async function acknowledgeAlert(alertId, userName = 'Security Operator') {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/acknowledge?user_name=${encodeURIComponent(userName)}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to acknowledge alert');
  return res.json();
}

export async function clearAlert(alertId) {
  const res = await fetch(`${API_BASE}/alerts/${alertId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to clear alert');
  return res.json();
}

export async function clearAllResolvedAlerts() {
  const res = await fetch(`${API_BASE}/alerts`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to clear resolved alerts');
  return res.json();
}

// ----------------------------
// Real Camera Input & Source APIs
// ----------------------------
export async function attachCameraStreamUrl(cameraId, streamUrl) {
  const res = await fetch(`${API_BASE}/cameras/${cameraId}/stream_url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stream_url: streamUrl })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to attach stream URL');
  }
  return res.json();
}

export async function addCameraToRegion(regionId, cameraData) {
  const res = await fetch(`${API_BASE}/regions/${regionId}/cameras`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cameraData)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to add camera point to region');
  }
  return res.json();
}

export async function fetchAvailableSources() {
  const res = await fetch(`${API_BASE}/system/sources`);
  if (!res.ok) throw new Error('Failed to fetch available sources');
  return res.json();
}





