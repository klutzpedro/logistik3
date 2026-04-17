import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { StatusBadge, ReadinessBar, PanelCard } from "../components/Tactical";
import { Ship, Building2, Activity, TrendingUp, AlertTriangle, Zap } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadialBarChart, RadialBar,
} from "recharts";
import { motion } from "framer-motion";

const STATUS_COLORS = { siap: "#00E676", siap_terbatas: "#FFC400", tidak_siap: "#FF3D00" };

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/dashboard/stats")
      .then((r) => setStats(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return <div className="p-8 label-mono text-[#00E5FF]">LOADING TACTICAL DATA...</div>;
  }

  const statusData = [
    { name: "SIAP", value: stats.status_count.siap, color: STATUS_COLORS.siap },
    { name: "SIAP TERBATAS", value: stats.status_count.siap_terbatas, color: STATUS_COLORS.siap_terbatas },
    { name: "TIDAK SIAP", value: stats.status_count.tidak_siap, color: STATUS_COLORS.tidak_siap },
  ];

  const logisticsData = Object.entries(stats.logistics_avg || {}).map(([k, v]) => ({
    name: k.replace(/_/g, " ").toUpperCase(),
    value: Math.round(v),
  }));

  const readinessBarData = stats.readiness_list.map((a) => ({
    code: a.code,
    name: a.name,
    readiness: a.readiness,
    fill: STATUS_COLORS[a.status],
  }));

  return (
    <div className="p-8 relative" data-testid="dashboard-page">
      <div className="mb-8">
        <div className="label-mono text-[#00E5FF] mb-2">// TACTICAL COMMAND OVERVIEW</div>
        <h1 className="heading text-4xl sm:text-5xl font-bold">Fleet Readiness</h1>
        <p className="text-[#8A94A6] mt-2">Monitoring terpadu armada & pangkalan Koarmada 3</p>
      </div>

      {/* Top metrics */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
        initial="hidden" animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      >
        {[
          { icon: Ship, label: "Total Kapal", value: stats.total_kapal, color: "#00E5FF", testid: "stat-kapal" },
          { icon: Building2, label: "Total Pangkalan", value: stats.total_pangkalan, color: "#5CFFFF", testid: "stat-pangkalan" },
          { icon: Activity, label: "Rata² Kesiapan", value: `${stats.avg_readiness}%`, color: "#00E676", testid: "stat-readiness" },
          { icon: AlertTriangle, label: "Tidak Siap", value: stats.status_count.tidak_siap, color: "#FF3D00", testid: "stat-critical" },
        ].map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={i}
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              className="border border-[#212530] bg-[#0A0C10] p-5 relative overflow-hidden hover:border-[#00E5FF]/50 transition-all group"
              data-testid={m.testid}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="label-mono mb-2">{m.label}</div>
                  <div className="heading text-4xl font-bold" style={{ color: m.color }}>{m.value}</div>
                </div>
                <Icon size={24} style={{ color: m.color }} className="opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="h-0.5 mt-4" style={{ background: m.color, boxShadow: `0 0 10px ${m.color}` }} />
            </motion.div>
          );
        })}
      </motion.div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Readiness Bar */}
        <PanelCard title="READINESS PER ASSET" className="lg:col-span-2" testid="chart-readiness">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={readinessBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#212530" />
              <XAxis dataKey="code" stroke="#8A94A6" style={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} />
              <YAxis stroke="#8A94A6" style={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#0A0C10", border: "1px solid #00E5FF", fontFamily: "IBM Plex Mono" }}
                labelStyle={{ color: "#00E5FF" }}
              />
              <Bar dataKey="readiness" />
            </BarChart>
          </ResponsiveContainer>
        </PanelCard>

        {/* Status Pie */}
        <PanelCard title="KONIS STATUS DISTRIBUTION" testid="chart-status">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} stroke="#0A0C10">
                {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#0A0C10", border: "1px solid #00E5FF" }} />
              <Legend wrapperStyle={{ fontFamily: "IBM Plex Mono", fontSize: 10, letterSpacing: 1 }} />
            </PieChart>
          </ResponsiveContainer>
        </PanelCard>
      </div>

      {/* Logistics overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PanelCard title="LOGISTICS LEVELS (FLEET AVG)" className="lg:col-span-2" testid="chart-logistics">
          <div className="space-y-4 p-2">
            {logisticsData.map((l) => (
              <div key={l.name}>
                <ReadinessBar value={l.value} label={l.name} />
              </div>
            ))}
          </div>
        </PanelCard>

        <PanelCard title="LIVE INTEL FEED" testid="intel-feed">
          <div className="space-y-3 mono text-xs">
            {stats.readiness_list.slice(0, 6).map((a, i) => (
              <div key={i} className="flex items-start gap-2 pb-2 border-b border-[#212530] last:border-0">
                <Zap size={12} className="text-[#00E5FF] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-[#F1F5F9]">
                    {a.name} <span className="text-[#8A94A6]">({a.code})</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={a.status} size="sm" />
                    <span className="text-[#8A94A6]">{a.readiness}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </PanelCard>
      </div>
    </div>
  );
}
