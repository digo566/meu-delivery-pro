import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrdersChart } from "@/components/analytics/OrdersChart";
import { CancellationsChart } from "@/components/analytics/CancellationsChart";
import { AbandonmentChart } from "@/components/analytics/AbandonmentChart";
import { TopProductsChart } from "@/components/analytics/TopProductsChart";
import { BottomProductsChart } from "@/components/analytics/BottomProductsChart";
import { PerformanceChart } from "@/components/analytics/PerformanceChart";
import { InsightsPanel } from "@/components/analytics/InsightsPanel";
import { PredictionsPanel } from "@/components/analytics/PredictionsPanel";
import { FeedbackDialog } from "@/components/analytics/FeedbackDialog";
import { AlertsNotification } from "@/components/analytics/AlertsNotification";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { useIntelligentAnalytics } from "@/hooks/useIntelligentAnalytics";
import { Loader2, TrendingUp, ShoppingCart, XCircle, Package, MessageSquare } from "lucide-react";

export default function Analytics() {
  const { data, loading, refetch } = useAnalyticsData();
  const { analysis, loading: analysisLoading } = useIntelligentAnalytics();
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");
  const [feedbackDialog, setFeedbackDialog] = useState<{
    open: boolean;
    suggestion: string;
    type: string;
  }>({ open: false, suggestion: "", type: "" });

  if (loading || analysisLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Analytics 3D
            </h1>
            <p className="text-muted-foreground mt-2">
              Visualização avançada de métricas do seu restaurante
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <AlertsNotification />
            <Tabs value={period} onValueChange={(v) => setPeriod(v as any)} className="w-auto">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="day">Dia</TabsTrigger>
                <TabsTrigger value="week">Semana</TabsTrigger>
                <TabsTrigger value="month">Mês</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6 bg-gradient-to-br from-background to-muted/30 border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                <p className="text-3xl font-bold mt-2">{data?.pedidos_total || 0}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-background to-muted/30 border-destructive/20 hover:border-destructive/40 transition-all duration-300 hover:shadow-lg hover:shadow-destructive/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cancelamentos</p>
                <p className="text-3xl font-bold mt-2">{data?.cancelamentos || 0}</p>
              </div>
              <div className="p-3 bg-destructive/10 rounded-xl">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-background to-muted/30 border-orange-500/20 hover:border-orange-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Abandono</p>
                <p className="text-3xl font-bold mt-2">{data?.abandonos.toFixed(1) || 0}%</p>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-xl">
                <TrendingUp className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-background to-muted/30 border-green-500/20 hover:border-green-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Produtos Ativos</p>
                <p className="text-3xl font-bold mt-2">{data?.produtos_mais_vendidos.length || 0}</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-xl">
                <Package className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </Card>
        </div>

        {/* Insights e Predições */}
        {analysis && (
          <div className="space-y-6">
            <PredictionsPanel predicoes={analysis.predicoes} />
            
            <div className="relative">
              <InsightsPanel
                problemas={analysis.problemas_detectados}
                sugestoes={analysis.sugestoes_personalizadas}
              />
              {analysis.sugestoes_personalizadas.length > 0 && (
                <div className="flex justify-end mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFeedbackDialog({
                        open: true,
                        suggestion: analysis.sugestoes_personalizadas[0],
                        type: "sugestao_geral",
                      })
                    }
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Avaliar Sugestões
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Orders Chart */}
          <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-muted">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Pedidos por Período
            </h3>
            <OrdersChart data={data?.pedidos_por_dia || []} period={period} />
          </Card>

          {/* Cancellations Chart */}
          <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-muted">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
              Cancelamentos
            </h3>
            <CancellationsChart data={data?.cancelamentos || 0} total={data?.pedidos_total || 0} />
          </Card>

          {/* Abandonment Chart */}
          <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-muted">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
              Taxa de Abandono de Carrinho
            </h3>
            <AbandonmentChart rate={data?.abandonos || 0} />
          </Card>

          {/* Performance Chart */}
          <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-muted">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Desempenho Geral
            </h3>
            <PerformanceChart data={data} />
          </Card>

          {/* Top Products Chart */}
          <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-muted lg:col-span-2">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Produtos Mais Vendidos
            </h3>
            <TopProductsChart data={data?.produtos_mais_vendidos || []} />
          </Card>

          {/* Bottom Products Chart */}
          <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-muted lg:col-span-2">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />
              Produtos Menos Vendidos
            </h3>
            <BottomProductsChart data={data?.produtos_menos_vendidos || []} />
          </Card>
        </div>
      </div>

      <FeedbackDialog
        open={feedbackDialog.open}
        onOpenChange={(open) => setFeedbackDialog({ ...feedbackDialog, open })}
        suggestion={feedbackDialog.suggestion}
        suggestionType={feedbackDialog.type}
      />
    </DashboardLayout>
  );
}
