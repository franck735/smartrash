import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import HouseholdDashboard from "@/components/dashboard/HouseholdDashboard";
import DriverDashboard from "@/components/dashboard/DriverDashboard";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import SuperAdminDashboard from "@/components/dashboard/SuperAdminDashboard";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const Dashboard = () => {
  const { user, role, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-6 max-w-md">
          <p className="font-medium">We could not load your account permissions.</p>
          <p className="text-muted-foreground text-sm">
            Please retry. If this keeps happening, sign out and sign in again.
          </p>
          <div className="flex justify-center gap-2">
            <Button onClick={() => window.location.reload()}>Retry</Button>
            <Button variant="outline" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {(role === "household" || role === "customer") && <HouseholdDashboard />}
      {role === "driver" && <DriverDashboard />}
      {role === "super_admin" && <SuperAdminDashboard />}
      {role === "admin" && <AdminDashboard />}
      {role === "owner" && <AdminDashboard isOwner />}
    </div>
  );
};

export default Dashboard;
