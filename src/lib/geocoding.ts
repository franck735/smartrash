/**
 * Geocoding utility for converting addresses to coordinates and vice versa
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 */

export interface GeocodeResult {
  lat: number;
  lng: number;
  address: string;
  display_name: string;
}

export interface ReverseGeocodeResult {
  address: string;
  display_name: string;
  lat: number;
  lng: number;
}

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const DEFAULT_TIMEOUT = 5000;

/**
 * Converts an address string to latitude/longitude coordinates
 * @param address - The address to geocode
 * @param countryBias - Optional country to bias search (e.g., "Rwanda")
 * @returns GeocodeResult with coordinates and address info
 */
export const geocodeAddress = async (address: string, countryBias?: string): Promise<GeocodeResult | null> => {
  if (!address || address.trim().length === 0) {
    return null;
  }

  try {
    const searchUrl = new URL(`${NOMINATIM_BASE}/search`);
    searchUrl.searchParams.set("q", address);
    searchUrl.searchParams.set("format", "json");
    searchUrl.searchParams.set("limit", "1");

    if (countryBias) {
      searchUrl.searchParams.set("countrycodes", countryBias.toLowerCase());
    }

    // Add timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    const response = await fetch(searchUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "ImyandaSmart-Driver-App/1.0",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const result = data[0];

    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      address: result.address || "",
      display_name: result.display_name || "",
    };
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
};

/**
 * Converts latitude/longitude coordinates to an address
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns ReverseGeocodeResult with address info
 */
export const reverseGeocode = async (lat: number, lng: number): Promise<ReverseGeocodeResult | null> => {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return null;
  }

  try {
    const searchUrl = new URL(`${NOMINATIM_BASE}/reverse`);
    searchUrl.searchParams.set("lat", lat.toString());
    searchUrl.searchParams.set("lon", lng.toString());
    searchUrl.searchParams.set("format", "json");
    searchUrl.searchParams.set("zoom", "18");

    // Add timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    const response = await fetch(searchUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "ImyandaSmart-Driver-App/1.0",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Reverse geocoding API error: ${response.status}`);
    }

    const result = await response.json();

    return {
      address: result.address?.road || "",
      display_name: result.display_name || "",
      lat,
      lng,
    };
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
};

/**
 * Geocodes an address and extracts key components
 * @param address - The address to geocode
 * @returns Object with coordinates and key address parts
 */
export const geocodeAddressFull = async (address: string) => {
  const result = await geocodeAddress(address, "Rwanda");

  if (!result) {
    return null;
  }

  // Parse display_name to extract key components
  const parts = result.display_name.split(",").map((p) => p.trim());
  const street = parts[0] || "";
  const suburb = parts[1] || "";
  const city = parts.slice(2).join(", ") || "";

  return {
    latitude: result.lat,
    longitude: result.lng,
    address: result.address,
    display_name: result.display_name,
    street,
    suburb,
    city,
  };
};
