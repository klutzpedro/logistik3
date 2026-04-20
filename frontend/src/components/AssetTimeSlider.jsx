import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { StatusBadge, ReadinessBar } from "./Tactical";
import LogisticsTank from "./LogisticsTank";
import { Calendar, Clock, AlertTriangle } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

function dayLabel(iso) {
  try {
    return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
  } catch { return iso; }
}

function fullDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch { return iso; }
}

export default function AssetTimeSlider({ assetId }) {
  const [history, setHistory] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    api.get(`/assets/${assetId}/history?days=${days}`)
      .then((r) => {
        setHistory(r.data.history || []);
        setSelectedIdx((r.data.history || []).length - 1);
      })
      .finally(() => setLoading(false));
  }, [assetId, days]);

  if (loading || history.length === 0) {
    return (
      <div className="label-mono text-[#00E5FF] p-4" data-testid="timeslider-loading">LOADING HISTORY...</div>
    );
  }

  const selected = history[selectedIdx] || history[history.length - 1];
  const chartData = history.map((h) => ({
    date: dayLabel(h.date),
    readiness: h.readiness_percentage,
    stale: h.is_stale ? 1 : 0,
  }));

  return (
    <div className="border border-[#212530] bg-[#0A0C10]" data-testid="time-slider">
      <div className="px-4 py-2.5 border-b border-[#212530] bg-[#080A0E] flex items-center justify-between flex-wrap gap-2">
        <div className="label-mono text-[#00E5FF] flex items-center gap-2">
          <Calendar size={12} /> TIME MACHINE
        </div>
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              data-testid={`history-days-${d}`}
              className={`px-2 py-1 text-[10px] mono uppercase tracking-wider border transition-all ${
                days === d ? "border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/10" : "border-[#212530] text-[#8A94A6] hover:border-[#00E5FF]"
              }`}
            >
              {d}D
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {/* Mini readiness chart */}
        <div className="h-24 mb-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="2 2" stroke="#212530" />
              <XAxis dataKey="date" hide />
              <YAxis hide domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "#0A0C10", border: "1px solid #00E5FF", fontSize: 10 }} />
              <Line type="monotone" dataKey="readiness" stroke="#00E5FF" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Slider */}
        <div className="relative mb-4">
          <input
            type="range"
            min={0}
            max={history.length - 1}
            value={selectedIdx ?? history.length - 1}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
            data-testid="timeline-slider"
            className="w-full accent-[#00E5FF]"
          />
          <div className="flex justify-between label-mono mt-1">
            <span>{dayLabel(history[0]?.date)}</span>
            <span className="text-[#00E5FF]">
              {selectedIdx === history.length - 1 ? "HARI INI" : dayLabel(selected?.date)}
            </span>
            <span>{dayLabel(history[history.length - 1]?.date)}</span>
          </div>
        </div>

        {/* Selected day details */}
        {selected && !selected.no_data && (
          <div className="border-t border-[#212530] pt-4">
            <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
              <div>
                <div className="label-mono mb-1">TANGGAL</div>
                <div className="text-sm mono">{fullDate(selected.date)}</div>
                {selected.is_stale && (
                  <div className="mt-2 flex items-center gap-2 text-xs border border-[#FFC400]/40 bg-[#FFC400]/5 px-2 py-1 w-fit">
                    <AlertTriangle size={12} className="text-[#FFC400]" />
                    <span className="mono text-[#FFC400]">BELUM UPDATE — data dari {dayLabel(selected.konis_date)}</span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <StatusBadge status={selected.konis_status} />
                <div className="mt-2 heading text-3xl font-bold" style={{
                  color: selected.readiness_percentage >= 80 ? "#00E676" : selected.readiness_percentage >= 50 ? "#FFC400" : "#FF3D00"
                }}>
                  {selected.readiness_percentage}%
                </div>
                <div className="label-mono">READINESS</div>
              </div>
            </div>

            <ReadinessBar value={selected.readiness_percentage} />

            {/* Mini tanks */}
            {selected.logistics && Object.keys(selected.logistics).length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-4">
                {Object.entries(selected.logistics).slice(0, 6).map(([k, v]) => (
                  <LogisticsTank key={k} type={k} value={v} />
                ))}
              </div>
            )}
          </div>
        )}

        {selected?.no_data && (
          <div className="border-t border-[#212530] pt-4 text-center text-[#8A94A6] py-6 label-mono">
            <Clock size={24} className="mx-auto mb-2 opacity-50" />
            Belum ada data pada tanggal ini
          </div>
        )}
      </div>
    </div>
  );
}
