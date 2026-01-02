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
  ShoppingCart,
  BarChart3
} from "lucide-react";
import grapeLogo from "@/assets/grape-logo.png";
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
    { to: "/analytics", icon: BarChart3, label: "Analytics" },
    { to: "/products", icon: Package, label: "Produtos" },
    { to: "/orders", icon: ShoppingBag, label: "Pedidos" },
    { to: "/customers", icon: Users, label: "Clientes" },
    { to: "/abandoned-carts", icon: ShoppingCart, label: "Carrinhos" },
  ];

  const NavItems = () => (
    <>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary"
          activeClassName="bg-primary/10 text-primary font-medium"
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </NavLink>
      ))}
    </>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-56 flex-col border-r bg-card sm:flex">
        <div className="flex h-14 items-center border-b px-4 gap-3">
          <img src={grapeLogo} alt="grape" className="w-8 h-8 object-contain" />
          <span className="font-semibold text-foreground">grape</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavItems />
        </nav>
        <div className="border-t p-3">
          <Button 
            onClick={handleLogout} 
            variant="ghost" 
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 sm:pl-56">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-card px-4 sm:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-56 p-0">
              <div className="flex h-14 items-center border-b px-4 gap-3">
                <img src={grapeLogo} alt="grape" className="w-8 h-8 object-contain" />
                <span className="font-semibold">grape</span>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-1">
                <NavItems />
              </nav>
              <div className="border-t p-3">
                <Button 
                  onClick={handleLogout} 
                  variant="ghost" 
                  className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <span className="font-semibold">grape</span>
        </header>
        
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
