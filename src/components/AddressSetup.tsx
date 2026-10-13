import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { geocodeAddress } from "@/lib/geocoding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface AddressSetupProps {
  currentAddress: string | null;
  currentLat: number | null;
  currentLng: number | null;
  onAddressUpdated?: () => void;
}

const AddressSetupComponent = ({
  currentAddress,
  currentLat,
  currentLng,
  onAddressUpdated,
}: AddressSetupProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [address, setAddress] = useState(currentAddress || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [geocodeResult, setGeocodeResult] = useState<{
    lat: number;
    lng: number;
    display_name: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGeocodeAddress = async () => {
    if (!address.trim()) {
      setError("Please enter an address");
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeocodeResult(null);

    try {
      const result = await geocodeAddress(address, "Rwanda");

      if (result) {
        setGeocodeResult({
          lat: result.lat,
          lng: result.lng,
          display_name: result.display_name,
        });
      } else {
        setError("Address not found. Please check and try again.");
      }
    } catch (err) {
      setError("Failed to geocode address. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!user || !geocodeResult) {
      setError("Missing address or coordinates");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          address: address.trim(),
          latitude: geocodeResult.lat,
          longitude: geocodeResult.lng,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Success",
        description: "Your address has been saved and location marked on the map.",
      });

      setIsOpen(false);
      setAddress("");
      setGeocodeResult(null);
      onAddressUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save address");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const hasCoordinates = currentLat !== null && currentLng !== null;

  return (
    <Card className={`${!hasCoordinates ? "border-warning/50 bg-warning/5" : ""}`}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Delivery Location
        </CardTitle>
        <CardDescription>
          Set your exact address so drivers can find and navigate to your location
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasCoordinates ? (
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{currentAddress}</p>
              <p className="text-xs text-muted-foreground">
                {currentLat?.toFixed(4)}, {currentLng?.toFixed(4)}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-3 bg-warning/10 rounded-lg border border-warning/30">
            <AlertCircle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">No location set</p>
              <p className="text-xs text-muted-foreground">
                Drivers won't be able to see your exact location
              </p>
            </div>
          </div>
        )}

        {!isOpen ? (
          <Button variant="outline" className="w-full" onClick={() => setIsOpen(true)}>
            {hasCoordinates ? "Update Address" : "Set Address"}
          </Button>
        ) : (
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            <Input
              placeholder="Enter your full address (e.g., KG 1 St, Kigali)"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setError(null);
              }}
              disabled={isLoading || isSaving}
            />

            <Button
              className="w-full"
              onClick={handleGeocodeAddress}
              disabled={!address.trim() || isLoading || isSaving}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying Address...
                </>
              ) : (
                "Verify & Find Location"
              )}
            </Button>

            {error && (
              <div className="flex items-start gap-2 p-2 bg-destructive/10 text-destructive text-sm rounded">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {geocodeResult && (
              <div className="space-y-2">
                <div className="p-2 bg-green-50 rounded border border-green-200">
                  <p className="text-xs font-medium text-green-900 mb-1">Location Found:</p>
                  <p className="text-xs text-green-800">{geocodeResult.display_name}</p>
                  <p className="text-xs text-green-700 mt-1">
                    {geocodeResult.lat.toFixed(4)}, {geocodeResult.lng.toFixed(4)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setIsOpen(false);
                      setAddress("");
                      setGeocodeResult(null);
                      setError(null);
                    }}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleSaveAddress}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Location"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {!geocodeResult && !error && (
              <p className="text-xs text-muted-foreground">
                Enter your address and click "Verify & Find Location" to mark your spot on the driver's map
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AddressSetupComponent;
