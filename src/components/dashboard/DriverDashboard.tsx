import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardHeader from "./DashboardHeader";
import DriverRouteMap, { type DriverRouteStop } from "./DriverRouteMap";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { geocodeAddress, reverseGeocode } from "@/lib/geocoding";
import { MapPin, CheckCircle, Navigation, Clock, Route, Loader2, AlertCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type TrashStatus = Tables<"trash_status">;
type PickupRecord = Tables<"pickup_records">;
type Profile = Tables<"profiles">;
type UserRole = Tables<"user_roles">;

type LatLng = { lat: number; lng: number };
type DriverInfo = { id: string; fullName: string | null; origin: LatLng | null };
type PendingPickup = TrashStatus & { profile: Pick<Profile, "full_name" | "address" | "latitude" | "longitude"> | null };
type OptimizedPickup = PendingPickup & {
  routeOrder: number;
  zoneKey: string;
  zoneRequestCount: number;
  location: LatLng | null;
};

const DEFAULT_KIGALI_CENTER: LatLng = { lat: -1.9441, lng: 30.0619 };

const toLatLng = (profile: Pick<Profile, "latitude" | "longitude"> | null | undefined): LatLng | null => {
  const latitude = profile?.latitude;
  const longitude = profile?.longitude;

  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return null;
  }

  return { lat: latitude, lng: longitude };
};

const haversineKm = (a: LatLng, b: LatLng): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * 6371 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const zoneFromPickup = (pickup: PendingPickup): string => {
  const location = toLatLng(pickup.profile);
  if (location) {
    return `${location.lat.toFixed(2)},${location.lng.toFixed(2)}`;
  }

  const address = pickup.profile?.address?.trim().toLowerCase() ?? "";
  if (!address) {
    return "unknown-zone";
  }

  return address.split(",")[0]?.trim() || "unknown-zone";
};

const sortPickupsStable = (pickups: PendingPickup[]) =>
  [...pickups].sort((a, b) => {
    const aMarked = a.marked_full_at ? new Date(a.marked_full_at).getTime() : Number.MAX_SAFE_INTEGER;
    const bMarked = b.marked_full_at ? new Date(b.marked_full_at).getTime() : Number.MAX_SAFE_INTEGER;
    if (aMarked !== bMarked) return aMarked - bMarked;
    return a.user_id.localeCompare(b.user_id);
  });

const assignPickupsToDrivers = (pickups: PendingPickup[], drivers: DriverInfo[]) => {
  const safeDrivers = drivers.length > 0 ? drivers : [{ id: "fallback-driver", fullName: "Driver", origin: null }];
  const assignments = new Map<string, PendingPickup[]>();
  const loadByDriver = new Map<string, number>();

  for (const driver of safeDrivers) {
    assignments.set(driver.id, []);
    loadByDriver.set(driver.id, 0);
  }

  const pickupLocations = pickups.map((pickup) => toLatLng(pickup.profile)).filter((point): point is LatLng => point !== null);
  const centroid =
    pickupLocations.length > 0
      ? {
          lat: pickupLocations.reduce((sum, point) => sum + point.lat, 0) / pickupLocations.length,
          lng: pickupLocations.reduce((sum, point) => sum + point.lng, 0) / pickupLocations.length,
        }
      : DEFAULT_KIGALI_CENTER;

  for (const pickup of sortPickupsStable(pickups)) {
    const pickupLocation = toLatLng(pickup.profile);
    let chosenDriver = safeDrivers[0];
    let bestScore = Number.POSITIVE_INFINITY;

    for (const driver of safeDrivers) {
      const basePoint = driver.origin ?? centroid;
      const travelDistance = pickupLocation ? haversineKm(basePoint, pickupLocation) : 0;
      const loadPenalty = (loadByDriver.get(driver.id) ?? 0) * 1.4;
      const score = travelDistance + loadPenalty;

      if (score < bestScore || (score === bestScore && driver.id < chosenDriver.id)) {
        bestScore = score;
        chosenDriver = driver;
      }
    }

    assignments.get(chosenDriver.id)?.push(pickup);
    loadByDriver.set(chosenDriver.id, (loadByDriver.get(chosenDriver.id) ?? 0) + 1);
  }

  return assignments;
};

