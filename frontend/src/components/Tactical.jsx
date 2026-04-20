import React from "react";

const STATUS_MAP = {
  siap: { label: "SIAP", color: "#00E676", bg: "rgba(0,230,118,0.1)" },
  siap_terbatas: { label: "SIAP TERBATAS", color: "#FFC400", bg: "rgba(255,196,0,0.1)" },
  tidak_siap: { label: "TIDAK SIAP", color: "#FF3D00", bg: "rgba(255,61,0,0.1)" },
};

export function StatusBadge({ status, size = "md" }) {
  const s = STATUS_MAP[status] || STATUS_MAP.siap;
  const cls = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-2 border mono uppercase tracking-wider ${cls}`}
      style={{ color: s.color, borderColor: s.color, background: s.bg }}
      data-testid={`status-${status}`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
      {s.label}
    </span>
  );
}

export function ReadinessBar({ value, label }) {
  const color = value >= 80 ? "#00E676" : value >= 50 ? "#FFC400" : "#FF3D00";
  return (
    <div className="w-full" data-testid={`readiness-bar-${label || "x"}`}>
      {label && (
        <div className="flex justify-between label-mono mb-1.5">
          <span>{label}</span>
          <span style={{ color }}>{value}%</span>
        </div>
      )}
      <div className="h-1.5 bg-[#0A0C10] border border-[#212530] relative overflow-hidden">
        <div
          className="h-full transition-all duration-700"
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            background: color,
            boxShadow: `0 0 10px ${color}`,
          }}
        />
      </div>
    </div>
  );
}

export function PanelCard({ title, children, right, className = "", testid }) {
  return (
    <div className={`border border-[#212530] bg-[#0A0C10] ${className}`} data-testid={testid}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-[#212530] px-4 py-2.5 bg-[#080A0E]">
          <div className="label-mono text-[#00E5FF] truncate min-w-0">{title}</div>
          {right && <div className="whitespace-nowrap shrink-0">{right}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
