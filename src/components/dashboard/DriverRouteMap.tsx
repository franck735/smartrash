import { useEffect, useRef } from "react";

type LatLng = { lat: number; lng: number };

export interface DriverRouteStop {
  id: string;
  routeOrder: number;
  location: LatLng | null;
  fullName: string | null;
  address: string | null;
}

interface DriverRouteMapProps {
  origin: LatLng | null;
  stops: DriverRouteStop[];
  routePath: LatLng[];
}

declare global {
  interface Window {
    L?: any;
  }
}

const LEAFLET_CSS_ID = "leaflet-css-cdn";
const LEAFLET_SCRIPT_ID = "leaflet-script-cdn";
const DEFAULT_CENTER: LatLng = { lat: -1.9441, lng: 30.0619 };

let leafletLoader: Promise<any> | null = null;

const loadLeaflet = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Leaflet is only available in the browser."));
  }

  if (window.L) {
    return Promise.resolve(window.L);
  }

  if (!leafletLoader) {
    leafletLoader = new Promise((resolve, reject) => {
      if (!document.getElementById(LEAFLET_CSS_ID)) {
        const link = document.createElement("link");
        link.id = LEAFLET_CSS_ID;
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      const existingScript = document.getElementById(LEAFLET_SCRIPT_ID) as HTMLScriptElement | null;
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(window.L));
        existingScript.addEventListener("error", () => reject(new Error("Failed to load Leaflet script.")));
        return;
      }

      const script = document.createElement("script");
      script.id = LEAFLET_SCRIPT_ID;
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => resolve(window.L);
      script.onerror = () => reject(new Error("Failed to load Leaflet script."));
      document.body.appendChild(script);
    });
  }

  return leafletLoader;
};

const DriverRouteMap = ({ origin, stops, routePath }: DriverRouteMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const overlayLayerRef = useRef<any>(null);
  const tileLayerAddedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    void loadLeaflet()
      .then((L) => {
        if (!isMounted || !mapContainerRef.current) return;

        if (!mapRef.current) {
          mapRef.current = L.map(mapContainerRef.current, {
            zoomControl: true,
            attributionControl: true,
          });
        }

        const map = mapRef.current;
        if (!tileLayerAddedRef.current) {
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19,
          }).addTo(map);
          tileLayerAddedRef.current = true;
        }

        if (overlayLayerRef.current) {
          map.removeLayer(overlayLayerRef.current);
        }

        const overlayLayer = L.layerGroup().addTo(map);
        overlayLayerRef.current = overlayLayer;

        const validStops = stops.filter((stop) => stop.location !== null);
        const missingLocationStops = stops.filter((stop) => stop.location === null);
        const mapPoints: Array<[number, number]> = [];

        if (origin) {
          const originMarker = L.circleMarker([origin.lat, origin.lng], {
            radius: 8,
            color: "#0ea5e9",
            fillColor: "#0ea5e9",
            fillOpacity: 0.9,
            weight: 2,
          }).bindPopup("Driver start point");
          originMarker.addTo(overlayLayer);
          mapPoints.push([origin.lat, origin.lng]);
        }

        for (const stop of validStops) {
          const location = stop.location as LatLng;
          const numberIcon = L.divIcon({
            className: "",
            html: `<div style="background:#16a34a;color:white;border-radius:9999px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.35)">${stop.routeOrder}</div>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          });

          L.marker([location.lat, location.lng], { icon: numberIcon })
            .bindPopup(
              `<div style="font-family:system-ui;font-size:12px">
                <strong>Stop ${stop.routeOrder}</strong><br/>
                <strong>${stop.fullName ?? "Unknown"}</strong><br/>
                ${stop.address ? `📍 ${stop.address}` : "<em>No address</em>"}
              </div>`,
            )
            .addTo(overlayLayer);

          mapPoints.push([location.lat, location.lng]);
        }

        // Add markers for stops without GPS but with addresses (pending geocoding)
        if (missingLocationStops.length > 0) {
          const unlocatedGroup = L.layerGroup().addTo(overlayLayer);

          for (const stop of missingLocationStops) {
            if (!stop.address) continue;

            // Create a light gray marker to indicate pending location
            const pendingIcon = L.divIcon({
              className: "",
              html: `<div style="background:#d1d5db;color:#666;border-radius:9999px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.35);opacity:0.6">${stop.routeOrder}</div>`,
              iconSize: [26, 26],
              iconAnchor: [13, 13],
            });

            // Use a placeholder marker at center or origin
            const markerLocation = origin ?? DEFAULT_CENTER;

            L.marker([markerLocation.lat, markerLocation.lng], { icon: pendingIcon })
              .bindPopup(
                `<div style="font-family:system-ui;font-size:12px">
                  <strong>Stop ${stop.routeOrder} - PENDING LOCATION</strong><br/>
                  <strong>${stop.fullName ?? "Unknown"}</strong><br/>
                  📍 ${stop.address}<br/>
                  <em style="color:#888">Use "Find Location" button to geocode</em>
                </div>`,
              )
              .addTo(unlocatedGroup);
          }
        }

        const linePoints: Array<[number, number]> =
          routePath.length > 1
            ? routePath.map((point) => [point.lat, point.lng])
            : [origin, ...validStops.map((stop) => stop.location)].filter(
                (point): point is LatLng => point !== null,
              ).map((point) => [point.lat, point.lng]);

        if (linePoints.length > 1) {
          L.polyline(linePoints, {
            color: "#2563eb",
            weight: 4,
            opacity: 0.85,
          }).addTo(overlayLayer);
        }

        if (mapPoints.length > 1) {
          map.fitBounds(mapPoints, { padding: [30, 30] });
        } else if (mapPoints.length === 1) {
          map.setView(mapPoints[0], 14);
        } else {
          map.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 12);
        }

        setTimeout(() => {
          map.invalidateSize();
        }, 50);
      })
      .catch(() => {
        // Keep UI stable if map cannot be loaded at runtime.
      });

    return () => {
      isMounted = false;
    };
  }, [origin, stops, routePath]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      overlayLayerRef.current = null;
      tileLayerAddedRef.current = false;
    };
  }, []);

  return <div ref={mapContainerRef} className="h-[380px] w-full rounded-lg border border-border overflow-hidden" />;
};

export default DriverRouteMap;
