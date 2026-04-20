import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const EditAuthContext = createContext({
  canEdit: false, user: null, openLogin: () => {}, closeLogin: () => {}, logout: async () => {}, refresh: async () => {},
});

export function EditAuthProvider({ children }) {
  const [canEdit, setCanEdit] = useState(false);
  const [user, setUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // fn to run after successful login

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/edit-status");
      setCanEdit(!!data.can_edit);
      if (data.can_edit) {
        setUser({ email: data.email, full_name: data.full_name, role: data.role });
      } else {
        setUser(null);
      }
    } catch {
      setCanEdit(false);
      setUser(null);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const openLogin = (action) => {
    setPendingAction(() => action || null);
    setModalOpen(true);
  };
  const closeLogin = () => { setModalOpen(false); setPendingAction(null); };

  const onLoginSuccess = async () => {
    await refresh();
    setModalOpen(false);
    if (pendingAction) {
      const fn = pendingAction;
      setPendingAction(null);
      try { await fn(); } catch (e) { console.error(e); }
    }
  };

  const logout = async () => {
    try { await api.post("/auth/edit-logout"); } catch {}
    setCanEdit(false); setUser(null);
  };

  return (
    <EditAuthContext.Provider value={{ canEdit, user, openLogin, closeLogin, logout, refresh }}>
      {children}
      {modalOpen && <EditLoginModal onClose={closeLogin} onSuccess={onLoginSuccess} />}
    </EditAuthContext.Provider>
  );
}

export const useEditAuth = () => useContext(EditAuthContext);


function EditLoginModal({ onClose, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      await api.post("/auth/edit-login", { email, password });
      setLoading(false);
      onSuccess();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Login gagal");
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="edit-login-modal"
    >
      <div
        className="w-full max-w-md bg-[#0A0C10] border border-[#00E5FF] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-[#212530] bg-[#080A0E] flex items-center justify-between">
          <div className="label-mono text-[#00E5FF]">// ADMIN LOGIN — EDIT KONIS</div>
          <button onClick={onClose} data-testid="close-modal-btn" className="text-[#8A94A6] hover:text-[#F1F5F9]">✕</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <p className="text-xs text-[#8A94A6] leading-relaxed mb-2">
            Untuk mengedit data KONIS, login dengan akun <span className="mono text-[#00E5FF]">admin</span> atau
            <span className="mono text-[#00E5FF]"> super_user</span> dari k3ics.online.
          </p>
          <div>
            <label className="label-mono block mb-2">Email k3ics</label>
            <input
              required type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="edit-email"
              className="w-full bg-[#050608] border border-[#212530] px-3 py-2.5 text-sm focus:border-[#00E5FF] focus:outline-none mono"
              placeholder="admin@koarmada3.com"
              autoFocus
            />
          </div>
          <div>
            <label className="label-mono block mb-2">Password</label>
            <input
              required type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="edit-password"
              className="w-full bg-[#050608] border border-[#212530] px-3 py-2.5 text-sm focus:border-[#00E5FF] focus:outline-none mono"
              placeholder="••••••••"
            />
          </div>
          {err && (
            <div className="border border-[#FF3D00]/40 bg-[#FF3D00]/5 p-3 text-xs text-[#FF3D00] mono" data-testid="edit-error">
              {err}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={loading} data-testid="edit-submit" className="tactical-btn tactical-btn-primary flex-1 disabled:opacity-50">
              {loading ? "MEMERIKSA..." : "LOGIN & EDIT"}
            </button>
            <button type="button" onClick={onClose} className="tactical-btn">BATAL</button>
          </div>
          <div className="text-xs text-[#8A94A6] mono text-center pt-2">
            Password diverifikasi ke <span className="text-[#00E5FF]">k3ics.online</span> (aman, tidak disimpan).
          </div>
        </form>
      </div>
    </div>
  );
}
