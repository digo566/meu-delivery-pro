import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Store, TrendingUp, Users, Package } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Store className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">vpex</span>
          </div>
          <Button onClick={() => navigate("/auth")}>Entrar</Button>
        </div>
      </nav>

      <main className="container py-24">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Gerencie seu delivery de forma{" "}
            <span className="text-primary">profissional</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Plataforma completa para restaurantes gerenciarem pedidos, produtos e
            clientes em um só lugar.
          </p>
          <div className="flex gap-4 justify-center pt-8">
            <Button size="lg" onClick={() => navigate("/auth")}>
              Começar Gratuitamente
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Fazer Login
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="p-6 rounded-lg border bg-card space-y-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Dashboard Completo</h3>
            <p className="text-muted-foreground">
              Acompanhe suas vendas, pedidos e métricas em tempo real com
              gráficos intuitivos.
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-card space-y-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Gestão de Produtos</h3>
            <p className="text-muted-foreground">
              Cadastre e gerencie seu cardápio com facilidade. Controle preços e
              disponibilidade.
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-card space-y-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">CRM de Clientes</h3>
            <p className="text-muted-foreground">
              Gerencie seus clientes e histórico de pedidos. Integração com
              WhatsApp.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
