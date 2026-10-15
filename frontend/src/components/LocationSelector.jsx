import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  MapPin, ChevronDown, Globe, Building2, BookOpen, Utensils,
  Landmark, Car, Plus, Camera, Check, RotateCcw, Sparkles,
  Search, Navigation, X, Loader2, ExternalLink, GraduationCap,
  School, Milestone, Store, Compass, Flag, Layers, ChevronRight
} from "lucide-react";
import {
  INDIA_STATES,
  INDIA_DISTRICTS_AND_CITIES,
  INDIA_COLLEGES_AND_UNIVERSITIES,
  INDIA_SCHOOLS,
  INDIA_STREETS_AND_AVENUES
} from "../data/indiaLocations";

export function LocationSelector({
  regions = [],
  selectedRegionId = "reg-entire-campus",
  onSelectRegion,
  onOpenAddCustomRegion,
  onFlyToLocation
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("india"); // "india" | "regions" | "search"
  const [indiaCategory, setIndiaCategory] = useState("all"); // "all" | "colleges" | "schools" | "streets" | "districts" | "states"
  const [indiaFilterQuery, setIndiaFilterQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isIndiaOnlySearch, setIsIndiaOnlySearch] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && activeTab === "search" && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }
  }, [isOpen, activeTab]);

  const selectedRegion = regions.find((r) => r.id === selectedRegionId) || regions[0] || {
    id: "reg-entire-campus",
    name: "Entire Campus",
    registered_cameras: 12,
    active_cameras: 10
  };

  const getRegionIcon = (reg) => {
    if (reg.id === "reg-entire-campus") return Globe;
    if (reg.name?.toLowerCase().includes("entrance") || reg.name?.toLowerCase().includes("gate")) return MapPin;
    if (reg.name?.toLowerCase().includes("academic")) return Building2;
    if (reg.name?.toLowerCase().includes("library")) return BookOpen;
    if (reg.name?.toLowerCase().includes("canteen")) return Utensils;
    if (reg.name?.toLowerCase().includes("auditorium")) return Landmark;
    if (reg.name?.toLowerCase().includes("parking")) return Car;
    return reg.is_custom ? Sparkles : MapPin;
  };

  const SelectedIcon = getRegionIcon(selectedRegion);

  // Deep Street/POI-level search handler with India prioritization
  const handleSearchInput = useCallback((value) => {
    setSearchQuery(value);
    setSearchError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim() || value.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const countryParam = isIndiaOnlySearch ? "&countrycodes=in" : "";
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=10&addressdetails=1&extratags=1${countryParam}&q=${encodeURIComponent(value.trim())}`,
          { headers: { "Accept-Language": "en" } }
        );
        let data = await res.json();
        
        // If India search returned 0 and user typed something generic, try global fallback
        if ((!data || data.length === 0) && isIndiaOnlySearch) {
          const fallbackRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=8&addressdetails=1&q=${encodeURIComponent(value.trim())}`,
            { headers: { "Accept-Language": "en" } }
          );
          data = await fallbackRes.json();
        }

        setSearchResults(data || []);
        if (!data || data.length === 0) {
          setSearchError("No locations found in India. Try another street, college, school or city name.");
        }
      } catch {
        setSearchError("Search failed. Check your internet connection.");
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 380);
  }, [isIndiaOnlySearch]);

  const handleSelectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const displayName = result.display_name;
    const type = result.type || "";
    const category = result.class || "";

    // Deep zoom into street/campus level if item is a street, college, school or building
    let zoom = 15;
    if (["highway", "road", "street", "pedestrian", "residential", "living_street", "track", "path"].includes(type) || category === "highway") {
      zoom = 19; // Street level
    } else if (["university", "college", "school", "kindergarten", "hospital", "clinic", "building", "place_of_worship"].includes(type) || category === "amenity") {
      zoom = 18; // Campus / institution level
    } else if (["suburb", "neighbourhood", "quarter"].includes(type) || category === "place") {
      zoom = 16;
    } else if (["city", "town", "village", "municipality"].includes(type)) {
      zoom = 14;
    } else if (["county", "district", "state_district"].includes(type)) {
      zoom = 12;
    } else if (["state", "country"].includes(type)) {
      zoom = 8;
    }

    if (onFlyToLocation) {
      onFlyToLocation(lat, lng, zoom, displayName);
    }
    setSearchQuery("");
    setSearchResults([]);
    setIsOpen(false);
  };

  const handleSelectDirectoryItem = (item, defaultZoom = 18) => {
    if (onFlyToLocation) {
      onFlyToLocation(item.lat, item.lng, item.zoom || defaultZoom, item.name);
    }
    setIsOpen(false);
  };

  const getCategoryIconComponent = (type, category) => {
    if (["university", "college"].includes(type) || (category === "amenity" && type?.includes("college"))) return GraduationCap;
    if (["school", "kindergarten"].includes(type)) return School;
    if (["highway", "road", "street", "pedestrian", "residential", "living_street"].includes(type) || category === "highway") return Milestone;
    if (["city", "town", "village", "municipality"].includes(type)) return Building2;
    if (["mall", "marketplace", "supermarket", "shop"].includes(type)) return Store;
    if (["park", "nature_reserve"].includes(type)) return Compass;
    if (["monument", "landmark", "temple", "place_of_worship"].includes(type)) return Landmark;
    return MapPin;
  };

  const formatAddress = (result) => {
    const parts = [];
    const addr = result.address || {};
    if (addr.road || addr.pedestrian) parts.push(addr.road || addr.pedestrian);
    if (addr.suburb || addr.neighbourhood) parts.push(addr.suburb || addr.neighbourhood);
    if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
    if (addr.state_district) parts.push(addr.state_district);
    if (addr.state) parts.push(addr.state);
    if (addr.country) parts.push(addr.country);
    return parts.join(", ") || result.display_name?.split(",").slice(0, 4).join(", ");
  };

  // Filtered India Directory items
  const filteredIndiaItems = useMemo(() => {
    const query = indiaFilterQuery.toLowerCase().trim();

    let items = [];
    if (indiaCategory === "all" || indiaCategory === "colleges") {
      items.push(...INDIA_COLLEGES_AND_UNIVERSITIES.map(c => ({ ...c, kind: "college", icon: GraduationCap, badge: "College / Univ" })));
    }
    if (indiaCategory === "all" || indiaCategory === "schools") {
      items.push(...INDIA_SCHOOLS.map(s => ({ ...s, kind: "school", icon: School, badge: "School / Academy" })));
    }
    if (indiaCategory === "all" || indiaCategory === "streets") {
      items.push(...INDIA_STREETS_AND_AVENUES.map(st => ({ ...st, kind: "street", icon: Milestone, badge: "Street / Avenue" })));
    }
    if (indiaCategory === "all" || indiaCategory === "districts") {
      items.push(...INDIA_DISTRICTS_AND_CITIES.map(d => ({ ...d, kind: "district", icon: Building2, badge: "District / City" })));
    }
    if (indiaCategory === "all" || indiaCategory === "states") {
      items.push(...INDIA_STATES.map(st => ({ ...st, kind: "state", icon: Flag, badge: "State / UT" })));
    }

    if (!query) return items;

    return items.filter(it =>
      it.name.toLowerCase().includes(query) ||
      (it.city && it.city.toLowerCase().includes(query)) ||
      (it.state && it.state.toLowerCase().includes(query)) ||
      (it.address && it.address.toLowerCase().includes(query)) ||
      (it.capital && it.capital.toLowerCase().includes(query))
    );
  }, [indiaCategory, indiaFilterQuery]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="true"
          aria-expanded={isOpen}
          className="flex items-center gap-2.5 bg-slate-900/95 hover:bg-slate-850 border border-slate-700/80 hover:border-blue-500/60 px-3.5 py-1.5 rounded-xl text-slate-200 transition-all shadow-md shadow-black/20 focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer group"
          title="Select Monitoring Location / Region"
        >
          <div className="p-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:scale-105 transition-transform shrink-0">
            <SelectedIcon className="w-3.5 h-3.5" />
          </div>
          <div className="text-left flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider leading-tight">
              Location / Region
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-white tracking-wide truncate max-w-[130px] sm:max-w-[170px]">
                {selectedRegion.name}
              </span>
              {selectedRegion.is_custom && (
                <span className="text-[9px] font-bold px-1.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Custom
                </span>
              )}
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700 text-[10px] font-semibold text-slate-300 shrink-0">
            <Camera className="w-3 h-3 text-emerald-400" />
            <span>
              <strong className="text-emerald-400">{selectedRegion.active_cameras || 0}</strong>
              <span className="text-slate-500">/</span>
              <span>{selectedRegion.registered_cameras || 0}</span>
            </span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-blue-400" : ""}`} />
        </button>

        {selectedRegionId !== "reg-entire-campus" && (
          <button
            type="button"
            onClick={() => onSelectRegion("reg-entire-campus")}
            className="p-1.5 bg-slate-800/90 hover:bg-blue-600/20 text-slate-400 hover:text-blue-300 border border-slate-700 hover:border-blue-500/40 rounded-xl transition-all shadow-sm cursor-pointer"
            title="Return to Default Region View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-[420px] sm:w-[480px] max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl bg-slate-900 border border-slate-700/90 z-50 backdrop-blur-xl overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="p-3 bg-slate-950/80 border-b border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                Monitoring Location &amp; India Navigator
              </h4>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 3 Main Navigation Tabs */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab("india")}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "india"
                    ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Flag className="w-3.5 h-3.5 text-amber-300" />
                <span>India Directory</span>
              </button>

              <button
                onClick={() => setActiveTab("regions")}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "regions"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Cameras</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${activeTab === "regions" ? "bg-blue-500/40 text-blue-200" : "bg-slate-800 text-slate-400"}`}>
                  {regions.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("search")}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "search"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Deep Search</span>
              </button>
            </div>
          </div>

          {/* TAB 1: India Directory Explorer (States, Districts, Colleges, Schools, Streets) */}
          {activeTab === "india" && (
            <div className="flex flex-col">
              {/* Category Filter Bar */}
              <div className="p-2.5 bg-slate-950/60 border-b border-slate-800 flex flex-col gap-2">
                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { id: "all", label: "All India", icon: Globe },
                    { id: "colleges", label: "Colleges & Univs", icon: GraduationCap },
                    { id: "schools", label: "Schools", icon: School },
                    { id: "streets", label: "Streets & Hubs", icon: Milestone },
                    { id: "districts", label: "Districts & Cities", icon: Building2 },
                    { id: "states", label: "28 States & UTs", icon: Flag }
                  ].map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setIndiaCategory(cat.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all cursor-pointer ${
                          indiaCategory === cat.id
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60"
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Instant Filter Input inside India Directory */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={indiaFilterQuery}
                    onChange={(e) => setIndiaFilterQuery(e.target.value)}
                    placeholder="Filter India states, districts, colleges, schools or streets..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  {indiaFilterQuery && (
                    <button
                      onClick={() => setIndiaFilterQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                {filteredIndiaItems.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No matching location in directory. Use the &quot;Deep Search&quot; tab to search any small street in India!
                  </div>
                ) : (
                  filteredIndiaItems.map((item) => {
                    const ItemIcon = item.icon || MapPin;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectDirectoryItem(item)}
                        className="w-full flex items-start justify-between gap-2.5 p-2 rounded-xl text-left hover:bg-slate-800/80 text-slate-300 hover:text-white border border-transparent hover:border-amber-500/30 transition-all group cursor-pointer"
                      >
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                            <ItemIcon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-white truncate leading-tight">
                                {item.name}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-amber-300 border border-amber-500/20 font-medium">
                                {item.badge}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                              {item.address || (item.city ? `${item.city}, ${item.state}` : item.capital ? `Capital: ${item.capital}` : item.state)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500 shrink-0 mt-1">
                          <span>Zoom {item.zoom || 18}</span>
                          <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-amber-400 transition-colors" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Bottom Info Banner */}
              <div className="p-2 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Flag className="w-3 h-3 text-amber-400" />
                  <span>Click any entry to jump Google Streets map directly there</span>
                </span>
                <span className="font-mono text-amber-400 font-bold">{filteredIndiaItems.length} Entries</span>
              </div>
            </div>
          )}

          {/* TAB 2: Camera Regions List */}
          {activeTab === "regions" && (
            <>
              <div className="max-h-72 overflow-y-auto p-1.5 space-y-1">
                {regions.map((reg) => {
                  const IconComp = getRegionIcon(reg);
                  const isSelected = reg.id === selectedRegionId;
                  return (
                    <button
                      key={reg.id}
                      type="button"
                      onClick={() => { onSelectRegion(reg.id); setIsOpen(false); }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-blue-600/20 text-white border border-blue-500/50 shadow-inner"
                          : "hover:bg-slate-800/80 text-slate-300 hover:text-white border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border"
                          style={{
                            backgroundColor: `${reg.color || "#3b82f6"}22`,
                            borderColor: `${reg.color || "#3b82f6"}44`,
                            color: reg.color || "#3b82f6"
                          }}
                        >
                          <IconComp className="w-3.5 h-3.5" />
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold truncate">{reg.name}</span>
                            {reg.is_custom && (
                              <span className="text-[8px] font-bold px-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Custom</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {reg.description || (reg.id === "reg-entire-campus" ? "All monitoring areas" : "Monitoring region")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-200">
                            <Camera className="w-3 h-3 text-emerald-400" />
                            <span>{reg.active_cameras || 0}/{reg.registered_cameras || 0}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 block">cams active</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-400 shrink-0 ml-1" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-2 bg-slate-950/80 border-t border-slate-800 flex items-center flex-wrap justify-between gap-2">
                <button
                  type="button"
                  onClick={() => { onSelectRegion("reg-entire-campus"); setIsOpen(false); }}
                  className="px-2.5 py-1.5 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 text-blue-400" />
                  <span>All Campus Regions</span>
                </button>
                {onOpenAddCustomRegion && (
                  <button
                    type="button"
                    onClick={() => { setIsOpen(false); onOpenAddCustomRegion(); }}
                    className="px-2.5 py-1.5 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Custom Region</span>
                  </button>
                )}
              </div>
            </>
          )}

          {/* TAB 3: Deep Street-Level Search across India & Worldwide */}
          {activeTab === "search" && (
            <div className="flex flex-col">
              <div className="p-3 border-b border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-bold flex items-center gap-1">
                    <Search className="w-3 h-3 text-emerald-400" />
                    Search any small street, college, school, district in India
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-300 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                    <input
                      type="checkbox"
                      checked={isIndiaOnlySearch}
                      onChange={(e) => setIsIndiaOnlySearch(e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                    <span>India-Only Focus</span>
                  </label>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    placeholder="e.g. Cross Cut Road Coimbatore, Anna University, KV Madurai, Marine Drive..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500/60 text-white text-xs rounded-xl pl-8 pr-10 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder-slate-500"
                    autoComplete="off"
                  />
                  {isSearching && (
                    <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                  {!isSearching && searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(""); setSearchResults([]); setSearchError(null); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto">
                {searchError && !isSearching && (
                  <div className="p-4 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                    <MapPin className="w-8 h-8 text-slate-700" />
                    <span>{searchError}</span>
                  </div>
                )}

                {!searchQuery && !isSearching && searchResults.length === 0 && (
                  <div className="p-4 flex flex-col items-center gap-2 text-center">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Navigation className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-300">Search Street, School, College or District</p>
                      <p className="text-[10px] text-slate-500 max-w-xs mt-0.5">
                        Type any street name, lane, college campus, school, or town across India to view it in high resolution.
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-1.5 mt-1">
                      {[
                        "TCE Madurai",
                        "IIT Madras",
                        "MG Road Bengaluru",
                        "Marine Drive Mumbai",
                        "Connaught Place Delhi",
                        "Anna Nagar Madurai",
                        "Kendriya Vidyalaya"
                      ].map((s) => (
                        <button
                          key={s}
                          onClick={() => handleSearchInput(s)}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="p-1.5 space-y-1">
                    {searchResults.map((result, idx) => {
                      const IconComp = getCategoryIconComponent(result.type, result.class);
                      return (
                        <button
                          key={`${result.place_id}-${idx}`}
                          type="button"
                          onClick={() => handleSelectSearchResult(result)}
                          className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-slate-800/80 text-slate-300 hover:text-white border border-transparent hover:border-emerald-500/20 transition-all group cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                            <IconComp className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-bold text-white truncate leading-tight">
                                {result.name || result.display_name?.split(",")[0]}
                              </p>
                              <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-emerald-400 transition-colors shrink-0 mt-0.5" />
                            </div>
                            <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{formatAddress(result)}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] text-slate-600 font-mono">
                                {parseFloat(result.lat).toFixed(4)}, {parseFloat(result.lon).toFixed(4)}
                              </span>
                              {result.type && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 capitalize font-medium">
                                  {result.type.replace(/_/g, " ")}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {searchResults.length > 0 && (
                <div className="px-3 py-2 bg-slate-950/80 border-t border-slate-800 text-[10px] text-slate-500 flex items-center gap-1.5">
                  <Navigation className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>Click any result to zoom the map down to street-level details.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
