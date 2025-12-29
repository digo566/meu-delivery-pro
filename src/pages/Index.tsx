import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TrendingUp, Users, Package, CheckCircle } from "lucide-react";
import vpexLogo from "@/assets/vpex-logo.png";

const Index = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={vpexLogo} alt="vpex" className="w-10 h-10 object-contain" />
            <span className="font-semibold text-xl text-foreground">vpex</span>
          </div>
          <Button onClick={() => navigate("/auth")}>Entrar</Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container py-20">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Sistema completo para gestão do seu delivery
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Gerencie pedidos, produtos e clientes em uma única plataforma. 
            Simples, rápido e confiável.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => navigate("/auth")}>
              Começar Agora
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Fazer Login
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-5xl mx-auto">
          <div className="p-6 rounded-lg border bg-card space-y-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Dashboard Completo</h3>
            <p className="text-muted-foreground text-sm">
              Acompanhe vendas, pedidos e métricas importantes em tempo real.
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-card space-y-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Gestão de Produtos</h3>
            <p className="text-muted-foreground text-sm">
              Cadastre e gerencie seu cardápio com facilidade e rapidez.
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-card space-y-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">CRM de Clientes</h3>
            <p className="text-muted-foreground text-sm">
              Gerencie clientes e histórico de pedidos em um só lugar.
            </p>
          </div>
        </div>

        {/* Trust Section */}
        <div className="mt-24 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-semibold text-foreground mb-8">
            Por que escolher a vpex?
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 text-left">
            {[
              "Interface simples e intuitiva",
              "Sem taxa por pedido",
              "Suporte técnico dedicado",
              "Atualizações constantes",
              "Relatórios detalhados",
              "Integração com WhatsApp"
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-24">
        <div className="container py-8 text-center text-muted-foreground text-sm">
          © 2024 vpex. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default Index;
