import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Users, 
  LogOut,
  Menu,
  Store,
  ShoppingCart,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logout realizado com sucesso!");
      navigate("/auth");
    } catch (error) {
      toast.error("Erro ao fazer logout");
    }
  };

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/analytics", icon: BarChart3, label: "Analytics 3D" },
    { to: "/products", icon: Package, label: "Produtos" },
    { to: "/orders", icon: ShoppingBag, label: "Pedidos" },
    { to: "/customers", icon: Users, label: "Clientes" },
    { to: "/abandoned-carts", icon: ShoppingCart, label: "Carrinhos Abandonados" },
  ];

  const NavItems = () => (
    <>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-muted-foreground transition-all hover:text-foreground hover:bg-secondary/50"
          activeClassName="bg-gradient-to-r from-primary/20 to-accent/10 text-foreground font-medium border border-primary/30 shadow-md shadow-primary/10"
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </NavLink>
      ))}
    </>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      {/* Glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-accent/15 rounded-full blur-[100px]" />
      </div>
      
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r border-border/50 bg-card/80 backdrop-blur-xl sm:flex">
        <div className="flex h-16 items-center border-b border-border/50 px-4 gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
            <Store className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">vpex</span>
        </div>
        <nav className="flex-1 px-3 py-6 space-y-2">
          <NavItems />
        </nav>
        <div className="border-t border-border/50 p-4">
          <Button 
            onClick={handleLogout} 
            variant="ghost" 
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      <div className="flex flex-col sm:gap-4 sm:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/50 bg-card/60 backdrop-blur-xl px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden border-border/50 bg-card/50 backdrop-blur-md">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs bg-card/95 backdrop-blur-xl border-border/50">
              <nav className="grid gap-4 text-lg font-medium">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                    <Store className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="font-bold text-lg">vpex</span>
                </div>
                <NavItems />
                <Button 
                  onClick={handleLogout} 
                  variant="ghost" 
                  className="justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 mt-4"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </header>
        <main className="relative flex-1 p-4 sm:px-6 sm:py-0">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;