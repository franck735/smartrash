import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Copy, Loader2, Phone } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type UserSubscription = Tables<"user_subscriptions">;
type SubscriptionPlan = Tables<"subscription_plans">;

interface SubscriptionPaymentProps {
  subscription: UserSubscription | null;
  plan: SubscriptionPlan | null;
  momoCode: string;
  onPaymentConfirmed?: () => void;
}

const SubscriptionPayment = ({
  subscription,
  plan,
  momoCode,
  onPaymentConfirmed,
}: SubscriptionPaymentProps) => {
  const { toast } = useToast();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  if (!subscription || !plan) {
    return null;
  }

  const isPaid = subscription.is_paid;
  const isExpired = new Date(subscription.end_date) < new Date();
  const daysUntilExpiry = Math.ceil(
    (new Date(subscription.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
  );

  const confirmPayment = async () => {
    setIsConfirming(true);
    try {
      toast({
        title: "Payment Submitted!",
        description: "Your payment confirmation has been received. The admin will verify and approve your subscription shortly.",
      });

      onPaymentConfirmed?.();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Could not confirm payment",
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const cancelSubscription = async () => {
    if (!window.confirm("Are you sure you want to cancel this subscription?")) {
      return;
    }

    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from("user_subscriptions")
        .delete()
        .eq("id", subscription.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled.",
      });

      onPaymentConfirmed?.();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Could not cancel subscription",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "MoMo code copied to clipboard",
    });
  };

  return (
    <Card className={isPaid ? "border-green-200 bg-green-50/30" : "border-orange-200 bg-orange-50/30"}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {isPaid ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Subscription Active
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Payment Pending
              </>
            )}
          </CardTitle>
          <Badge variant={isPaid ? "default" : "destructive"}>
            {isPaid ? "Active" : "Unpaid"}
          </Badge>
        </div>
        <CardDescription>
          {plan.name} - {plan.price_rwf.toLocaleString()} RWF/month
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subscription Details */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-white/50 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Frequency</p>
            <p className="font-semibold">{plan.frequency}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Valid Until</p>
            <p className="font-semibold">{new Date(subscription.end_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Days Left</p>
            <p className={`font-semibold ${daysUntilExpiry < 7 ? "text-warning" : ""}`}>
              {isExpired ? "Expired" : `${daysUntilExpiry} days`}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Status</p>
            <p className={`font-semibold ${isPaid ? "text-green-600" : "text-orange-600"}`}>
              {isPaid ? "Paid ✓" : "Unpaid"}
            </p>
          </div>
        </div>

        {!isPaid && momoCode && (
          <div className="space-y-3 p-4 rounded-lg border-2 border-orange-300 bg-orange-50">
            <div>
              <p className="text-sm font-semibold text-orange-900 mb-2">
                📱 Complete Payment via Mobile Money (MoMo)
              </p>
              <p className="text-xs text-orange-800 mb-3">
                Send {plan.price_rwf.toLocaleString()} RWF to the company MoMo account below:
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg border-2 border-orange-400">
              <div className="space-y-2 text-center">
                <p className="text-xs text-muted-foreground font-medium">SEND PAYMENT TO:</p>
                <p className="text-2xl font-bold text-orange-600 font-display tracking-wider">
                  {momoCode}
                </p>
                <p className="text-xs text-muted-foreground">
                  Amount: {plan.price_rwf.toLocaleString()} RWF
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-3 text-xs"
                onClick={() => copyToClipboard(momoCode)}
              >
                <Copy className="h-3 w-3 mr-1" /> Copy Code
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <p className="text-xs font-semibold text-blue-900 mb-2 flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> Payment Steps:
              </p>
              <ol className="text-xs text-blue-800 space-y-1">
                <li>1. Open your Mobile Money app (MTN, Airtel, etc.)</li>
                <li>2. Select "Send Money"</li>
                <li>3. Enter the MoMo code above: <strong>{momoCode}</strong></li>
                <li>4. Enter amount: <strong>{plan.price_rwf.toLocaleString()} RWF</strong></li>
                <li>5. Confirm and complete the transaction</li>
              </ol>
            </div>

            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={confirmPayment}
              disabled={isConfirming}
            >
              {isConfirming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  I've Completed Payment
                </>
              )}
            </Button>
          </div>
        )}

        {isPaid && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Payment Confirmed</p>
                <p className="text-xs">You can now make unlimited pickup requests</p>
              </div>
            </div>
          </div>
        )}

        {isExpired && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-semibold text-red-700">Subscription Expired</p>
            <p className="text-xs text-red-600">Subscribe to a new plan to make pickup requests</p>
          </div>
        )}

        {(isPaid || momoCode) && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground hover:text-destructive"
            onClick={cancelSubscription}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Cancelling...
              </>
            ) : (
              "Cancel Subscription"
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionPayment;
