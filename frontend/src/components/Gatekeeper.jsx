import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Anchor, AlertOctagon, ExternalLink, Loader2 } from "lucide-react";

/**
 * Gatekeeper - SSO entry controller.
 *
 * Flow:
 *  1) Kalau URL mengandung `?sso=<token>` → POST /api/sso/enter → set cookie → clean URL
 *  2) GET /api/sso/check → { authorized, login_url }
 *  3) Kalau authorized → render children (app)
 *  4) Kalau tidak → tampilkan halaman "Access Denied" dengan link ke k3ics.online
 */
export default function Gatekeeper({ children }) {
  const [state, setState] = useState({ loading: true, authorized: false, loginUrl: "https://k3ics.online", error: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const ssoToken = params.get("sso");

        if (ssoToken) {
          try {
            await api.post("/sso/enter", { sso: ssoToken });
          } catch (e) {
            // Token invalid/expired — fall through to check (will be unauthorized)
            console.warn("SSO token rejected:", e?.response?.data?.detail);
          }
          // Clean URL (remove sso param)
          params.delete("sso");
          const newQs = params.toString();
          const newUrl = window.location.pathname + (newQs ? `?${newQs}` : "") + window.location.hash;
          window.history.replaceState({}, "", newUrl);
        }

        const { data } = await api.get("/sso/check");
        if (cancelled) return;
        setState({ loading: false, authorized: !!data.authorized, loginUrl: data.login_url || "https://k3ics.online", error: null });
      } catch (e) {
        if (cancelled) return;
        setState({ loading: false, authorized: false, loginUrl: "https://k3ics.online", error: e?.message || "gagal memverifikasi session" });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (state.loading) {
    return (
      <div className="min-h-screen bg-[#050608] flex items-center justify-center" data-testid="gatekeeper-loading">
        <div className="flex items-center gap-3 text-[#00E5FF]">
          <Loader2 size={20} className="animate-spin" />
          <span className="mono uppercase tracking-wider text-sm">Verifikasi session...</span>
        </div>
      </div>
    );
  }

  if (!state.authorized) {
    return (
      <div className="min-h-screen bg-[#050608] grid-bg flex items-center justify-center p-6 relative overflow-hidden" data-testid="gatekeeper-blocked">
        <div className="scan-line-anim" />
        <div className="w-full max-w-lg border border-[#FF3D00]/40 bg-[#0A0C10] relative">
          <div className="px-5 py-3 border-b border-[#FF3D00]/40 bg-[#FF3D00]/5 flex items-center gap-2">
            <AlertOctagon size={16} className="text-[#FF3D00]" />
            <span className="label-mono text-[#FF3D00]">ACCESS DENIED — UNAUTHORIZED</span>
          </div>
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 border border-[#00E5FF] flex items-center justify-center pulse-glow">
                <Anchor size={22} className="text-[#00E5FF]" />
              </div>
              <div>
                <div className="heading text-2xl font-bold text-[#00E5FF] glow-cyan">LOGISTIC3</div>
                <div className="label-mono mt-1">KOARMADA 3 TACTICAL OPS</div>
              </div>
            </div>

            <p className="text-sm text-[#F1F5F9] leading-relaxed mb-2">
              Aplikasi ini merupakan bagian dari ekosistem <span className="mono text-[#00E5FF]">K3ICS</span>.
            </p>
            <p className="text-sm text-[#8A94A6] leading-relaxed mb-6">
              Akses langsung ke <span className="mono">logistic3.tech</span> tidak diperbolehkan.
              Silakan login terlebih dahulu melalui portal <span className="mono text-[#00E5FF]">k3ics.online</span>,
              lalu buka Logistic3 dari menu yang tersedia.
            </p>

            <a
              href={state.loginUrl}
              data-testid="goto-k3ics-btn"
              className="tactical-btn tactical-btn-primary w-full flex items-center justify-center gap-2"
            >
              <ExternalLink size={14} /> LOGIN VIA K3ICS.ONLINE
            </a>

            <div className="mt-6 pt-4 border-t border-[#212530] text-xs text-[#8A94A6] mono">
              <div className="label-mono mb-1">CLASSIFICATION</div>
              Restricted Area · TNI AL Koarmada 3
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
