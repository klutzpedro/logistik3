import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Anchor, AlertCircle } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "operator" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await register(form);
      navigate("/dashboard");
    } catch (e) {
      setErr(e?.response?.data?.detail || "Registrasi gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050608] grid-bg flex items-center justify-center p-6" data-testid="register-page">
      <div className="w-full max-w-md border border-[#212530] bg-[#0A0C10] p-8 relative">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 border border-[#00E5FF] flex items-center justify-center">
            <Anchor size={18} className="text-[#00E5FF]" />
          </div>
          <div>
            <div className="heading font-bold text-[#00E5FF]">KOARMADA 3</div>
            <div className="label-mono">Registration</div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4" data-testid="register-form">
          <div>
            <label className="label-mono mb-2 block">Nama Lengkap</label>
            <input
              required
              data-testid="reg-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-[#050608] border border-[#212530] px-3 py-2.5 text-sm focus:border-[#00E5FF] focus:outline-none mono"
              placeholder="Letkol Laut (P) ..."
            />
          </div>
          <div>
            <label className="label-mono mb-2 block">Email</label>
            <input
              required
              type="email"
              data-testid="reg-email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-[#050608] border border-[#212530] px-3 py-2.5 text-sm focus:border-[#00E5FF] focus:outline-none mono"
            />
          </div>
          <div>
            <label className="label-mono mb-2 block">Password</label>
            <input
              required
              type="password"
              data-testid="reg-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-[#050608] border border-[#212530] px-3 py-2.5 text-sm focus:border-[#00E5FF] focus:outline-none mono"
            />
          </div>
          <div>
            <label className="label-mono mb-2 block">Role</label>
            <select
              data-testid="reg-role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full bg-[#050608] border border-[#212530] px-3 py-2.5 text-sm focus:border-[#00E5FF] focus:outline-none mono"
            >
              <option value="viewer">Viewer</option>
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {err && (
            <div className="flex items-start gap-2 border border-[#FF3D00]/40 bg-[#FF3D00]/5 p-3 text-xs" data-testid="register-error">
              <AlertCircle size={14} className="text-[#FF3D00] mt-0.5" />
              <span className="text-[#FF3D00] mono">{err}</span>
            </div>
          )}

          <button type="submit" disabled={loading} data-testid="register-submit" className="tactical-btn tactical-btn-primary w-full">
            {loading ? "PROCESSING..." : "REGISTER"}
          </button>

          <div className="text-center text-xs text-[#8A94A6]">
            Sudah terdaftar?{" "}
            <Link to="/login" data-testid="go-login" className="text-[#00E5FF] hover:underline mono uppercase">
              Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
