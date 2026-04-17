import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Anchor, Radar, ShieldCheck, AlertCircle } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@koarmada3.tnial.mil.id");
  const [password, setPassword] = useState("admin123");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (e) {
      setErr(e?.response?.data?.detail || "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050608] flex relative overflow-hidden" data-testid="login-page">
      {/* Background grid */}
      <div className="absolute inset-0 grid-bg opacity-50"></div>
      <div className="scan-line-anim" />

      {/* Left: visual */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center border-r border-[#212530]">
        <img
          src="https://images.unsplash.com/photo-1733195296321-b99d129b09cd"
          alt="command center"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050608] via-transparent to-[#050608]"></div>
        <div className="relative z-10 text-center p-12 max-w-lg">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-16 h-16 border border-[#00E5FF] flex items-center justify-center pulse-glow">
              <Anchor size={32} className="text-[#00E5FF]" />
            </div>
          </div>
          <h1 className="heading text-5xl font-bold mb-4 glow-cyan text-[#00E5FF]">KOARMADA 3</h1>
          <div className="label-mono mb-8 text-[#00E5FF]">NAVAL TACTICAL OPERATIONS CENTER</div>
          <p className="text-[#8A94A6] leading-relaxed">
            Sistem Monitoring dan Analisa Logistik Kapal & Pangkalan terpadu. Pantau kondisi teknis (KONIS),
            kesiapan operasional, dan logistik armada wilayah Papua dengan dukungan AI.
          </p>
          <div className="flex gap-6 justify-center mt-8">
            <div className="flex items-center gap-2 text-xs mono uppercase tracking-wider text-[#8A94A6]">
              <ShieldCheck size={14} className="text-[#00E676]" /> Secured
            </div>
            <div className="flex items-center gap-2 text-xs mono uppercase tracking-wider text-[#8A94A6]">
              <Radar size={14} className="text-[#00E5FF] animate-pulse" /> Live Intel
            </div>
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="label-mono mb-2 text-[#00E5FF]">// AUTHORIZATION REQUIRED</div>
            <h2 className="heading text-3xl font-bold">Access Terminal</h2>
            <p className="text-sm text-[#8A94A6] mt-2">Masuk ke Koarmada 3 Tactical Dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="login-form">
            <div>
              <label className="label-mono mb-2 block">Email / NRP</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="login-email"
                className="w-full bg-[#050608] border border-[#212530] px-4 py-3 text-sm focus:outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] mono transition-all"
                placeholder="komandan@koarmada3.tnial.mil.id"
              />
            </div>
            <div>
              <label className="label-mono mb-2 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="login-password"
                className="w-full bg-[#050608] border border-[#212530] px-4 py-3 text-sm focus:outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] mono transition-all"
                placeholder="••••••••"
              />
            </div>

            {err && (
              <div className="flex items-start gap-2 border border-[#FF3D00]/40 bg-[#FF3D00]/5 p-3 text-xs" data-testid="login-error">
                <AlertCircle size={14} className="text-[#FF3D00] mt-0.5" />
                <span className="text-[#FF3D00] mono">{err}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit"
              className="tactical-btn tactical-btn-primary w-full disabled:opacity-50"
            >
              {loading ? "AUTHORIZING..." : "INITIATE ACCESS"}
            </button>

            <div className="pt-4 border-t border-[#212530]">
              <div className="label-mono mb-2">Demo Credentials</div>
              <div className="text-xs mono text-[#8A94A6] space-y-1">
                <div>admin@koarmada3.tnial.mil.id / admin123</div>
                <div>operator@koarmada3.tnial.mil.id / operator123</div>
                <div>viewer@koarmada3.tnial.mil.id / viewer123</div>
              </div>
            </div>

            <div className="text-center text-xs text-[#8A94A6]">
              Belum terdaftar?{" "}
              <Link to="/register" data-testid="go-register" className="text-[#00E5FF] hover:underline mono uppercase">
                Register
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
