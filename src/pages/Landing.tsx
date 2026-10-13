import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Recycle, Truck, CreditCard, Shield } from "lucide-react";
import { useEffect } from "react";

const features = [
  {
    icon: Recycle,
    title: "Smart Trash Tracking",
    description: "Mark your bin as full with one tap. A collector will be dispatched automatically.",
  },
  {
    icon: Truck,
    title: "Optimized Collection",
    description: "Drivers see all pending pickups in real time and confirm each collection on the spot.",
  },
  {
    icon: CreditCard,
    title: "Flexible Subscriptions",
    description: "Choose a plan that fits your needs — weekly, bi-weekly, or daily pickups.",
  },
  {
    icon: Shield,
    title: "Admin Dashboard",
    description: "Full control over plans, customers, drivers, payments, and company settings.",
  },
];

const Landing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-4">
          <img src="/ImyandaSmart-01.png" alt="ImyandaSmart" className="h-10 w-auto" />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate("/auth")}>Sign In</Button>
            <Button onClick={() => navigate("/auth")}>Get Started</Button>
          </div>
        </div>
      </header>

      <main>
        <section className="py-16 sm:py-24 px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl sm:text-5xl font-display font-bold text-foreground leading-tight">
              Smart Waste Management for a <span className="text-primary">Cleaner Community</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              ImyandaSmart connects households, waste collectors, and administrators in one platform. Request pickups, track collections, and manage subscriptions — all from your phone.
            </p>
            <Button size="lg" className="text-lg px-8 py-6" onClick={() => navigate("/auth")}>
              Start Now — It's Free
            </Button>
          </div>
        </section>

        <section className="py-16 bg-card border-t border-border">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl font-display font-bold text-center mb-10">How It Works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((f) => (
                <div key={f.title} className="p-6 rounded-xl border border-border bg-background space-y-3 text-center">
                  <div className="mx-auto rounded-full bg-primary/10 p-4 w-fit">
                    <f.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-4 text-center">
          <p className="text-muted-foreground text-sm">© {new Date().getFullYear()} ImyandaSmart. All rights reserved.</p>
        </section>
      </main>
    </div>
  );
};

export default Landing;
