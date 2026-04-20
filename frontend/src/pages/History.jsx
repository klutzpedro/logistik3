import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { PanelCard, StatusBadge } from "../components/Tactical";
import { motion } from "framer-motion";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, Calendar, Activity, BarChart3 } from "lucide-react";

const STATUS_COLORS = { siap: "#00E676", siap_terbatas: "#FFC400", tidak_siap: "#FF3D00" };
const LOGISTICS_COLORS = {
  bahan_bakar: "#FF8F00", air_bersih: "#00B8D4", fresh_room: "#26C6DA",
  minyak_lincir: "#FFC400", amunisi: "#EF5350", ransum: "#66BB6A",
};

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
  } catch { return iso; }
}

export default function History() {
  const [range, setRange] = useState(30); // days
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/dashboard/history?days=${range}`)
      .then((r) => setTimeline(r.data.timeline || []))
      .finally(() => setLoading(false));
  }, [range]);

  const preset = (label, days) => (
    <button
      key={label}
      onClick={() => setRange(days)}
      data-testid={`range-${days}`}
      className={`tactical-btn ${range === days ? "tactical-btn-primary" : ""}`}
    >
      {label}
    </button>
  );

  const chartData = timeline.map((t) => ({
    date: fmtDate(t.date),
    readiness: t.avg_readiness,
    siap: t.siap,
    siap_terbatas: t.siap_terbatas,
    tidak_siap: t.tidak_siap,
    ...t.logistics_avg,
  }));

  return (
    <div className="p-8 pb-16" data-testid="history-page">
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="label-mono text-[#00E5FF] mb-2 flex items-center gap-2">
            <TrendingUp size={12} /> // HISTORICAL TREND ANALYSIS
          </div>
          <h1 className="heading text-4xl sm:text-5xl font-bold">Tren Kondisi Armada</h1>
          <p className="text-[#8A94A6] mt-2">
            Analisa KONIS & logistik {range} hari terakhir. Periode KONIS: 06:00 → 06:00 esok.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {preset("7 HARI", 7)}
          {preset("30 HARI", 30)}
          {preset("90 HARI", 90)}
          {preset("180 HARI", 180)}
        </div>
      </div>

      {loading ? (
        <div className="label-mono text-[#00E5FF]">LOADING HISTORICAL DATA...</div>
      ) : (
        <motion.div
          className="space-y-6"
          initial="hidden" animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
          {/* Fleet readiness trend */}
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
            <PanelCard
              title="FLEET READINESS TREND"
              testid="chart-readiness-trend"
              right={<span className="label-mono"><Activity size={10} className="inline" /> AVG %</span>}
            >
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="rdGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#212530" />
                  <XAxis dataKey="date" stroke="#8A94A6" style={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} />
                  <YAxis stroke="#8A94A6" style={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "#0A0C10", border: "1px solid #00E5FF" }} />
                  <Area type="monotone" dataKey="readiness" stroke="#00E5FF" fill="url(#rdGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </PanelCard>
          </motion.div>

          {/* KONIS distribution stacked */}
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
            <PanelCard
              title="KONIS DISTRIBUTION OVER TIME"
              testid="chart-konis-stacked"
              right={<span className="label-mono"><BarChart3 size={10} className="inline" /> COUNT</span>}
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} stackOffset="sign">
                  <CartesianGrid strokeDasharray="3 3" stroke="#212530" />
                  <XAxis dataKey="date" stroke="#8A94A6" style={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} />
                  <YAxis stroke="#8A94A6" style={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#0A0C10", border: "1px solid #00E5FF" }} />
                  <Legend wrapperStyle={{ fontFamily: "IBM Plex Mono", fontSize: 10 }} />
                  <Bar dataKey="siap" stackId="a" fill={STATUS_COLORS.siap} name="SIAP" />
                  <Bar dataKey="siap_terbatas" stackId="a" fill={STATUS_COLORS.siap_terbatas} name="TERBATAS" />
                  <Bar dataKey="tidak_siap" stackId="a" fill={STATUS_COLORS.tidak_siap} name="TIDAK SIAP" />
                </BarChart>
              </ResponsiveContainer>
            </PanelCard>
          </motion.div>

          {/* Logistics trends multi-line */}
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
            <PanelCard title="LOGISTICS TREND (FLEET AVG %)" testid="chart-logistics-trend">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#212530" />
                  <XAxis dataKey="date" stroke="#8A94A6" style={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} />
                  <YAxis stroke="#8A94A6" style={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "#0A0C10", border: "1px solid #00E5FF" }} />
                  <Legend wrapperStyle={{ fontFamily: "IBM Plex Mono", fontSize: 10 }} />
                  {Object.entries(LOGISTICS_COLORS).map(([key, color]) => (
                    <Line key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={2} dot={false} name={key.replace(/_/g, " ").toUpperCase()} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </PanelCard>
          </motion.div>

          {/* Latest 14 days table */}
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
            <PanelCard title="DAILY LOG (14 HARI TERAKHIR)" testid="daily-log">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#212530] label-mono">
                      <th className="text-left py-2 px-3">Tanggal</th>
                      <th className="text-right py-2 px-3">Aset</th>
                      <th className="text-right py-2 px-3">Avg Readiness</th>
                      <th className="text-right py-2 px-3">SIAP</th>
                      <th className="text-right py-2 px-3">TERBATAS</th>
                      <th className="text-right py-2 px-3">TIDAK SIAP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeline.slice(-14).reverse().map((t) => (
                      <tr key={t.date} className="border-b border-[#212530] hover:bg-[#0A0C10]">
                        <td className="py-2 px-3 mono">{t.date}</td>
                        <td className="py-2 px-3 mono text-right">{t.count}</td>
                        <td className="py-2 px-3 mono text-right text-[#00E5FF]">{t.avg_readiness}%</td>
                        <td className="py-2 px-3 mono text-right" style={{ color: STATUS_COLORS.siap }}>{t.siap}</td>
                        <td className="py-2 px-3 mono text-right" style={{ color: STATUS_COLORS.siap_terbatas }}>{t.siap_terbatas}</td>
                        <td className="py-2 px-3 mono text-right" style={{ color: STATUS_COLORS.tidak_siap }}>{t.tidak_siap}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PanelCard>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
