import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DashboardHeaderProps {
  title: string;
}

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  owner: "Owner",
  admin: "Company Admin",
  driver: "Collector",
  customer: "Customer",
  household: "Customer",
};

const DashboardHeader = ({ title }: DashboardHeaderProps) => {
  const { signOut, role } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <header className="border-b border-border bg-card px-4 py-3 sm:px-6 sticky top-0 z-50">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img src="/ImyandaSmart-01.png" alt="ImyandaSmart" className="h-9 w-auto" />
          <div>
            <h1 className="text-lg font-display font-bold text-foreground">{title}</h1>
            <span className="text-xs text-muted-foreground font-medium">{roleLabels[role ?? ""] ?? "User"}</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Sign Out</span>
        </Button>
      </div>
    </header>
  );
};

export default DashboardHeader;
