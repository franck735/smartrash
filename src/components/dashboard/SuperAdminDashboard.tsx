import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardHeader from "./DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, TrendingUp, DollarSign, Activity, Shield, Plus, Copy, Check, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Tables } from "@/integrations/supabase/types";

type AppRole = Tables<"user_roles">["role"];
type SubscriptionPlan = Tables<"subscription_plans">;
type UserSubscription = Tables<"user_subscriptions">;
type RoleUser = Pick<Tables<"profiles">, "user_id" | "full_name" | "address"> & { role: AppRole | null };

interface RecentPickup {
  id: string;
  fee_rwf: number;
  picked_up_at: string;
  household_id: string;
  driver_id: string;
}

const roleOrder: AppRole[] = ["super_admin", "owner", "admin", "driver", "customer", "household"];

const roleLabels: Record<AppRole, string> = {
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

const isMissingRoleRpcError = (message: string) =>
  message.includes("assign_user_role") ||
  message.includes("PGRST202") ||
  message.includes("Could not find the function");

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPickups, setTotalPickups] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [activeSubscribers, setActiveSubscribers] = useState(0);
  const [recentPickups, setRecentPickups] = useState<RecentPickup[]>([]);
  const [users, setUsers] = useState<RoleUser[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, AppRole>>({});
  const [savingRoleFor, setSavingRoleFor] = useState<string | null>(null);
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerRole, setRegisterRole] = useState<AppRole>("driver");
  const [registering, setRegistering] = useState(false);
  
  // Settings and Plans state
  const [momoCode, setMomoCode] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<(UserSubscription & { profiles?: any })[]>([]);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanFrequency, setNewPlanFrequency] = useState("weekly");
  const [newPlanPrice, setNewPlanPrice] = useState("");
  const [newPlanDescription, setNewPlanDescription] = useState("");
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchOverview = async () => {
    const [profilesRes, pickupsRes, subsRes, recentRes] = await Promise.all([
      supabase.from("profiles").select("user_id", { count: "exact", head: true }),
      supabase.from("pickup_records").select("fee_rwf", { count: "exact" }),
      supabase
        .from("user_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("is_paid", true)
        .gt("end_date", new Date().toISOString().split("T")[0]),
      supabase.from("pickup_records").select("*").order("picked_up_at", { ascending: false }).limit(10),
    ]);

    setTotalUsers(profilesRes.count ?? 0);
    setTotalPickups(pickupsRes.count ?? 0);
    setTotalRevenue((pickupsRes.data ?? []).reduce((sum, row) => sum + (row.fee_rwf ?? 0), 0));
    setActiveSubscribers(subsRes.count ?? 0);
    setRecentPickups(recentRes.data ?? []);
  };

  const fetchTeamData = async () => {
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
        acc[profile.user_id] = profile.role ?? "customer";
        return acc;
      }, {}),
    );
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("company_settings")
      .select("momo_merchant_code, company_name")
      .limit(1)
      .maybeSingle();
    
    if (data) {
      setMomoCode(data.momo_merchant_code || "");
      setCompanyName(data.company_name || "");
    }
  };

  const fetchPlans = async () => {
    const { data } = await supabase
      .from("subscription_plans")
      .select("*")
      .order("created_at", { ascending: false });
    
    setPlans(data || []);
  };

  const fetchSubscriptions = async () => {
    const { data } = await supabase
      .from("user_subscriptions")
      .select("*, subscription_plans(name, frequency, price_rwf), user_id")
      .order("created_at", { ascending: false });
    
    if (data) {
      // Fetch profile names separately
      const userIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", userIds);
      
      const profileMap = Object.fromEntries(
        (profiles || []).map(p => [p.user_id, { full_name: p.full_name, phone: p.phone }])
      );
      
      const enriched = data.map(sub => ({
        ...sub,
        profiles: profileMap[sub.user_id] || { full_name: "Unknown", phone: "" }
      }));
      
      setSubscriptions(enriched);
    } else {
      setSubscriptions([]);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchOverview(), fetchTeamData(), fetchSettings(), fetchPlans(), fetchSubscriptions()]);
    setLoading(false);
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      // Try to update existing settings
      const { data: existingData } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (existingData) {
        // Update existing record
        const { error } = await supabase
          .from("company_settings")
          .update({ momo_merchant_code: momoCode, company_name: companyName })
          .eq("id", existingData.id);
        
        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from("company_settings")
          .insert({ momo_merchant_code: momoCode, company_name: companyName });
        
        if (error) throw error;
      }

      toast({ title: "Settings saved successfully" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const createPlan = async () => {
    if (!newPlanName || !newPlanPrice) {
      toast({ title: "Error", description: "Plan name and price are required", variant: "destructive" });
      return;
    }

    setCreatingPlan(true);
    try {
      const { error } = await supabase
        .from("subscription_plans")
        .insert({
          name: newPlanName,
          frequency: newPlanFrequency,
          price_rwf: parseInt(newPlanPrice),
          description: newPlanDescription,
          is_active: true,
        });
      
      if (error) throw error;
      
      toast({ title: "Plan created successfully" });
      setNewPlanName("");
      setNewPlanFrequency("weekly");
      setNewPlanPrice("");
      setNewPlanDescription("");
      setShowCreatePlan(false);
      await fetchPlans();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreatingPlan(false);
    }
  };

  const togglePaymentStatus = async (subscriptionId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("user_subscriptions")
        .update({ is_paid: !currentStatus })
        .eq("id", subscriptionId);
      
      if (error) throw error;
      
      toast({ title: currentStatus ? "Marked as unpaid" : "Marked as paid" });
      await fetchSubscriptions();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const assignRole = async (userId: string) => {
    const nextRole = selectedRoles[userId];
    if (!nextRole) return;

    if (userId === user?.id && nextRole !== "super_admin") {
      toast({
        title: "Super admin protection",
        description: "You cannot remove your own super admin role.",
        variant: "destructive",
      });
      return;
    }

    setSavingRoleFor(userId);

    const { data: rpcData, error: rpcError } = await (supabase as any).rpc("assign_user_role", {
      _target_user_id: userId,
      _target_role: nextRole,
    });

    if (!rpcError) {
      const rpcResult = Array.isArray(rpcData) ? rpcData[0] : null;
      if (rpcResult?.success === false) {
        setSavingRoleFor(null);
        toast({ title: "Error", description: rpcResult.message ?? "Role assignment failed.", variant: "destructive" });
        return;
      }

      toast({ title: "Team role updated" });
      await fetchTeamData();
      setSavingRoleFor(null);
      return;
    }

    if (!isMissingRoleRpcError(rpcError.message)) {
      setSavingRoleFor(null);
      toast({ title: "Error", description: rpcError.message, variant: "destructive" });
      return;
    }

    const { error: deleteError } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (deleteError) {
      setSavingRoleFor(null);
      toast({ title: "Error", description: deleteError.message, variant: "destructive" });
      return;
    }

    const { error: insertError } = await supabase.from("user_roles").insert({ user_id: userId, role: nextRole });
    if (insertError) {
      setSavingRoleFor(null);
      toast({ title: "Error", description: insertError.message, variant: "destructive" });
      return;
    }

    toast({ title: "Team role updated" });
    await fetchTeamData();
    setSavingRoleFor(null);
  };

  const registerRoleByEmail = async () => {
    const trimmedEmail = registerEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      toast({ title: "Email required", description: "Enter the user's email address.", variant: "destructive" });
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
    await fetchTeamData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  const stats = [
    { label: "Total Users", value: totalUsers, icon: Users, color: "text-primary" },
    { label: "Total Pickups", value: totalPickups, icon: TrendingUp, color: "text-primary" },
    { label: "Total Revenue", value: `${totalRevenue.toLocaleString()} RWF`, icon: DollarSign, color: "text-primary" },
    { label: "Active Subscribers", value: activeSubscribers, icon: Activity, color: "text-accent" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="System Overview" />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Tab Navigation */}
        <div className="flex gap-2 border-b overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
              activeTab === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
              activeTab === "settings"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveTab("plans")}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
              activeTab === "plans"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Plans
          </button>
          <button
            onClick={() => setActiveTab("subscriptions")}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
              activeTab === "subscriptions"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Subscriptions
          </button>
          <button
            onClick={() => setActiveTab("team")}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
              activeTab === "team"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Team
          </button>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat) => (
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

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Pickups</CardTitle>
                <CardDescription>Latest completed waste collections across the system</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Fee (RWF)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPickups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          No pickups recorded yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentPickups.map((pickup) => (
                        <TableRow key={pickup.id}>
                          <TableCell>{new Date(pickup.picked_up_at).toLocaleString()}</TableCell>
                          <TableCell>{pickup.fee_rwf.toLocaleString()} RWF</TableCell>
                          <TableCell>
                            <Badge variant="default">Completed</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <Card className="border-2 border-orange-200 bg-gradient-to-br from-background to-orange-50/20">
            <CardHeader>
              <CardTitle className="text-lg">System Settings</CardTitle>
              <CardDescription>Configure MoMo payment code and company information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Company Name</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your Company Name"
                  className="text-base"
                />
              </div>

              <div className="space-y-4 p-4 border-2 border-orange-400 rounded-lg bg-orange-50">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-orange-600 rounded-full"></div>
                  <Label className="text-base font-bold text-orange-900">CRITICAL: MoMo Merchant Code</Label>
                </div>
                <p className="text-sm text-orange-800 ml-5">
                  This code MUST be set before customers can subscribe and pay. Customers will use this code to send payment.
                </p>
                <div className="flex gap-2 ml-5">
                  <Input
                    value={momoCode}
                    onChange={(e) => setMomoCode(e.target.value)}
                    placeholder="e.g., 250875321000 or *182*8*1*XXXXX#"
                    className="flex-1 border-2 border-orange-300"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(momoCode)}
                    className="border-orange-300"
                  >
                    {copiedCode ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-blue-900">How customers will pay:</p>
                <ol className="text-sm text-blue-900 space-y-1 ml-4 list-decimal">
                  <li>Customer sees your MoMo code in their subscription panel</li>
                  <li>They open their mobile money app</li>
                  <li>They send payment to your code</li>
                  <li>They click "I've Completed Payment" in the app</li>
                  <li>You verify and mark as paid in this dashboard</li>
                </ol>
              </div>

              <Button onClick={saveSettings} disabled={savingSettings} className="bg-primary">
                {savingSettings ? "Saving..." : "Save Settings"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* PLANS TAB */}
        {activeTab === "plans" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Subscription Plans</CardTitle>
                <CardDescription>Create and manage subscription plans for customers</CardDescription>
              </div>
              <Dialog open={showCreatePlan} onOpenChange={setShowCreatePlan}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4" />
                    Create Plan
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Subscription Plan</DialogTitle>
                    <DialogDescription>Set up a new plan for customers</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Plan Name</Label>
                      <Input
                        value={newPlanName}
                        onChange={(e) => setNewPlanName(e.target.value)}
                        placeholder="e.g., Starter, Standard, Premium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <select
                        value={newPlanFrequency}
                        onChange={(e) => setNewPlanFrequency(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Every 2 weeks</option>
                        <option value="monthly">Monthly</option>
                        <option value="daily">Daily</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Price (RWF)</Label>
                      <Input
                        type="number"
                        value={newPlanPrice}
                        onChange={(e) => setNewPlanPrice(e.target.value)}
                        placeholder="e.g., 2000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={newPlanDescription}
                        onChange={(e) => setNewPlanDescription(e.target.value)}
                        placeholder="e.g., Pick up once per week"
                      />
                    </div>

                    <div className="p-3 bg-gray-100 rounded text-sm space-y-1">
                      <p className="font-semibold">Example Plans:</p>
                      <p>• Starter: Weekly @ 2,000 RWF</p>
                      <p>• Standard: Biweekly @ 4,000 RWF</p>
                      <p>• Premium: Daily @ 6,000 RWF</p>
                    </div>

                    <Button onClick={createPlan} disabled={creatingPlan} className="w-full bg-primary">
                      {creatingPlan ? "Creating..." : "Create Plan"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {plans.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No plans created yet</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {plans.map((plan) => (
                    <Card key={plan.id} className={`border-2 ${plan.is_active ? "border-green-200 bg-green-50" : "border-gray-200"}`}>
                      <CardContent className="pt-6">
                        <h3 className="font-bold text-lg mb-2">{plan.name}</h3>
                        <p className="text-2xl font-bold text-primary mb-2">{plan.price_rwf.toLocaleString()} RWF</p>
                        <p className="text-sm text-muted-foreground mb-3">Frequency: <strong>{plan.frequency}</strong></p>
                        <p className="text-sm mb-3">{plan.description}</p>
                        <Badge variant={plan.is_active ? "default" : "secondary"}>
                          {plan.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* SUBSCRIPTIONS TAB */}
        {activeTab === "subscriptions" && (
          <div className="space-y-6">
            {/* Pending Approvals Section */}
            <Card className="border-2 border-orange-300 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" /> Pending Payment Approvals
                </CardTitle>
                <CardDescription>Customers who have confirmed payment, waiting for approval</CardDescription>
              </CardHeader>
              <CardContent>
                {subscriptions.filter((s: any) => !s.is_paid).length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No pending approvals</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-orange-100">
                        <TableHead>Customer</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscriptions.filter((s: any) => !s.is_paid).map((sub: any) => (
                        <TableRow key={sub.id} className="hover:bg-orange-100">
                          <TableCell className="font-semibold">{sub.profiles?.full_name || "Unknown"}</TableCell>
                          <TableCell>{sub.subscription_plans?.name || "N/A"}</TableCell>
                          <TableCell className="font-bold text-lg">{sub.subscription_plans?.price_rwf.toLocaleString() || "-"} RWF</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(sub.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => togglePaymentStatus(sub.id, sub.is_paid)}
                            >
                              ✓ Approve Payment
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Approved Subscriptions Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Approved Subscriptions</CardTitle>
                <CardDescription>Active paid subscriptions</CardDescription>
              </CardHeader>
              <CardContent>
                {subscriptions.filter((s: any) => s.is_paid).length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No approved subscriptions yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-green-100">
                        <TableHead>Customer</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Approved</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscriptions.filter((s: any) => s.is_paid).map((sub: any) => (
                        <TableRow key={sub.id} className="hover:bg-green-50">
                          <TableCell className="font-medium">{sub.profiles?.full_name || "Unknown"}</TableCell>
                          <TableCell>{sub.subscription_plans?.name || "N/A"}</TableCell>
                          <TableCell>{sub.subscription_plans?.price_rwf.toLocaleString() || "-"} RWF</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(sub.updated_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800">✓ Active</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-orange-600 hover:text-orange-700"
                              onClick={() => togglePaymentStatus(sub.id, sub.is_paid)}
                            >
                              Reject
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* TEAM TAB */}
        {activeTab === "team" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> Team Management
              </CardTitle>
              <CardDescription>
                Create sub-admins and register drivers by setting role to <strong>Sub Admin</strong> or <strong>Driver</strong>.
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
                    <TableHead>Current Role</TableHead>
                    <TableHead>Set Role</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((profile) => (
                    <TableRow key={profile.user_id}>
                      <TableCell>{profile.full_name || "Unknown"}</TableCell>
                      <TableCell>{profile.address || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{profile.role ? roleLabels[profile.role] : "Customer"}</Badge>
                      </TableCell>
                      <TableCell>
                        <select
                          value={selectedRoles[profile.user_id] ?? "customer"}
                          onChange={(e) =>
                            setSelectedRoles((prev) => ({ ...prev, [profile.user_id]: e.target.value as AppRole }))
                          }
                          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="customer">Customer</option>
                          <option value="driver">Driver</option>
                          <option value="admin">Sub Admin</option>
                          <option value="owner">Owner</option>
                          <option value="super_admin">Super Admin</option>
                          <option value="household">Household (legacy)</option>
                        </select>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => assignRole(profile.user_id)}
                          disabled={savingRoleFor === profile.user_id}
                        >
                          {savingRoleFor === profile.user_id ? "Saving..." : "Save Role"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No users available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
