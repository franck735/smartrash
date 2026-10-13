import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardHeader from "./DashboardHeader";
import AddressSetup from "@/components/AddressSetup";
import SubscriptionPayment from "@/components/SubscriptionPayment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, CheckCircle, Clock, CreditCard, AlertCircle, X, MapPin, Loader2, Copy, CheckCircle2, Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Tables } from "@/integrations/supabase/types";

type TrashStatus = Tables<"trash_status">;
type UserSubscription = Tables<"user_subscriptions">;
type SubscriptionPlan = Tables<"subscription_plans">;
type PickupRecord = Tables<"pickup_records">;
type Profile = Tables<"profiles">;

const HouseholdDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [trashStatus, setTrashStatus] = useState<TrashStatus | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [pickupHistory, setPickupHistory] = useState<PickupRecord[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [momoCode, setMomoCode] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [hasValidSubscription, setHasValidSubscription] = useState(false);
  const [isRequestingPickup, setIsRequestingPickup] = useState(false);
  
  // Payment dialog state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<SubscriptionPlan | null>(null);
  const [tempSubscription, setTempSubscription] = useState<UserSubscription | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchData = async () => {
    if (!user) return;

    const [trashRes, subRes, plansRes, historyRes, settingsRes, profileRes] = await Promise.all([
      supabase
        .from("trash_status")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("user_subscriptions")
        .select("*, subscription_plans(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("subscription_plans").select("*").eq("is_active", true),
      supabase
        .from("pickup_records")
        .select("*")
        .eq("household_id", user.id)
        .order("picked_up_at", { ascending: false })
        .limit(10),
      supabase.from("company_settings").select("momo_merchant_code").limit(1).maybeSingle(),
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    ]);

    setTrashStatus(trashRes.data);
    setSubscription(subRes.data);
    setPlan((subRes.data as (UserSubscription & { subscription_plans: SubscriptionPlan | null }) | null)?.subscription_plans ?? null);
    setPlans(plansRes.data ?? []);
    setPickupHistory(historyRes.data ?? []);
    setProfile(profileRes.data ?? null);
    setMomoCode(settingsRes.data?.momo_merchant_code ?? "");

    // Check if user has a valid (active and paid) subscription
    const subData = subRes.data as (UserSubscription & { subscription_plans: SubscriptionPlan | null }) | null;
    const isActive = subData?.end_date && new Date(subData.end_date) > new Date();
    const isPaid = subData?.is_paid === true;
    setHasValidSubscription(!!(isActive && isPaid));

    setLoading(false);
  };

  useEffect(() => {
    void fetchData();
  }, [user]);

  // Get current GPS location
  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const markTrashFull = async () => {
    if (!user || !trashStatus) return;
    
    // Check for valid subscription before allowing pickup request
    if (!hasValidSubscription) {
      toast({ 
        title: "Subscription Required", 
        description: "Please subscribe and pay for a plan to make pickup requests.", 
        variant: "destructive" 
      });
      return;
    }

    setIsRequestingPickup(true);
    
    try {
      // Try to get GPS location
      const location = await getCurrentLocation();
      
      // Update profile with location if available
      if (location) {
        await supabase.from("profiles").update({
          latitude: location.latitude,
          longitude: location.longitude,
          updated_at: new Date().toISOString(),
        }).eq("user_id", user.id);
      }

      // Mark trash as full
      const { error } = await supabase
        .from("trash_status")
        .update({ status: "full", marked_full_at: new Date().toISOString() })
        .eq("id", trashStatus.id);
        
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Trash marked as full", description: "A driver will pick it up soon." });
        void fetchData();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to request pickup", variant: "destructive" });
    } finally {
      setIsRequestingPickup(false);
    }
  };

  const cancelPickupRequest = async () => {
    if (!trashStatus) return;

    const { error } = await supabase
      .from("trash_status")
      .update({ status: "ready", marked_full_at: null, updated_at: new Date().toISOString() })
      .eq("id", trashStatus.id);
    
    if (error) {
      toast({ title: "Error", description: "Failed to cancel pickup request", variant: "destructive" });
    } else {
      toast({ title: "Pickup request cancelled", description: "Your trash bin is now ready." });
      void fetchData();
    }
  };

  const subscribeToPlan = async (planId: string) => {
    if (!user) return;
    
    const selectedPlan = plans.find(p => p.id === planId);
    if (!selectedPlan) {
      toast({ title: "Error", description: "Plan not found", variant: "destructive" });
      return;
    }

    // Set the selected plan and open dialog
    setSelectedPlanForPayment(selectedPlan);
    setIsSubscribing(true);

    // Calculate subscription dates (default to 30 days)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    try {
      const { data, error } = await supabase.from("user_subscriptions").insert({
        user_id: user.id,
        plan_id: planId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        is_paid: false, // Will be marked paid after MoMo payment
      }).select().single();
      
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setIsSubscribing(false);
        return;
      }

      // Set temp subscription and open payment dialog
      setTempSubscription(data);
      setShowPaymentDialog(true);
      setIsSubscribing(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setIsSubscribing(false);
    }
  };

  const handlePaymentConfirmed = () => {
    setShowPaymentDialog(false);
    setTempSubscription(null);
    setSelectedPlanForPayment(null);
    void fetchData();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Clock className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isFull = trashStatus?.status === "full";

  return (
    <div>
      <DashboardHeader title="Customer Dashboard" />
      <main className="max-w-2xl mx-auto p-4 space-y-6">
        <Card className="overflow-hidden">
          <div className={`p-6 text-center ${isFull ? "bg-warning/10" : "bg-primary/5"}`}>
            <div className={`mx-auto rounded-full p-6 w-fit mb-4 ${isFull ? "bg-warning/20" : "bg-primary/10 animate-pulse-green"}`}>
              <Trash2 className={`h-12 w-12 ${isFull ? "text-warning" : "text-primary"}`} />
            </div>
            <h2 className="text-xl font-bold font-display mb-2">{isFull ? "Trash is Full - Pickup Pending" : "Trash Bin Ready"}</h2>
            <p className="text-muted-foreground text-sm mb-4">
              {isFull 
                ? "A driver will come pick it up soon." 
                : hasValidSubscription 
                  ? "Tap below when your trash bin is full." 
                  : "Subscribe to make pickup requests."}
            </p>
            {!isFull && hasValidSubscription && (
              <Button size="lg" className="text-lg px-8 py-6" onClick={markTrashFull} disabled={isRequestingPickup}>
                {isRequestingPickup ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Requesting...
                  </>
                ) : (
                  "My Trash is Full"
                )}
              </Button>
            )}
            {!isFull && !hasValidSubscription && (
              <Button size="lg" className="text-lg px-8 py-6" disabled variant="secondary">
                Subscribe to Request Pickup
              </Button>
            )}
            {isFull && (
              <div className="space-y-2">
                <Badge variant="outline" className="text-warning border-warning text-base px-4 py-1">
                  <AlertCircle className="h-4 w-4 mr-1" /> Awaiting Pickup
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={cancelPickupRequest}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4 mr-1" /> Cancel Request
                </Button>
              </div>
            )}
          </div>
        </Card>

        <AddressSetup
          currentAddress={profile?.address ?? null}
          currentLat={profile?.latitude ?? null}
          currentLng={profile?.longitude ?? null}
          onAddressUpdated={fetchData}
        />

        {subscription && plan && (
          <SubscriptionPayment
            subscription={subscription}
            plan={plan}
            momoCode={momoCode}
            onPaymentConfirmed={fetchData}
          />
        )}

        {!subscription && (
          <>
            {/* Payment Dialog */}
            <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl">Complete Your Payment</DialogTitle>
                  <DialogDescription>
                    Securely pay using Mobile Money
                  </DialogDescription>
                </DialogHeader>

                {selectedPlanForPayment && (
                  <div className="space-y-6">
                    {/* Plan Details */}
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <p className="text-sm text-muted-foreground mb-1">Plan Details</p>
                      <h3 className="text-xl font-bold mb-1">{selectedPlanForPayment.name}</h3>
                      <p className="text-2xl font-bold text-primary mb-2">
                        {selectedPlanForPayment.price_rwf.toLocaleString()} RWF
                      </p>
                      <p className="text-sm text-muted-foreground">
                        🗑️ {selectedPlanForPayment.frequency} service
                      </p>
                    </div>

                    {/* MoMo Payment Instructions */}
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm font-semibold text-blue-900 mb-3">How to Pay with Mobile Money</p>
                        <ol className="text-sm text-blue-900 space-y-2 list-decimal ml-4">
                          <li>Open your Mobile Money app</li>
                          <li>Select "Send Money" or "Pay Bill"</li>
                          <li>Enter the code below: <span className="font-bold">{momoCode}</span></li>
                          <li>Send the exact amount: <span className="font-bold">{selectedPlanForPayment.price_rwf.toLocaleString()} RWF</span></li>
                          <li>Click "I've Paid" below to confirm</li>
                        </ol>
                      </div>

                      {/* MoMo Code Display */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">MoMo Merchant Code</p>
                        <div className="flex gap-2">
                          <div className="flex-1 p-3 bg-gray-100 rounded border border-gray-300 font-mono text-sm break-all">
                            {momoCode || "No code set"}
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => copyToClipboard(momoCode)}
                            className="flex-shrink-0"
                          >
                            {copiedCode ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Confirm Payment Button */}
                    <div className="space-y-2 pt-2">
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={() => {
                          if (!momoCode) {
                            toast({ 
                              title: "Error", 
                              description: "MoMo code not configured yet", 
                              variant: "destructive" 
                            });
                            return;
                          }
                          
                          // Open phone dialer with MoMo code
                          window.location.href = `tel:${momoCode}`;
                          
                          // Show user instructions after opening dialer
                          setTimeout(() => {
                            toast({ 
                              title: "Dialer opened", 
                              description: "Complete the payment in your mobile money app, then close the dialer to return here and click 'Confirm Payment'." 
                            });
                          }, 500);
                        }}
                      >
                        <Phone className="h-4 w-4 mr-2" /> Open Dialer & Pay
                      </Button>
                      
                      {tempSubscription && (
                        <Button
                          className="w-full"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            toast({ 
                              title: "Payment submitted!", 
                              description: "Your payment has been confirmed. Please wait for the admin to verify and activate your subscription." 
                            });
                            handlePaymentConfirmed();
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" /> Confirm Payment Sent
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          if (tempSubscription) {
                            // Delete the subscription if user cancels
                            supabase.from("user_subscriptions").delete().eq("id", tempSubscription.id).then(() => {
                              handlePaymentConfirmed();
                            });
                          }
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Plan Selection Cards */}
            <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> Choose a Subscription Plan
            </CardTitle>
            <CardDescription>
              Select a plan to start making trash pickup requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {plans.length > 0 ? (
              <div className="space-y-3">
                {plans.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-lg border-2 border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-lg">{p.name}</p>
                        {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{p.price_rwf.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">RWF</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      🗑️ {p.frequency} pickup service
                    </p>
                    <Button className="w-full" onClick={() => subscribeToPlan(p.id)} disabled={isSubscribing}>
                      {isSubscribing ? "Loading..." : "Pay Now"}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No plans available yet. Check back soon.
              </p>
            )}
          </CardContent>
        </Card>
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" /> Pickup History
            </CardTitle>
            <CardDescription>Your recent trash pickups</CardDescription>
          </CardHeader>
          <CardContent>
            {pickupHistory.length > 0 ? (
              <div className="space-y-2">
                {pickupHistory.map((p) => (
                  <div key={p.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                    <span className="text-sm">{new Date(p.picked_up_at).toLocaleDateString()}</span>
                    <Badge variant="secondary">Completed</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No pickups yet.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default HouseholdDashboard;
