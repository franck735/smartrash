import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardHeader from "./DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Users, TrendingUp, Trash2, Settings, Plus, DollarSign, Clock, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Tables } from "@/integrations/supabase/types";

type AppRole = Tables<"user_roles">["role"];
type UserSubscription = Tables<"user_subscriptions">;
type SubscriptionPlan = Pick<Tables<"subscription_plans">, "name" | "price_rwf">;
type ProfileSummary = Pick<Tables<"profiles">, "user_id" | "full_name" | "address">;
type PickupRecord = Tables<"pickup_records">;
type PlanRow = Tables<"subscription_plans">;
type CompanySettingsRow = Tables<"company_settings">;
type RoleUser = Pick<Tables<"profiles">, "user_id" | "full_name" | "address"> & { role: AppRole | null };

interface HouseholdSubscription extends UserSubscription {
  subscription_plans: SubscriptionPlan | null;
}

interface HouseholdView extends UserSubscription {
  plan: SubscriptionPlan | null;
  profile: ProfileSummary | null;
}

interface AdminDashboardProps {
  isOwner?: boolean;
}

const roleOrder: AppRole[] = ["super_admin", "owner", "admin", "driver", "customer", "household"];

const roleOptionLabels: Record<AppRole, string> = {
  super_admin: "Super Admin",
  owner: "Owner",
  admin: "Sub Admin",
  driver: "Driver",
  customer: "Customer",
  household: "Household (legacy)",
};

const resolveRole = (roles: AppRole[]): AppRole | null => {
  for (const role of roleOrder) {
    if (roles.includes(role)) {
      return role;
    }
  }

  return roles[0] ?? null;
};

const getAssignableRoles = (currentRole: AppRole | null, isSelf: boolean): AppRole[] => {
  if (currentRole === "admin") {
    return isSelf ? ["admin"] : ["admin", "driver", "customer", "household"];
  }

  if (currentRole === "owner") {
    return isSelf ? ["owner"] : ["owner", "admin", "driver", "customer", "household"];
  }

  return ["super_admin", "owner", "admin", "driver", "customer", "household"];
};

const isMissingRoleRpcError = (message: string) =>
  message.includes("assign_user_role") ||
  message.includes("PGRST202") ||
  message.includes("Could not find the function");

