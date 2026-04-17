import React from "react";

const TANK_CONFIG = {
  bahan_bakar: { label: "BAHAN BAKAR", color: "#FF8F00", light: "#FFB74D", icon: "fuel" },
  air_bersih: { label: "AIR BERSIH", color: "#00B8D4", light: "#4FC3F7", icon: "water" },
  minyak_lincir: { label: "MINYAK LINCIR", color: "#FFC400", light: "#FFE082", icon: "oil" },
  fresh_room: { label: "FRESH ROOM", color: "#26C6DA", light: "#80DEEA", icon: "freeze" },
  amunisi: { label: "AMUNISI", color: "#EF5350", light: "#EF9A9A", icon: "ammo" },
  ransum: { label: "RANSUM", color: "#66BB6A", light: "#A5D6A7", icon: "food" },
};

function TankIcon({ type, color }) {
  const commonProps = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (type) {
    case "fuel":
      return (
        <svg {...commonProps}>
          <path d="M3 22h12" />
          <path d="M4 9h10v13H4z" />
          <path d="M4 14h10" />
          <path d="M14 12h3a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2" />
          <path d="M14 6V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2" />
        </svg>
      );
    case "water":
      return (
        <svg {...commonProps}>
          <path d="M12 2s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13z" />
        </svg>
      );
    case "oil":
      return (
        <svg {...commonProps}>
          <path d="M3 10h12l2 3h5v6H3z" />
          <circle cx="7" cy="19" r="2" />
          <circle cx="17" cy="19" r="2" />
          <path d="M14 10V6h-3" />
        </svg>
      );
    case "freeze":
      return (
        <svg {...commonProps}>
          <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07" />
        </svg>
      );
    case "ammo":
      return (
        <svg {...commonProps}>
          <path d="M6 2h12v6l-3 3v11H9V11L6 8z" />
          <path d="M9 11h6" />
        </svg>
      );
    case "food":
      return (
        <svg {...commonProps}>
          <path d="M3 11h18l-2 10H5z" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    default:
      return null;
  }
}

export default function LogisticsTank({ type, value }) {
  const cfg = TANK_CONFIG[type] || { label: type.toUpperCase(), color: "#00E5FF", light: "#5CFFFF", icon: "fuel" };
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const status = pct >= 70 ? "high" : pct >= 35 ? "mid" : "low";
  // Gradient id unique per instance
  const gradId = `grad-${type}-${Math.random().toString(36).slice(2, 7)}`;
  const waveId = `wave-${type}-${Math.random().toString(36).slice(2, 7)}`;

  const fillHeight = (pct / 100) * 100; // 0..100 inside the tank path

  return (
    <div
      className="relative border border-[#212530] bg-[#0A0C10] p-3 overflow-hidden group hover:border-[#00E5FF]/40 transition-all"
      data-testid={`tank-${type}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TankIcon type={cfg.icon} color={cfg.color} />
          <span className="label-mono text-[10px]">{cfg.label}</span>
        </div>
        <span
          className="mono text-sm font-bold"
          style={{ color: cfg.color, textShadow: `0 0 8px ${cfg.color}55` }}
        >
          {Math.round(pct)}%
        </span>
      </div>

      <div className="relative h-28 flex items-center justify-center">
        <svg viewBox="0 0 100 120" className="h-full">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cfg.light} stopOpacity="0.95" />
              <stop offset="100%" stopColor={cfg.color} stopOpacity="0.95" />
            </linearGradient>

            {/* Clip tank body */}
            <clipPath id={`clip-${gradId}`}>
              <path d="M 15 15 Q 15 10 20 10 L 80 10 Q 85 10 85 15 L 85 105 Q 85 110 80 110 L 20 110 Q 15 110 15 105 Z" />
            </clipPath>
          </defs>

          {/* Tank outer outline */}
          <path
            d="M 15 15 Q 15 10 20 10 L 80 10 Q 85 10 85 15 L 85 105 Q 85 110 80 110 L 20 110 Q 15 110 15 105 Z"
            fill="rgba(5,6,8,0.8)"
            stroke={cfg.color}
            strokeWidth="1.2"
            strokeOpacity="0.7"
          />

          {/* Horizontal measurement lines */}
          {[25, 50, 75].map((y) => (
            <line key={y} x1="15" y1={10 + y} x2="85" y2={10 + y} stroke={cfg.color} strokeOpacity="0.08" strokeWidth="0.5" />
          ))}

          {/* Liquid fill (clipped) */}
          <g clipPath={`url(#clip-${gradId})`}>
            {/* Liquid body */}
            <rect
              x="15"
              y={110 - fillHeight}
              width="70"
              height={fillHeight}
              fill={`url(#${gradId})`}
              style={{ transition: "all 1.2s cubic-bezier(.2,.9,.2,1)" }}
            />

            {/* Animated wave on surface */}
            {pct > 2 && (
              <g style={{ transform: `translateY(${110 - fillHeight}px)`, transition: "transform 1.2s cubic-bezier(.2,.9,.2,1)" }}>
                <path
                  d="M 0 4 Q 25 -2 50 4 T 100 4 T 150 4 L 150 20 L 0 20 Z"
                  fill={cfg.light}
                  opacity="0.6"
                >
                  <animate
                    attributeName="d"
                    dur="3s"
                    repeatCount="indefinite"
                    values="
                      M 0 4 Q 25 -2 50 4 T 100 4 T 150 4 L 150 20 L 0 20 Z;
                      M 0 4 Q 25 8 50 4 T 100 4 T 150 4 L 150 20 L 0 20 Z;
                      M 0 4 Q 25 -2 50 4 T 100 4 T 150 4 L 150 20 L 0 20 Z"
                  />
                </path>
                <path
                  d="M 0 6 Q 25 0 50 6 T 100 6 T 150 6 L 150 20 L 0 20 Z"
                  fill={cfg.color}
                  opacity="0.9"
                >
                  <animate
                    attributeName="d"
                    dur="4s"
                    repeatCount="indefinite"
                    values="
                      M 0 6 Q 25 10 50 6 T 100 6 T 150 6 L 150 20 L 0 20 Z;
                      M 0 6 Q 25 0 50 6 T 100 6 T 150 6 L 150 20 L 0 20 Z;
                      M 0 6 Q 25 10 50 6 T 100 6 T 150 6 L 150 20 L 0 20 Z"
                  />
                </path>
              </g>
            )}

            {/* Bubbles */}
            {pct > 15 && [0, 1, 2].map((i) => (
              <circle
                key={i}
                cx={25 + i * 25}
                cy="110"
                r={1 + (i % 2) * 0.5}
                fill="white"
                opacity="0.6"
              >
                <animate
                  attributeName="cy"
                  from="110"
                  to={115 - fillHeight + 4}
                  dur={`${2.5 + i * 0.7}s`}
                  repeatCount="indefinite"
                  begin={`${i * 0.4}s`}
                />
                <animate
                  attributeName="opacity"
                  values="0;0.8;0"
                  dur={`${2.5 + i * 0.7}s`}
                  repeatCount="indefinite"
                  begin={`${i * 0.4}s`}
                />
              </circle>
            ))}
          </g>

          {/* Tank body re-outline for cleanness */}
          <path
            d="M 15 15 Q 15 10 20 10 L 80 10 Q 85 10 85 15 L 85 105 Q 85 110 80 110 L 20 110 Q 15 110 15 105 Z"
            fill="none"
            stroke={cfg.color}
            strokeWidth="1.2"
          />

          {/* Scale ticks right side */}
          {[25, 50, 75].map((y, i) => (
            <g key={i}>
              <line x1="85" y1={10 + y} x2="90" y2={10 + y} stroke={cfg.color} strokeOpacity="0.6" strokeWidth="0.8" />
              <text x="92" y={10 + y + 2} fontSize="5" fill={cfg.color} fillOpacity="0.5" fontFamily="IBM Plex Mono">
                {100 - y}
              </text>
            </g>
          ))}

          {/* Critical-low warning blink when below 25% */}
          {pct < 25 && (
            <text x="50" y="65" textAnchor="middle" fontSize="7" fill="#FF3D00" fontFamily="IBM Plex Mono" fontWeight="700">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" />
              LOW
            </text>
          )}
        </svg>
      </div>

      {/* Footer status */}
      <div className="flex items-center justify-between mt-1">
        <span className="label-mono text-[9px]">
          {status === "high" ? "NOMINAL" : status === "mid" ? "MODERATE" : "CRITICAL"}
        </span>
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: status === "high" ? "#00E676" : status === "mid" ? "#FFC400" : "#FF3D00",
            boxShadow: `0 0 8px ${status === "high" ? "#00E676" : status === "mid" ? "#FFC400" : "#FF3D00"}`,
          }}
        />
      </div>
    </div>
  );
}

export { TANK_CONFIG };