const optimizeByNearestNeighbor = (pickups: PendingPickup[], origin: LatLng | null): PendingPickup[] => {
  const withLocation = pickups.filter((pickup) => toLatLng(pickup.profile) !== null);
  const withoutLocation = pickups.filter((pickup) => toLatLng(pickup.profile) === null);

  const ordered: PendingPickup[] = [];
  const remaining = [...withLocation];
  let currentPoint = origin;

  while (remaining.length > 0) {
    if (!currentPoint) {
      const next = remaining.shift();
      if (next) {
        ordered.push(next);
        currentPoint = toLatLng(next.profile);
      }
      continue;
    }

    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const point = toLatLng(remaining[index].profile);
      if (!point) continue;
      const distance = haversineKm(currentPoint, point);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }

    const next = remaining.splice(bestIndex, 1)[0];
    ordered.push(next);
    currentPoint = toLatLng(next.profile);
  }

  return [...ordered, ...sortPickupsStable(withoutLocation)];
};

const optimizeByOsrm = async (pickups: PendingPickup[], origin: LatLng | null) => {
  const withLocation = pickups.filter((pickup) => toLatLng(pickup.profile) !== null);
  const withoutLocation = pickups.filter((pickup) => toLatLng(pickup.profile) === null);

  if (!origin || withLocation.length < 2 || withLocation.length > 20) {
    return {
      ordered: optimizeByNearestNeighbor(pickups, origin),
      path: [] as LatLng[],
      usedOsrm: false,
    };
  }

  try {
    const coordinates = [origin, ...withLocation.map((pickup) => toLatLng(pickup.profile) as LatLng)]
      .map((point) => `${point.lng},${point.lat}`)
      .join(";");

    const response = await fetch(
      `https://router.project-osrm.org/trip/v1/driving/${coordinates}?source=first&roundtrip=false&overview=full&geometries=geojson`,
    );
    if (!response.ok) {
      throw new Error(`OSRM request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data?.waypoints || !Array.isArray(data.waypoints)) {
      throw new Error("OSRM response missing waypoints");
    }

    const orderedStops = data.waypoints
      .map((waypoint: { waypoint_index: number }, inputIndex: number) => ({ inputIndex, waypointIndex: waypoint.waypoint_index }))
      .filter((entry: { inputIndex: number }) => entry.inputIndex > 0)
      .sort((a: { waypointIndex: number }, b: { waypointIndex: number }) => a.waypointIndex - b.waypointIndex)
      .map((entry: { inputIndex: number }) => withLocation[entry.inputIndex - 1]);

    const geometryCoordinates = data?.trips?.[0]?.geometry?.coordinates;
    const path: LatLng[] = Array.isArray(geometryCoordinates)
      ? geometryCoordinates.map((pair: [number, number]) => ({ lng: pair[0], lat: pair[1] }))
      : [];

    return {
      ordered: [...orderedStops, ...sortPickupsStable(withoutLocation)],
      path,
      usedOsrm: path.length > 1,
    };
  } catch {
    return {
      ordered: optimizeByNearestNeighbor(pickups, origin),
      path: [] as LatLng[],
      usedOsrm: false,
    };
  }
};

const DriverDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingPickups, setPendingPickups] = useState<OptimizedPickup[]>([]);
  const [completedToday, setCompletedToday] = useState<PickupRecord[]>([]);
  const [routePath, setRoutePath] = useState<LatLng[]>([]);
  const [driverOrigin, setDriverOrigin] = useState<LatLng | null>(null);
  const [activeDrivers, setActiveDrivers] = useState(0);
  const [routeSource, setRouteSource] = useState<"osrm" | "heuristic">("heuristic");
  const [loading, setLoading] = useState(true);
  const [geocodingId, setGeocodingId] = useState<string | null>(null);
  const [geocodingInProgress, setGeocodingInProgress] = useState(false);

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);

    const today = new Date().toISOString().split("T")[0];
    const [pendingRes, completedRes, driverRolesRes] = await Promise.all([
      supabase.from("trash_status").select("*").eq("status", "full"),
      supabase.from("pickup_records").select("*").eq("driver_id", user.id).gte("picked_up_at", today),
      supabase.from("user_roles").select("user_id").eq("role", "driver"),
    ]);

    const pending = pendingRes.data ?? [];
    const driverRoleRows = (driverRolesRes.data ?? []) as Pick<UserRole, "user_id">[];
    const driverIds = Array.from(new Set([...driverRoleRows.map((row) => row.user_id), user.id]));
    const profileIds = Array.from(new Set([...pending.map((item) => item.user_id), ...driverIds]));

    const profilesByUserId = new Map<string, Pick<Profile, "user_id" | "full_name" | "address" | "latitude" | "longitude">>();
    if (profileIds.length > 0) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("user_id, full_name, address, latitude, longitude")
        .in("user_id", profileIds);

      for (const profile of profileRows ?? []) {
        profilesByUserId.set(profile.user_id, profile);
      }
    }

    const allDrivers: DriverInfo[] = driverIds.map((driverId) => {
      const profile = profilesByUserId.get(driverId);
      return {
        id: driverId,
        fullName: profile?.full_name ?? null,
        origin: toLatLng(profile),
      };
    });

    const enrichedPending: PendingPickup[] = pending.map((item) => ({
      ...item,
      profile: profilesByUserId.get(item.user_id) ?? null,
    }));

    const assignments = assignPickupsToDrivers(enrichedPending, allDrivers);
    const myAssignedPickups = assignments.get(user.id) ?? [];
    const myDriverInfo = allDrivers.find((driver) => driver.id === user.id) ?? { id: user.id, fullName: null, origin: null };
    const myOrigin = myDriverInfo.origin ?? null;

    const optimized = await optimizeByOsrm(myAssignedPickups, myOrigin);
    const zoneCounts = new Map<string, number>();
    for (const pickup of optimized.ordered) {
      const zoneKey = zoneFromPickup(pickup);
      zoneCounts.set(zoneKey, (zoneCounts.get(zoneKey) ?? 0) + 1);
    }

    const optimizedPickups: OptimizedPickup[] = optimized.ordered.map((pickup, index) => {
      const zoneKey = zoneFromPickup(pickup);
      return {
        ...pickup,
        routeOrder: index + 1,
        zoneKey,
        zoneRequestCount: zoneCounts.get(zoneKey) ?? 1,
        location: toLatLng(pickup.profile),
      };
    });

    setPendingPickups(optimizedPickups);
    setRoutePath(optimized.path);
    setDriverOrigin(myOrigin);
    setRouteSource(optimized.usedOsrm ? "osrm" : "heuristic");
    setCompletedToday(completedRes.data ?? []);
    setActiveDrivers(allDrivers.length);
    setLoading(false);
  };

  useEffect(() => {
    void fetchData();
  }, [user]);

  const markPickedUp = async (trashStatusItem: OptimizedPickup) => {
    if (!user) return;

    const { error: updateError } = await supabase
      .from("trash_status")
      .update({
        status: "picked_up",
        picked_up_at: new Date().toISOString(),
        picked_up_by: user.id,
      })
      .eq("id", trashStatusItem.id);

    if (updateError) {
      toast({ title: "Error", description: updateError.message, variant: "destructive" });
      return;
    }

    const { error: insertError } = await supabase.from("pickup_records").insert({
      household_id: trashStatusItem.user_id,
      driver_id: user.id,
      trash_status_id: trashStatusItem.id,
    });

    if (insertError) {
      toast({ title: "Error", description: insertError.message, variant: "destructive" });
      return;
    }

    toast({ title: "Pickup confirmed", description: "500 RWF service fee logged." });
    void fetchData();
  };

  const autoGeocodeAddress = async (pickup: OptimizedPickup) => {
    if (!pickup.profile?.address) {
      toast({
        title: "No address",
        description: "This household hasn't set an address yet.",
        variant: "destructive",
      });
      return;
    }

    setGeocodingId(pickup.id);
    setGeocodingInProgress(true);

    try {
      const result = await geocodeAddress(pickup.profile.address, "Rwanda");

      if (!result) {
        throw new Error("Could not find location for this address");
      }

      // Update the profile with the geocoded coordinates
      const { error } = await supabase
        .from("profiles")
        .update({
          latitude: result.lat,
          longitude: result.lng,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", pickup.user_id);

      if (error) {
        throw error;
      }

      toast({
        title: "Location found",
        description: `${pickup.profile.full_name}'s address has been geocoded and will appear on the map.`,
      });

      // Refresh the data to show the updated location
      await fetchData();
    } catch (error) {
      console.error("Geocoding error:", error);
      toast({
        title: "Geocoding failed",
        description: error instanceof Error ? error.message : "Could not find location for this address",
        variant: "destructive",
      });
    } finally {
      setGeocodingId(null);
      setGeocodingInProgress(false);
    }
  };

  const openNavigation = (pickup?: OptimizedPickup) => {
    // If viewing full route with all pickups
    if (!pickup && pendingPickups.length > 1) {
      const coordinates: LatLng[] = [];
      
      // Add driver origin first
      if (driverOrigin) {
        coordinates.push(driverOrigin);
      }
      
      // Add all pending pickups in optimized order
      for (const p of pendingPickups) {
        if (p.location) {
          coordinates.push(p.location);
        }
      }
      
      if (coordinates.length >= 2) {
        // Build OSRM route URL with all coordinates
        const routeCoords = coordinates.map(c => `${c.lng},${c.lat}`).join(";");
        window.open(
          `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(routeCoords)}`,
          "_blank",
          "noopener,noreferrer",
        );
        return;
      }
    }
    
    // Single pickup navigation (fallback or specific pickup)
    const targetPickup = pickup || (pendingPickups.length === 1 ? pendingPickups[0] : null);
    if (targetPickup) {
      const location = targetPickup.location;
      if (location && driverOrigin) {
        const routeParam = encodeURIComponent(`${driverOrigin.lat},${driverOrigin.lng};${location.lat},${location.lng}`);
        window.open(
          `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${routeParam}`,
          "_blank",
          "noopener,noreferrer",
        );
        return;
      }

      if (location) {
        window.open(
          `https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=16/${location.lat}/${location.lng}`,
          "_blank",
          "noopener,noreferrer",
        );
        return;
      }

      const address = targetPickup.profile?.address?.trim();
      if (!address) {
        toast({ title: "Address missing", description: "This pickup has no route destination yet.", variant: "destructive" });
        return;
      }

      window.open(`https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`, "_blank", "noopener,noreferrer");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Clock className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const mapStops: DriverRouteStop[] = pendingPickups.map((pickup) => ({
    id: pickup.id,
    routeOrder: pickup.routeOrder,
    location: pickup.location,
    fullName: pickup.profile?.full_name ?? null,
    address: pickup.profile?.address ?? null,
  }));

  return (
    <div>
      <DashboardHeader title="Driver Dashboard" />
      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold font-display text-primary">{pendingPickups.length}</p>
              <p className="text-sm text-muted-foreground">Assigned Pickups</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold font-display text-primary">{completedToday.length}</p>
              <p className="text-sm text-muted-foreground">Completed Today</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold font-display text-primary">{activeDrivers}</p>
              <p className="text-sm text-muted-foreground">Active Drivers</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Route className="h-5 w-5 text-primary" /> Optimized Route Map
            </CardTitle>
            <CardDescription>
              Route assignment is balanced across drivers and optimized for travel distance. Source: {routeSource === "osrm" ? "OpenStreetMap OSRM" : "built-in fallback"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <DriverRouteMap origin={driverOrigin} stops={mapStops} routePath={routePath} />
            
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => openNavigation()}
            >
              <Navigation className="h-4 w-4 mr-2" /> Start Navigation (All Pickups)
            </Button>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-900 mb-2">Map Legend:</p>
              <div className="space-y-1 text-xs text-blue-800">
                <div className="flex items-center gap-2">
                  <div style={{background:"#0ea5e9",width:"16px",height:"16px",borderRadius:"50%",border:"1px solid white"}}></div>
                  <span>Your location</span>
                </div>
                <div className="flex items-center gap-2">
                  <div style={{background:"#16a34a",width:"16px",height:"16px",borderRadius:"50%",border:"1px solid white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",color:"white",fontWeight:"bold"}}>1</div>
                  <span>Pickup with GPS location</span>
                </div>
                <div className="flex items-center gap-2">
                  <div style={{background:"#d1d5db",width:"16px",height:"16px",borderRadius:"50%",border:"1px solid white",opacity:"0.6",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",fontWeight:"bold"}}>1</div>
                  <span>Pickup pending location (use Find Location)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" /> My Assigned Stops
            </CardTitle>
            <CardDescription>Stops are auto-assigned and ordered so all pickup requests are covered across drivers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingPickups.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-primary mx-auto mb-2" />
                <p className="text-muted-foreground">All caught up. No assigned pickups right now.</p>
              </div>
            ) : (
              pendingPickups.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="rounded-full bg-warning/10 p-2 flex-shrink-0">
                      <Navigation className="h-4 w-4 text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="outline" className="font-semibold">Stop {item.routeOrder}</Badge>
                        <Badge variant={item.zoneRequestCount > 1 ? "default" : "secondary"}>
                          {item.zoneRequestCount} request{item.zoneRequestCount > 1 ? "s" : ""}
                        </Badge>
                        {!item.location && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> No GPS
                          </Badge>
                        )}
                      </div>
                      <p className="font-semibold text-base mb-1">{item.profile?.full_name || "Unknown Customer"}</p>
                      
                      {item.profile?.address ? (
                        <div className="flex items-start gap-1 mb-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-muted-foreground break-words">{item.profile.address}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-destructive/80 mb-2 font-medium">No address provided</p>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        Marked full: {item.marked_full_at ? new Date(item.marked_full_at).toLocaleString() : "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-2 flex-shrink-0">
                    {!item.location && item.profile?.address && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => autoGeocodeAddress(item)}
                        disabled={geocodingInProgress && geocodingId === item.id}
                        className="text-xs"
                      >
                        {geocodingInProgress && geocodingId === item.id ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Locating...
                          </>
                        ) : (
                          <>
                            <MapPin className="h-3 w-3 mr-1" />
                            Find Location
                          </>
                        )}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => openNavigation(item)}>
                      Navigate
                    </Button>
                    <Button size="sm" onClick={() => markPickedUp(item)}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Done
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DriverDashboard;
