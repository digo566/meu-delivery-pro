import { useEffect, useRef } from "react";
import Plot from "react-plotly.js";

interface OrdersChartProps {
  data: number[];
  period: "day" | "week" | "month";
}

export function OrdersChart({ data, period }: OrdersChartProps) {
  const labels = period === "day" 
    ? ["00h", "04h", "08h", "12h", "16h", "20h", "23h"]
    : period === "week"
    ? ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
    : ["Sem 1", "Sem 2", "Sem 3", "Sem 4"];

  const chartData: any = [
    {
      type: "scatter3d",
      mode: "lines+markers",
      x: labels,
      y: data,
      z: data.map((_, i) => i),
      line: {
        color: "hsl(var(--primary))",
        width: 6,
      },
      marker: {
        size: 8,
        color: data,
        colorscale: "Viridis",
        line: {
          color: "hsl(var(--primary))",
          width: 2,
        },
      },
      hovertemplate: "<b>%{x}</b><br>Pedidos: %{y}<extra></extra>",
    },
  ];

  const layout: any = {
    autosize: true,
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    scene: {
      xaxis: {
        title: "Período",
        gridcolor: "hsl(var(--muted))",
        color: "hsl(var(--foreground))",
      },
      yaxis: {
        title: "Pedidos",
        gridcolor: "hsl(var(--muted))",
        color: "hsl(var(--foreground))",
      },
      zaxis: {
        title: "",
        showgrid: false,
        showticklabels: false,
        color: "hsl(var(--foreground))",
      },
      camera: {
        eye: { x: 1.5, y: 1.5, z: 1.3 },
      },
    },
    margin: { l: 0, r: 0, t: 0, b: 0 },
    hovermode: "closest",
  };

  const config: any = {
    responsive: true,
    displayModeBar: false,
  };

  return (
    <div className="w-full h-[400px]">
      <Plot
        data={chartData}
        layout={layout}
        config={config}
        className="w-full h-full"
        useResizeHandler
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
