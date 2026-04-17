import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { PanelCard, StatusBadge } from "../components/Tactical";
import { Brain, Radar, Ship, Building2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function AIAnalysis() {
  const [assets, setAssets] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState("");
  const [displayed, setDisplayed] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/assets").then((r) => setAssets(r.data));
  }, []);

  useEffect(() => {
    if (!result) return setDisplayed("");
    setDisplayed("");
    let i = 0;
    const t = setInterval(() => {
      i++;
      setDisplayed(result.slice(0, i));
      if (i >= result.length) clearInterval(t);
    }, 8);
    return () => clearInterval(t);
  }, [result]);

  const run = async () => {
    if (!selectedId) { setErr("Pilih aset terlebih dahulu"); return; }
    setErr("");
    setResult("");
    setLoading(true);
    try {
      const { data } = await api.post("/ai-analysis", {
        asset_id: selectedId,
        question: question || null,
      });
      setResult(data.analysis);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Analisa gagal");
    } finally {
      setLoading(false);
    }
  };

  const selected = assets.find((a) => a.id === selectedId);

  return (
    <div className="p-8 pb-16" data-testid="ai-analysis-page">
      <div className="mb-8">
        <div className="label-mono text-[#00E5FF] mb-2 flex items-center gap-2">
          <Sparkles size={12} /> // CLAUDE SONNET 4.5 TACTICAL ENGINE
        </div>
        <h1 className="heading text-4xl sm:text-5xl font-bold">AI KONIS Analyzer</h1>
        <p className="text-[#8A94A6] mt-2">Analisa kondisi teknis dan rekomendasi operasional berbasis AI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="space-y-6">
          <PanelCard title="SELECT ASSET" testid="asset-selector">
            <label className="label-mono block mb-2">Aset</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              data-testid="asset-select"
              className="w-full bg-[#050608] border border-[#212530] px-3 py-2.5 text-sm focus:border-[#00E5FF] focus:outline-none mono mb-4"
            >
              <option value="">-- Pilih Aset --</option>
              <optgroup label="KAPAL">
                {assets.filter((a) => a.type === "kapal").map((a) => (
                  <option key={a.id} value={a.id}>{`${a.code} · ${a.name}`}</option>
                ))}
              </optgroup>
              <optgroup label="PANGKALAN">
                {assets.filter((a) => a.type === "pangkalan").map((a) => (
                  <option key={a.id} value={a.id}>{`${a.code} · ${a.name}`}</option>
                ))}
              </optgroup>
            </select>

            <label className="label-mono block mb-2">Pertanyaan (opsional)</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows="3"
              data-testid="ai-question"
              placeholder="Contoh: Apakah aset siap untuk operasi patroli 30 hari?"
              className="w-full bg-[#050608] border border-[#212530] px-3 py-2.5 text-sm focus:border-[#00E5FF] focus:outline-none mono mb-4"
            />

            <button
              onClick={run}
              disabled={loading || !selectedId}
              data-testid="ai-run-btn"
              className="tactical-btn tactical-btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Brain size={14} /> {loading ? "ANALYZING..." : "RUN ANALYSIS"}
            </button>

            {err && <div className="mt-3 text-xs text-[#FF3D00] mono">{err}</div>}
          </PanelCard>

          {selected && (
            <PanelCard title="TARGET ASSET" testid="target-preview">
              <div className="flex items-start gap-3 mb-3">
                {selected.type === "kapal" ? <Ship size={18} className="text-[#00E5FF] mt-0.5" /> : <Building2 size={18} className="text-[#00E5FF] mt-0.5" />}
                <div className="flex-1">
                  <div className="label-mono text-[#00E5FF]">{selected.code}</div>
                  <div className="font-semibold">{selected.name}</div>
                  <div className="text-xs text-[#8A94A6] mt-1">{selected.location}</div>
                </div>
              </div>
              <div className="mb-3"><StatusBadge status={selected.konis_status} size="sm" /></div>
              <div className="text-xs text-[#8A94A6]">Readiness: <span className="text-[#00E5FF] mono">{selected.readiness_percentage}%</span></div>
            </PanelCard>
          )}
        </div>

        {/* Output */}
        <div className="lg:col-span-2">
          <div className="tracing-border h-full">
            <div className="px-4 py-2.5 border-b border-[#212530] bg-[#080A0E] flex items-center justify-between">
              <div className="label-mono text-[#00E5FF] flex items-center gap-2">
                <Brain size={12} /> ANALYSIS OUTPUT
              </div>
              {loading && (
                <div className="label-mono text-[#00E5FF] flex items-center gap-2">
                  <Radar size={10} className="animate-spin" /> PROCESSING
                </div>
              )}
            </div>
            <div className="p-6 min-h-[500px]">
              {!result && !loading && (
                <div className="h-full flex items-center justify-center text-center py-20">
                  <div>
                    <Brain size={60} className="mx-auto mb-4 text-[#212530]" />
                    <div className="label-mono text-[#8A94A6]">AWAITING TACTICAL QUERY</div>
                    <div className="text-xs text-[#8A94A6] mono mt-2">Pilih aset dan jalankan analisa AI.</div>
                  </div>
                </div>
              )}
              {loading && (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                      className="h-3 bg-[#212530]"
                      style={{ width: `${60 + Math.random() * 40}%` }}
                    />
                  ))}
                </div>
              )}
              {displayed && (
                <div
                  className="text-sm leading-relaxed whitespace-pre-wrap typewriter-caret"
                  data-testid="ai-result"
                >
                  {displayed}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
