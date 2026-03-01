import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Zap, Shield, BarChart3, Smartphone, Clock } from "lucide-react";
import grapeLogo from "@/assets/grape-logo.png";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    whatsapp: "",
    restaurantName: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.whatsapp || !formData.restaurantName) {
      toast.error("Preencha todos os campos");
      return;
    }
    setLoading(true);
    // Simula envio
    setTimeout(() => {
      toast.success("Cadastro realizado! Entraremos em contato em breve.");
      setFormData({ name: "", email: "", whatsapp: "", restaurantName: "" });
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[hsl(270,65%,12%)] text-white overflow-hidden relative">
      {/* Grape silhouettes background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.06]">
        {[...Array(12)].map((_, i) => (
          <img
            key={i}
            src={grapeLogo}
            alt=""
            className="absolute w-32 h-32 md:w-48 md:h-48"
            style={{
              top: `${(i % 4) * 28 + 5}%`,
              left: `${(i % 3) * 35 + (i > 5 ? 15 : 0)}%`,
              transform: `rotate(${i * 30}deg) scale(${0.8 + (i % 3) * 0.4})`,
            }}
          />
        ))}
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/10">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={grapeLogo} alt="grape" className="w-10 h-10 object-contain" />
            <span className="font-bold text-2xl tracking-tight">grape</span>
          </div>
          <Button
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10 bg-transparent"
            onClick={() => navigate("/auth")}
          >
            Já sou cliente
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 container py-12 md:py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left - Text Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-sm font-medium">
              <Zap className="w-4 h-4 text-yellow-400" />
              Sistema #1 para delivery
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight">
              Gerencie seu delivery{" "}
              <span className="bg-gradient-to-r from-purple-300 via-violet-300 to-purple-400 bg-clip-text text-transparent">
                de forma profissional
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white/70 max-w-lg leading-relaxed">
              Conte com cardápio digital, gestão de pedidos e todas as ferramentas
              que fazem da Grape o sistema mais completo para seu negócio.
            </p>

            {/* Quick benefits */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Shield, text: "Sem taxa por pedido" },
                { icon: Smartphone, text: "Cardápio digital" },
                { icon: BarChart3, text: "Relatórios completos" },
                { icon: Clock, text: "Setup em 5 minutos" },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-center gap-2.5 text-white/80">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-purple-300" />
                  </div>
                  <span className="text-sm font-medium">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Lead Capture Form */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-purple-500/20 to-violet-600/20 rounded-3xl blur-xl" />
            <div className="relative bg-white rounded-2xl p-8 shadow-2xl shadow-purple-900/40">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Teste a Grape{" "}
                  <span className="text-[hsl(270,65%,45%)] font-extrabold">sem pagar nada</span>
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Preencha seus dados e entraremos em contato
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="lead-name" className="text-gray-700 text-sm">Seu nome</Label>
                  <Input
                    id="lead-name"
                    placeholder="Nome completo"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-[hsl(270,65%,45%)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="lead-email" className="text-gray-700 text-sm">Seu email pessoal</Label>
                  <Input
                    id="lead-email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-[hsl(270,65%,45%)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="lead-whatsapp" className="text-gray-700 text-sm">Seu WhatsApp</Label>
                  <Input
                    id="lead-whatsapp"
                    type="tel"
                    placeholder="(85) 99999-8888"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-[hsl(270,65%,45%)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="lead-restaurant" className="text-gray-700 text-sm">Nome do seu restaurante</Label>
                  <Input
                    id="lead-restaurant"
                    placeholder="Meu Restaurante"
                    value={formData.restaurantName}
                    onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
                    className="border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-[hsl(270,65%,45%)]"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-[hsl(270,65%,45%)] hover:bg-[hsl(270,65%,38%)] text-white font-bold text-base mt-2"
                  disabled={loading}
                >
                  {loading ? "Enviando..." : "Quero testar grátis"}
                </Button>

                <p className="text-xs text-center text-gray-400">
                  Sem compromisso. Sem cartão de crédito.
                </p>
              </form>
            </div>
          </div>
        </div>

        {/* Social Proof Section */}
        <div className="mt-24 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-12">
            Tudo que você precisa em um só lugar
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { title: "Cardápio Digital", desc: "Seus clientes fazem pedidos direto pelo celular, sem precisar de app." },
              { title: "Gestão de Pedidos", desc: "Acompanhe todos os pedidos em tempo real com notificações." },
              { title: "CRM de Clientes", desc: "Histórico completo de cada cliente para fidelizar mais." },
              { title: "Relatórios Detalhados", desc: "Entenda suas vendas com gráficos e métricas inteligentes." },
              { title: "Sem Taxa por Pedido", desc: "Pague um valor fixo e receba quantos pedidos quiser." },
              { title: "Suporte Dedicado", desc: "Time pronto para te ajudar quando você precisar." },
            ].map((item, i) => (
              <div
                key={i}
                className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm text-left hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="w-5 h-5 text-purple-300 flex-shrink-0" />
                  <h3 className="font-semibold text-lg">{item.title}</h3>
                </div>
                <p className="text-white/60 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 mt-24">
        <div className="container py-8 text-center text-white/40 text-sm">
          © 2025 grape. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default Index;
