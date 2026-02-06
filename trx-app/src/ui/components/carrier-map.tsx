"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface LoadPoint {
  order_id: string;
  from: string;
  to: string;
  state: string;
}

interface CarrierMapProps {
  carrierLocation: { city: string; country: string; company_name: string } | null;
  loads: LoadPoint[];
}

// Geocode via Nominatim (free, no API key)
const geocodeCache: Record<string, [number, number] | null> = {};

async function geocode(place: string): Promise<[number, number] | null> {
  if (geocodeCache[place] !== undefined) return geocodeCache[place];

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}&limit=1`,
      { headers: { "User-Agent": "TRX-App/1.0" } }
    );
    const data = await res.json();
    if (data.length > 0) {
      const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      geocodeCache[place] = coords;
      return coords;
    }
  } catch {
    // silently fail
  }
  geocodeCache[place] = null;
  return null;
}

// Custom carrier icon (blue truck marker)
function createCarrierIcon() {
  return L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:#4f46e5;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
    </div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

// Load pickup icon (orange pin)
function createPickupIcon() {
  return L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;background:#f59e0b;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.36.2-.8.2-1.14 0l-7.9-4.44A.991.991 0 013 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.36-.2.8-.2 1.14 0l7.9 4.44c.32.17.53.5.53.88v9z"/></svg>
    </div>`,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

// Load destination icon (green pin)
function createDestIcon() {
  return L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;background:#10b981;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
    </div>`,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

export default function CarrierMap({ carrierLocation, loads }: CarrierMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [ready, setReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [39.8, -98.5], // center of US
      zoom: 4,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapInstanceRef.current = map;
    setReady(true);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Add markers when data changes
  useEffect(() => {
    if (!ready || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    const markersGroup = L.layerGroup().addTo(map);
    const bounds: L.LatLng[] = [];

    async function addMarkers() {
      // Carrier location marker
      if (carrierLocation?.city) {
        const query = `${carrierLocation.city}, ${carrierLocation.country}`;
        const coords = await geocode(query);
        if (coords) {
          const marker = L.marker(coords, { icon: createCarrierIcon() })
            .bindPopup(
              `<div style="font-family:system-ui;font-size:13px;">
                <strong>${carrierLocation.company_name}</strong><br/>
                <span style="color:#6b7280;">${carrierLocation.city}, ${carrierLocation.country}</span><br/>
                <span style="color:#4f46e5;font-size:11px;">Your location</span>
              </div>`
            );
          markersGroup.addLayer(marker);
          bounds.push(L.latLng(coords[0], coords[1]));
        }
      }

      // Load markers (pickup = orange, destination = green)
      for (const load of loads) {
        const fromCoords = await geocode(load.from);
        if (fromCoords) {
          const marker = L.marker(fromCoords, { icon: createPickupIcon() })
            .bindPopup(
              `<div style="font-family:system-ui;font-size:13px;">
                <strong>${load.order_id}</strong><br/>
                <span style="color:#f59e0b;">Pickup:</span> ${load.from}<br/>
                <span style="color:#10b981;">Delivery:</span> ${load.to}<br/>
                <span style="font-size:11px;color:#6b7280;">${load.state}</span>
              </div>`
            );
          markersGroup.addLayer(marker);
          bounds.push(L.latLng(fromCoords[0], fromCoords[1]));
        }

        const toCoords = await geocode(load.to);
        if (toCoords) {
          const marker = L.marker(toCoords, { icon: createDestIcon() })
            .bindPopup(
              `<div style="font-family:system-ui;font-size:13px;">
                <strong>${load.order_id}</strong><br/>
                <span style="color:#10b981;">Delivery:</span> ${load.to}<br/>
                <span style="color:#f59e0b;">From:</span> ${load.from}<br/>
                <span style="font-size:11px;color:#6b7280;">${load.state}</span>
              </div>`
            );
          markersGroup.addLayer(marker);
          bounds.push(L.latLng(toCoords[0], toCoords[1]));

          // Draw route line from pickup to delivery
          if (fromCoords) {
            const line = L.polyline(
              [fromCoords, toCoords],
              { color: "#6366f1", weight: 2, opacity: 0.5, dashArray: "6 4" }
            );
            markersGroup.addLayer(line);
          }
        }
      }

      // Fit bounds if we have points
      if (bounds.length > 0) {
        map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 12 });
      }
    }

    addMarkers();

    return () => {
      markersGroup.clearLayers();
      map.removeLayer(markersGroup);
    };
  }, [ready, carrierLocation, loads]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Load Map</h3>
          <p className="text-xs text-gray-500">Your location and available loads</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block" />
            You
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            Pickup
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            Delivery
          </span>
        </div>
      </div>
      <div ref={mapRef} style={{ height: 400, width: "100%" }} />
    </div>
  );
}
