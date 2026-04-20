import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Ship, Building2, Brain, Anchor, Radar, LogOut, Sun, Moon, TrendingUp } from "lucide-react";
import { api } from "../lib/api";
import { useTheme } from "../context/ThemeContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/kapal", label: "Kapal / KRI", icon: Ship, testid: "nav-kapal" },
  { to: "/pangkalan", label: "Pangkalan", icon: Building2, testid: "nav-pangkalan" },
  { to: "/history", label: "History", icon: TrendingUp, testid: "nav-history" },
  { to: "/ai-analysis", label: "AI KONIS", icon: Brain, testid: "nav-ai" },
];

export default function Layout({ children }) {
  const location = useLocation();
  const { theme, toggle } = useTheme();

  const handleExit = async () => {
    try {
      const { data } = await api.post("/sso/logout");
      window.location.href = data?.redirect || "https://k3ics.online";
    } catch {
      window.location.href = "https://k3ics.online";
    }
  };

  return (
    <div className="min-h-screen bg-[#050608] flex text-[#F1F5F9]">
      <aside className="w-64 border-r border-[#212530] bg-[#080A0E] flex flex-col sticky top-0 h-screen" data-testid="sidebar">
        <div className="p-6 border-b border-[#212530] relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-[#00E5FF] flex items-center justify-center pulse-glow">
              <Anchor size={20} className="text-[#00E5FF]" />
            </div>
            <div>
              <div className="heading text-lg font-bold leading-none glow-cyan text-[#00E5FF]">LOGISTIC3</div>
              <div className="label-mono mt-1">KOARMADA 3 OPS</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <div className="label-mono mb-3 px-2">Navigation</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                data-testid={item.testid}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-all border-l-2 ${
                  active
                    ? "border-[#00E5FF] bg-[#00E5FF]/5 text-[#00E5FF]"
                    : "border-transparent text-[#8A94A6] hover:text-[#F1F5F9] hover:bg-[#101216]"
                }`}
              >
                <Icon size={16} />
                <span className="mono uppercase tracking-wider text-xs">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#212530]">
          <div className="mb-3">
            <div className="label-mono">Session</div>
            <div className="text-xs text-[#00E5FF] mono mt-1">via K3ICS.ONLINE</div>
          </div>
          <button
            onClick={handleExit}
            data-testid="exit-btn"
            className="tactical-btn w-full flex items-center justify-center gap-2"
          >
            <LogOut size={14} /> Kembali ke K3ICS
          </button>
        </div>
      </aside>

      <main className="flex-1 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 border-b border-[#212530] bg-[#080A0E]/80 backdrop-blur-sm z-10 px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radar size={14} className="text-[#00E5FF] animate-pulse" />
            <span className="label-mono text-[#00E5FF]">SYSTEM ONLINE</span>
            <span className="label-mono text-[#8A94A6]">// {new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="label-mono text-[#8A94A6]">SORONG · PAPUA BARAT DAYA</span>
            <button
              onClick={toggle}
              data-testid="theme-toggle"
              title="Toggle Light/Dark"
              className="p-1.5 border border-[#212530] hover:border-[#00E5FF] text-[#00E5FF] transition-all"
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
        </div>
        <div className="pt-16 min-h-screen">{children}</div>
      </main>
    </div>
  );
}