const AdminDashboard = ({ isOwner = false }: AdminDashboardProps) => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState({ subscribers: 0, pendingPickups: 0, totalPickups: 0, totalFees: 0 });
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [households, setHouseholds] = useState<HouseholdView[]>([]);
  const [pickupRecords, setPickupRecords] = useState<PickupRecord[]>([]);
  const [momoCode, setMomoCode] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [settingsId, setSettingsId] = useState("");
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<RoleUser[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, AppRole>>({});

  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanFreq, setNewPlanFreq] = useState("weekly");
  const [newPlanPrice, setNewPlanPrice] = useState("");
  const [newPlanDesc, setNewPlanDesc] = useState("");
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerRole, setRegisterRole] = useState<AppRole>("driver");
  const [registering, setRegistering] = useState(false);

  const canManageTeam = role === "admin" || role === "owner" || role === "super_admin";

  const fetchRoleManagementData = async () => {
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, address").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    const profiles = profilesRes.data ?? [];
    const roleRows = rolesRes.data ?? [];
    const roleMap = new Map<string, AppRole[]>();

    for (const roleRow of roleRows) {
      const existing = roleMap.get(roleRow.user_id) ?? [];
      existing.push(roleRow.role);
      roleMap.set(roleRow.user_id, existing);
    }

    const roleUsers: RoleUser[] = profiles.map((profile) => ({
      user_id: profile.user_id,
      full_name: profile.full_name,
      address: profile.address,
      role: resolveRole(roleMap.get(profile.user_id) ?? []),
    }));

    setUsers(roleUsers);
    setSelectedRoles(
      roleUsers.reduce<Record<string, AppRole>>((acc, profile) => {
        if (profile.role) {
          acc[profile.user_id] = profile.role;
        } else {
          acc[profile.user_id] = "customer";
        }
        return acc;
      }, {}),
    );
  };

  const fetchData = async () => {
    const [subsCountRes, pendingRes, pickupsRes, plansRes, settingsRes, subscriptionsRes] = await Promise.all([
      supabase.from("user_subscriptions").select("*", { count: "exact", head: true }),
      supabase.from("trash_status").select("*", { count: "exact", head: true }).eq("status", "full"),
      supabase.from("pickup_records").select("*").order("picked_up_at", { ascending: false }).limit(50),
      supabase.from("subscription_plans").select("*").order("created_at", { ascending: false }),
      supabase.from("company_settings").select("*").limit(1).maybeSingle(),
      supabase
        .from("user_subscriptions")
        .select("id, user_id, plan_id, is_paid, start_date, end_date, created_at, subscription_plans(name, price_rwf)")
        .order("created_at", { ascending: false }),
    ]);

    const subscriptionRows = (subscriptionsRes.data ?? []) as HouseholdSubscription[];
    const subscriberIds = [...new Set(subscriptionRows.map((row) => row.user_id))];
    const profilesByUserId = new Map<string, ProfileSummary>();

    if (subscriberIds.length > 0) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("user_id, full_name, address")
        .in("user_id", subscriberIds);

      for (const profile of profileRows ?? []) {
        profilesByUserId.set(profile.user_id, profile);
      }
    }

    const householdViews: HouseholdView[] = subscriptionRows.map((row) => ({
      ...row,
      plan: row.subscription_plans ?? null,
      profile: profilesByUserId.get(row.user_id) ?? null,
    }));

    const totalFees = (pickupsRes.data ?? []).reduce((sum, record) => sum + (record.fee_rwf || 500), 0);

    setStats({
      subscribers: subsCountRes.count ?? householdViews.length,
      pendingPickups: pendingRes.count ?? 0,
      totalPickups: pickupsRes.data?.length ?? 0,
      totalFees,
    });
    setPlans(plansRes.data ?? []);
    setPickupRecords(pickupsRes.data ?? []);
    setHouseholds(householdViews);
    setMomoCode(settingsRes.data?.momo_merchant_code ?? "");
    setCompanyName(settingsRes.data?.company_name ?? "ImyandaSmart");
    setSettingsId(settingsRes.data?.id ?? "");

    if (canManageTeam) {
      await fetchRoleManagementData();
    }

    setLoading(false);
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const saveSettings = async () => {
    if (!settingsId) return;
    const { error } = await supabase
      .from("company_settings")
      .update({ momo_merchant_code: momoCode, company_name: companyName })
      .eq("id", settingsId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Settings updated" });
  };

  const createPlan = async () => {
    const parsedPrice = Number.parseInt(newPlanPrice, 10);
    if (!newPlanName || Number.isNaN(parsedPrice) || parsedPrice <= 0) return;

    const { error } = await supabase.from("subscription_plans").insert({
      name: newPlanName,
      frequency: newPlanFreq,
      price_rwf: parsedPrice,
      description: newPlanDesc || null,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Plan created" });
    setNewPlanName("");
    setNewPlanFreq("weekly");
    setNewPlanPrice("");
    setNewPlanDesc("");
    setPlanDialogOpen(false);
    void fetchData();
  };

  const togglePaymentStatus = async (subId: string, currentStatus: boolean) => {
    const { error } = await supabase.from("user_subscriptions").update({ is_paid: !currentStatus }).eq("id", subId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    void fetchData();
  };

  const assignRole = async (userId: string) => {
    if (!canManageTeam || !role) return;

    const nextRole = selectedRoles[userId];
    if (!nextRole) return;

    const targetUser = users.find((profile) => profile.user_id === userId);
    const targetRole = targetUser?.role ?? null;

    if (role === "admin" && (targetRole === "owner" || targetRole === "super_admin")) {
      toast({
        title: "Restricted",
        description: "Sub-admins and drivers can be managed by an admin, but owner and super admin accounts are protected.",
        variant: "destructive",
      });
      return;
    }

    if (role === "admin" && (nextRole === "owner" || nextRole === "super_admin")) {
      toast({
        title: "Restricted",
        description: "Admin can only assign sub-admin, driver, or customer roles.",
        variant: "destructive",
      });
      return;
    }

    if (userId === user?.id && role === "owner" && nextRole !== "owner") {
      toast({ title: "Owner protection", description: "You cannot remove your own owner role.", variant: "destructive" });
      return;
    }

    if (userId === user?.id && role === "admin" && nextRole !== "admin") {
      toast({ title: "Admin protection", description: "You cannot remove your own admin role.", variant: "destructive" });
      return;
    }

    const { data: rpcData, error: rpcError } = await (supabase as any).rpc("assign_user_role", {
      _target_user_id: userId,
      _target_role: nextRole,
    });

    if (!rpcError) {
      const rpcResult = Array.isArray(rpcData) ? rpcData[0] : null;
      if (rpcResult?.success === false) {
        toast({ title: "Error", description: rpcResult.message ?? "Role assignment failed.", variant: "destructive" });
        return;
      }

      toast({ title: "Team role updated" });
      await fetchRoleManagementData();
      return;
    }

    if (!isMissingRoleRpcError(rpcError.message)) {
      toast({ title: "Error", description: rpcError.message, variant: "destructive" });
      return;
    }

    const { error: deleteError } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (deleteError) {
      toast({ title: "Error", description: deleteError.message, variant: "destructive" });
      return;
    }

    const { error: insertError } = await supabase.from("user_roles").insert({ user_id: userId, role: nextRole });
    if (insertError) {
      toast({ title: "Error", description: insertError.message, variant: "destructive" });
      return;
    }

    toast({ title: "Team role updated" });
    await fetchRoleManagementData();
  };

  const registerRoleByEmail = async () => {
    if (!canManageTeam || !role) return;

    const trimmedEmail = registerEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      toast({ title: "Email required", description: "Enter the user's email address.", variant: "destructive" });
      return;
    }

    if (role === "admin" && (registerRole === "owner" || registerRole === "super_admin")) {
      toast({
        title: "Restricted",
        description: "Admin can only assign sub-admin, driver, or customer roles.",
        variant: "destructive",
      });
      return;
    }

    setRegistering(true);
    const { data, error } = await (supabase as any).rpc("assign_user_role_by_email", {
      _email: trimmedEmail,
      _target_role: registerRole,
    });
    setRegistering(false);

    if (error) {
      toast({
        title: "Error",
        description: isMissingRoleRpcError(error.message)
          ? "Role-assignment function is missing. Apply the latest Supabase migrations, then retry."
          : error.message,
        variant: "destructive",
      });
      return;
    }

    const result = Array.isArray(data) ? data[0] : null;
    if (result?.success === false) {
      toast({ title: "Unable to assign role", description: result.message ?? "Role assignment failed.", variant: "destructive" });
      return;
    }

    toast({ title: "Role assigned", description: result?.message ?? "Team role updated." });
    setRegisterEmail("");
    await fetchRoleManagementData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Clock className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <DashboardHeader title={isOwner ? "Owner Dashboard" : "Company Admin Dashboard"} />
      <main className="max-w-6xl mx-auto p-4 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Subscribers", value: stats.subscribers, icon: Users, color: "text-primary" },
            { label: "Pending Pickups", value: stats.pendingPickups, icon: Trash2, color: "text-warning" },
            { label: "Total Pickups", value: stats.totalPickups, icon: TrendingUp, color: "text-primary" },
            { label: "Service Fees", value: `${stats.totalFees.toLocaleString()} RWF`, icon: DollarSign, color: "text-primary" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold font-display">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="plans">
          <TabsList className="w-full justify-start flex-wrap h-auto">
            <TabsTrigger value="plans">Plans</TabsTrigger>
            <TabsTrigger value="households">Customers</TabsTrigger>
            <TabsTrigger value="fees">Service Fees</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            {canManageTeam && <TabsTrigger value="roles">Team</TabsTrigger>}
          </TabsList>

          <TabsContent value="plans" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">Subscription Plans</CardTitle>
                    <CardDescription>Create and manage subscription plans for customers</CardDescription>
                  </div>
                  <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        <Plus className="h-4 w-4 mr-1" /> Create New Plan
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-lg">Create Subscription Plan</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label className="font-semibold">Plan Name *</Label>
                          <Input 
                            value={newPlanName} 
                            onChange={(e) => setNewPlanName(e.target.value)} 
                            placeholder="e.g., Basic Weekly, Premium Daily"
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Customers will see this name when choosing plans</p>
                        </div>

                        <div>
                          <Label className="font-semibold">Pickup Frequency *</Label>
                          <select
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                            value={newPlanFreq}
                            onChange={(e) => setNewPlanFreq(e.target.value)}
                          >
                            <option value="daily">Daily (Every day)</option>
                            <option value="thrice_weekly">3x per Week (Mon, Wed, Fri)</option>
                            <option value="twice_weekly">2x per Week (Mon, Thu)</option>
                            <option value="weekly">Weekly (Once per week)</option>
                          </select>
                          <p className="text-xs text-muted-foreground mt-1">How often customers get pickups</p>
                        </div>

                        <div>
                          <Label className="font-semibold">Monthly Price (RWF) *</Label>
                          <Input 
                            type="number" 
                            value={newPlanPrice} 
                            onChange={(e) => setNewPlanPrice(e.target.value)} 
                            placeholder="e.g., 2000, 5000, 10000"
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Rwandan Francs per month</p>
                        </div>

                        <div>
                          <Label className="font-semibold">Description (Optional)</Label>
                          <Input 
                            value={newPlanDesc} 
                            onChange={(e) => setNewPlanDesc(e.target.value)} 
                            placeholder="e.g., Best for small households"
                            className="mt-1"
                          />
                        </div>

                        <div className="bg-blue-50 border border-blue-200 p-3 rounded text-xs text-blue-800">
                          <p className="font-semibold mb-1">💡 Recommended Plans:</p>
                          <ul className="space-y-1 font-mono text-xs">
                            <li>• Starter: Weekly @ 2,000 RWF</li>
                            <li>• Standard: 2x weekly @ 4,000 RWF</li>
                            <li>• Premium: 3x weekly @ 6,000 RWF</li>
                          </ul>
                        </div>

                        <Button 
                          className="w-full bg-green-600 hover:bg-green-700" 
                          onClick={createPlan}
                          disabled={!newPlanName || !newPlanPrice}
                        >
                          ✓ Create Plan
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
            </Card>

            <div className="grid gap-3 md:grid-cols-2">
              {plans.length > 0 ? (
                plans.map((plan) => (
                  <Card key={plan.id} className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-bold text-base">{plan.name}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {plan.frequency.replace(/_/g, ' ').toUpperCase()}
                          </p>
                        </div>
                        <Badge variant={plan.is_active ? "default" : "secondary"}>
                          {plan.is_active ? "✓ Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-3 rounded mt-3">
                        <p className="text-xs text-muted-foreground">Monthly Price</p>
                        <p className="text-2xl font-bold text-green-600">{plan.price_rwf.toLocaleString()} RWF</p>
                      </div>
                      {plan.description && (
                        <p className="text-xs text-muted-foreground mt-3 italic">{plan.description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full p-8 text-center border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground mb-3">No plans created yet</p>
                  <p className="text-sm text-muted-foreground">Click "Create New Plan" to get started</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="households">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  👥 Customer Subscriptions
                </CardTitle>
                <CardDescription>
                  View and manage customer subscription payments. Mark payments as received when customers confirm payment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {households.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-bold">Customer Name</TableHead>
                          <TableHead className="font-bold">Plan Details</TableHead>
                          <TableHead className="font-bold">Payment Status</TableHead>
                          <TableHead className="font-bold text-center">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {households.map((household) => (
                          <TableRow key={household.id} className={household.is_paid ? "bg-green-50/30" : "bg-orange-50/30"}>
                            <TableCell>
                              <div>
                                <p className="font-semibold">{household.profile?.full_name || "Unknown"}</p>
                                <p className="text-xs text-muted-foreground">{household.profile?.address || "No address"}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{household.plan?.name || "-"}</p>
                                <p className="text-sm text-muted-foreground">
                                  {(household.plan?.price_rwf ?? 0).toLocaleString()} RWF/month
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Valid: {new Date(household.end_date).toLocaleDateString()}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={household.is_paid ? "default" : "destructive"}
                                className={household.is_paid ? "bg-green-600" : "bg-orange-600"}
                              >
                                {household.is_paid ? "✓ PAID" : "⚠️ UNPAID"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button 
                                size="sm" 
                                variant={household.is_paid ? "outline" : "default"}
                                onClick={() => togglePaymentStatus(household.id, household.is_paid)}
                                className={!household.is_paid ? "bg-green-600 hover:bg-green-700" : ""}
                              >
                                {household.is_paid ? "Mark Unpaid" : "Mark Paid"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground text-lg mb-2">No customers yet</p>
                    <p className="text-sm text-muted-foreground">Customers will appear here when they subscribe to a plan</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" /> Service Fee Tracker
                </CardTitle>
                <CardDescription>500 RWF per pickup - Total: {stats.totalFees.toLocaleString()} RWF</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Fee</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pickupRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{new Date(record.picked_up_at).toLocaleString()}</TableCell>
                        <TableCell>{record.fee_rwf.toLocaleString()} RWF</TableCell>
                      </TableRow>
                    ))}
                    {pickupRecords.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          No pickups recorded yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-4">
              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-orange-600" /> MoMo Payment Code (CRITICAL)
                  </CardTitle>
                  <CardDescription>
                    Customers use this code to send payment via Mobile Money. Update immediately if your account changes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-white p-4 rounded-lg border-2 border-orange-300">
                    <Label className="text-sm font-semibold text-orange-900 mb-2 block">Enter Your MoMo Merchant Code</Label>
                    <Input 
                      value={momoCode} 
                      onChange={(e) => setMomoCode(e.target.value)} 
                      placeholder="e.g., 250875321000 or *182*8*1*XXXXX#"
                      className="text-base font-display tracking-wider"
                    />
                    <p className="text-xs text-orange-800 mt-2">
                      Example: 250875321000 (MTN), 0790123456 (Airtel), or USSD: *182*8*1*...#
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded text-xs text-blue-800">
                    <p className="font-semibold mb-1">ℹ️ How customers use this code:</p>
                    <ol className="space-y-1 ml-2">
                      <li>1. Open their Mobile Money app (MTN, Airtel, etc.)</li>
                      <li>2. Select "Send Money" and enter the code above</li>
                      <li>3. Enter subscription amount (e.g., 2000 RWF)</li>
                      <li>4. Confirm payment</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Company Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input 
                      value={companyName} 
                      onChange={(e) => setCompanyName(e.target.value)} 
                      placeholder="ImyandaSmart"
                    />
                    <p className="text-xs text-muted-foreground">Displayed in customer-facing documents</p>
                  </div>
                </CardContent>
              </Card>

              <Button 
                onClick={saveSettings} 
                className="w-full md:w-auto bg-green-600 hover:bg-green-700"
                size="lg"
              >
                💾 Save All Settings
              </Button>
            </div>
          </TabsContent>

          {canManageTeam && (
            <TabsContent value="roles">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" /> Team Management
                  </CardTitle>
                  <CardDescription>
                    Promote existing users to sub-admins, register drivers, and manage access for company operations.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_auto] md:items-end">
                    <div className="space-y-2">
                      <Label>Register By Email</Label>
                      <Input
                        type="email"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        placeholder="driver@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <select
                        value={registerRole}
                        onChange={(e) => setRegisterRole(e.target.value as AppRole)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="driver">Driver</option>
                        <option value="admin">Sub Admin</option>
                        <option value="customer">Customer</option>
                        {role !== "admin" && <option value="owner">Owner</option>}
                      </select>
                    </div>
                    <Button onClick={registerRoleByEmail} disabled={registering}>
                      {registering ? "Registering..." : "Register"}
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((profile) => {
                        const isSelf = profile.user_id === user?.id;
                        const isProtectedRole = profile.role === "owner" || profile.role === "super_admin";
                        const adminCannotManageThisUser = role === "admin" && isProtectedRole;
                        const assignableRoles =
                          adminCannotManageThisUser && profile.role
                            ? [profile.role]
                            : getAssignableRoles(role ?? null, isSelf);

                        return (
                          <TableRow key={profile.user_id}>
                            <TableCell>{profile.full_name || "Unknown"}</TableCell>
                            <TableCell>{profile.address || "-"}</TableCell>
                            <TableCell>
                              <select
                                value={selectedRoles[profile.user_id] ?? "customer"}
                                onChange={(e) =>
                                  setSelectedRoles((prev) => ({ ...prev, [profile.user_id]: e.target.value as AppRole }))
                                }
                                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                                disabled={adminCannotManageThisUser}
                              >
                                {assignableRoles.map((assignableRole) => (
                                  <option key={assignableRole} value={assignableRole}>
                                    {roleOptionLabels[assignableRole]}
                                  </option>
                                ))}
                              </select>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => assignRole(profile.user_id)}
                                disabled={adminCannotManageThisUser}
                              >
                                {adminCannotManageThisUser ? "Protected" : "Save Role"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {users.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No users available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
