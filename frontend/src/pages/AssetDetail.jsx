import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api";
import { StatusBadge, ReadinessBar, PanelCard } from "../components/Tactical";
import ShipViewer3D from "../components/ShipViewer3D";
import LogisticsTank from "../components/LogisticsTank";
import {
  ArrowLeft, Edit, Trash2, Brain, Anchor, MapPin, User, Ship, Building2, Users, Radar, Target, Save, PencilLine,
} from "lucide-react";
import { motion } from "framer-motion";

export default function AssetDetail() {
  const { id, type } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [displayedText, setDisplayedText] = useState("");

  const canEdit = true;
  const canDelete = true;
  const [editBasic, setEditBasic] = useState(false);
  const [basicForm, setBasicForm] = useState({ description: "", location: "", commander: "" });

  const startEditBasic = () => {
    setBasicForm({
      description: asset?.description || "",
      location: asset?.location || "",
      commander: asset?.commander || "",
    });
    setEditBasic(true);
  };

  const saveBasic = async () => {
    const payload = { ...asset, ...basicForm };
    const { data } = await api.put(`/assets/${id}`, payload);
    setAsset(data);
    setEditBasic(false);
  };

  const load = () => {
    setLoading(true);
    api.get(`/assets/${id}`).then((r) => setAsset(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  // Typewriter effect
  useEffect(() => {
    if (!aiResult) return setDisplayedText("");
    setDisplayedText("");
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayedText(aiResult.slice(0, i));
      if (i >= aiResult.length) clearInterval(interval);
    }, 8);
    return () => clearInterval(interval);
  }, [aiResult]);

  const runAI = async () => {
    setAiLoading(true);
    setAiResult("");
    try {
      const { data } = await api.post("/ai-analysis", { asset_id: id });
      setAiResult(data.analysis);
    } catch (e) {
      setAiResult(`[ERROR] ${e?.response?.data?.detail || "Gagal menghasilkan analisa"}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Hapus ${asset.name}?`)) return;
    await api.delete(`/assets/${id}`);
    navigate(`/${type}`);
  };

  if (loading || !asset) {
    return <div className="p-8 label-mono text-[#00E5FF]">LOADING ASSET DATA...</div>;
  }

  const Icon = asset.type === "kapal" ? Ship : Building2;

  return (
    <div className="p-8 pb-16" data-testid="asset-detail-page">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div className="flex-1">
          <button
            onClick={() => navigate(`/${asset.type}`)}
            className="label-mono text-[#8A94A6] hover:text-[#00E5FF] flex items-center gap-2 mb-3"
            data-testid="back-btn"
          >
            <ArrowLeft size={14} /> Kembali
          </button>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-12 h-12 border border-[#00E5FF] flex items-center justify-center">
              <Icon size={22} className="text-[#00E5FF]" />
            </div>
            <div>
              <div className="label-mono text-[#00E5FF]">{asset.code} // {asset.type.toUpperCase()}</div>
              <h1 className="heading text-3xl sm:text-4xl font-bold">{asset.name}</h1>
            </div>
            <div className="ml-auto"><StatusBadge status={asset.konis_status} /></div>
          </div>
          <div className="flex items-center gap-6 mt-4 text-sm text-[#8A94A6]">
            {asset.location && (
              <div className="flex items-center gap-2"><MapPin size={14} /> {asset.location}</div>
            )}
            {asset.commander && (
              <div className="flex items-center gap-2"><User size={14} /> {asset.commander}</div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {canEdit && (
            <>
              <button
                onClick={startEditBasic}
                data-testid="edit-basic-btn"
                className="tactical-btn flex items-center gap-2"
                title="Edit info dasar inline"
              >
                <PencilLine size={14} /> EDIT INFO
              </button>
              <button
                onClick={() => navigate(`/${type}/${id}/edit`)}
                data-testid="edit-btn"
                className="tactical-btn tactical-btn-primary flex items-center gap-2"
              >
                <Edit size={14} /> ISI / EDIT DATA LENGKAP
              </button>
            </>
          )}
          {canDelete && (
            <button
              onClick={handleDelete}
              data-testid="delete-btn"
              className="tactical-btn tactical-btn-danger flex items-center gap-2"
            >
              <Trash2 size={14} /> HAPUS
            </button>
          )}
        </div>
      </div>

      {/* Inline Basic Info Editor */}
      {editBasic && (
        <div className="mb-6 border border-[#00E5FF] bg-[#00E5FF]/5 p-5" data-testid="basic-editor">
          <div className="label-mono text-[#00E5FF] mb-4 flex items-center gap-2">
            <PencilLine size={12} /> EDIT INFO DASAR
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="label-mono block mb-1">Lokasi</label>
              <input
                value={basicForm.location}
                onChange={(e) => setBasicForm({ ...basicForm, location: e.target.value })}
                data-testid="basic-location"
                className="w-full bg-[#050608] border border-[#212530] px-3 py-2 text-sm focus:border-[#00E5FF] focus:outline-none mono"
              />
            </div>
            <div>
              <label className="label-mono block mb-1">Komandan</label>
              <input
                value={basicForm.commander}
                onChange={(e) => setBasicForm({ ...basicForm, commander: e.target.value })}
                data-testid="basic-commander"
                className="w-full bg-[#050608] border border-[#212530] px-3 py-2 text-sm focus:border-[#00E5FF] focus:outline-none mono"
              />
            </div>
            <div className="md:col-span-2">
              <label className="label-mono block mb-1">Deskripsi</label>
              <textarea
                rows="3"
                value={basicForm.description}
                onChange={(e) => setBasicForm({ ...basicForm, description: e.target.value })}
                data-testid="basic-description"
                className="w-full bg-[#050608] border border-[#212530] px-3 py-2 text-sm focus:border-[#00E5FF] focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveBasic}
              data-testid="basic-save"
              className="tactical-btn tactical-btn-primary flex items-center gap-2"
            >
              <Save size={14} /> SIMPAN
            </button>
            <button
              onClick={() => setEditBasic(false)}
              data-testid="basic-cancel"
              className="tactical-btn"
            >
              BATAL
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gallery */}
          <PanelCard title="VISUAL INTELLIGENCE" testid="gallery">
            <div className="aspect-video border border-[#212530] mb-3 overflow-hidden relative">
              {asset.images?.length > 0 ? (
                <img src={asset.images[activeImg]} alt={asset.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#050608] flex items-center justify-center">
                  <Icon size={60} className="text-[#212530]" />
                </div>
              )}
              <div className="absolute top-3 left-3 label-mono text-[#00E5FF] bg-[#0A0C10]/80 px-2 py-1">
                IMG {activeImg + 1}/{asset.images?.length || 0}
              </div>
            </div>
            {asset.images?.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {asset.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`w-20 h-14 border overflow-hidden transition-all ${i === activeImg ? "border-[#00E5FF]" : "border-[#212530] opacity-50 hover:opacity-100"}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </PanelCard>

          {/* 3D Viewer */}
          <PanelCard title="3D TACTICAL MODEL" testid="3d-model">
            <div className="h-80 bg-[#050608] border border-[#212530]">
              <ShipViewer3D type={asset.type} />
            </div>
          </PanelCard>

          {/* Description & Specs */}
          <PanelCard title="DESCRIPTION & SPECIFICATIONS" testid="specs">
            <p className="text-sm leading-relaxed mb-6 text-[#F1F5F9]">{asset.description || "-"}</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {Object.entries(asset.specifications || {}).map(([k, v]) => (
                <div key={k} className="border-b border-[#212530] pb-2">
                  <div className="label-mono">{k.replace(/_/g, " ")}</div>
                  <div className="text-sm font-medium mono mt-1">{String(v)}</div>
                </div>
              ))}
            </div>
          </PanelCard>

          {/* Weapon Systems */}
          <PanelCard title="SISTEM SENJATA & KEMAMPUAN" testid="weapons">
            {asset.weapon_systems?.length === 0 ? (
              <div className="text-sm text-[#8A94A6]">Belum terdata</div>
            ) : (
              <div className="space-y-2">
                {asset.weapon_systems.map((w) => (
                  <div key={w.id} className="flex items-start gap-3 p-3 border border-[#212530] hover:border-[#00E5FF]/40 transition-all">
                    <Target size={18} className="text-[#00E5FF] mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium">{w.name}</div>
                      <div className="text-xs text-[#8A94A6] mono uppercase mt-0.5">{w.type}{w.notes && ` · ${w.notes}`}</div>
                    </div>
                    <StatusBadge status={w.status} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </PanelCard>

          {/* Personnel (for pangkalan) */}
          {asset.type === "pangkalan" && asset.personnel?.length > 0 && (
            <PanelCard title="STAFF PERSONIL" testid="personnel">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {asset.personnel.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 border border-[#212530]">
                    <div className="w-12 h-12 border border-[#00E5FF] overflow-hidden flex-shrink-0 bg-[#050608]">
                      {p.photo ? (
                        <img src={p.photo} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-full h-full p-2 text-[#00E5FF]" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{p.name}</div>
                      <div className="label-mono">{p.rank}</div>
                      <div className="text-xs text-[#8A94A6] mt-0.5">{p.position}</div>
                    </div>
                  </div>
                ))}
              </div>
            </PanelCard>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Readiness + Quick Edit */}
          <PanelCard
            title="KESIAPAN OPERASIONAL"
            testid="readiness-panel"
            right={
              <button
                onClick={() => navigate(`/${type}/${id}/edit`)}
                data-testid="quick-edit-full-btn"
                className="label-mono text-[#00E5FF] hover:text-white"
              >
                [ EDIT LENGKAP → ]
              </button>
            }
          >
            <div className="text-center py-4">
              <div className="heading text-6xl font-bold" style={{
                color: asset.readiness_percentage >= 80 ? "#00E676" : asset.readiness_percentage >= 50 ? "#FFC400" : "#FF3D00"
              }}>
                {asset.readiness_percentage}%
              </div>
              <div className="label-mono mt-2">READINESS SCORE</div>
            </div>

            {/* Quick status setter */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { k: "siap", label: "SIAP", c: "#00E676" },
                { k: "siap_terbatas", label: "TERBATAS", c: "#FFC400" },
                { k: "tidak_siap", label: "TIDAK SIAP", c: "#FF3D00" },
              ].map((s) => (
                <button
                  key={s.k}
                  data-testid={`quick-konis-${s.k}`}
                  onClick={async () => {
                    const { data } = await api.patch(`/assets/${id}/konis`, { konis_status: s.k });
                    setAsset(data);
                  }}
                  className="py-2 text-[10px] mono uppercase tracking-wider border transition-all"
                  style={{
                    borderColor: asset.konis_status === s.k ? s.c : "#212530",
                    color: asset.konis_status === s.k ? s.c : "#8A94A6",
                    background: asset.konis_status === s.k ? `${s.c}1A` : "transparent",
                    boxShadow: asset.konis_status === s.k ? `0 0 12px ${s.c}66` : "none",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Quick readiness slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="label-mono">READINESS</span>
                <span className="mono text-xs text-[#00E5FF]">{asset.readiness_percentage}%</span>
              </div>
              <input
                type="range" min="0" max="100" step="1"
                value={asset.readiness_percentage}
                data-testid="quick-readiness-slider"
                onChange={(e) => setAsset({ ...asset, readiness_percentage: Number(e.target.value) })}
                onMouseUp={async (e) => {
                  const { data } = await api.patch(`/assets/${id}/konis`, { readiness_percentage: Number(e.target.value) });
                  setAsset(data);
                }}
                onTouchEnd={async (e) => {
                  const { data } = await api.patch(`/assets/${id}/konis`, { readiness_percentage: asset.readiness_percentage });
                  setAsset(data);
                }}
                className="w-full accent-[#00E5FF]"
              />
              <ReadinessBar value={asset.readiness_percentage} />
            </div>
          </PanelCard>

          {/* Logistics with inline edit */}
          <PanelCard
            title="KONDISI LOGISTIK"
            testid="logistics-panel"
            right={
              <button
                onClick={async () => {
                  const { data } = await api.patch(`/assets/${id}/logistics`, asset.logistics);
                  setAsset(data);
                }}
                data-testid="save-logistics-btn"
                className="label-mono text-[#00E5FF] hover:text-white"
              >
                [ SIMPAN ]
              </button>
            }
          >
            <div className="grid grid-cols-2 gap-2 mb-3">
              {Object.entries(asset.logistics || {}).map(([k, v]) => (
                <LogisticsTank key={k} type={k} value={v} />
              ))}
            </div>
            <div className="space-y-2 border-t border-[#212530] pt-3">
              {Object.entries(asset.logistics || {}).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="label-mono w-32 truncate">{k.replace(/_/g, " ")}</span>
                  <input
                    type="range" min="0" max="100" step="1"
                    value={v}
                    data-testid={`slider-${k}`}
                    onChange={(e) =>
                      setAsset({ ...asset, logistics: { ...asset.logistics, [k]: Number(e.target.value) } })
                    }
                    className="flex-1 accent-[#00E5FF]"
                  />
                  <input
                    type="number" min="0" max="100"
                    value={v}
                    data-testid={`num-${k}`}
                    onChange={(e) =>
                      setAsset({ ...asset, logistics: { ...asset.logistics, [k]: Number(e.target.value) } })
                    }
                    className="w-16 bg-[#050608] border border-[#212530] px-2 py-1 text-xs text-right mono focus:border-[#00E5FF] focus:outline-none"
                  />
                </div>
              ))}
              <div className="text-xs text-[#8A94A6] mono pt-2">
                * Klik [SIMPAN] di atas untuk mengirim perubahan.
              </div>
            </div>
          </PanelCard>

          {/* AI Analysis */}
          <div className="tracing-border" data-testid="ai-panel">
            <div className="px-4 py-2.5 border-b border-[#212530] bg-[#080A0E] flex items-center justify-between">
              <div className="label-mono text-[#00E5FF] flex items-center gap-2">
                <Brain size={12} /> AI KONIS ANALYSIS
              </div>
              <button
                onClick={runAI}
                disabled={aiLoading}
                data-testid="run-ai-btn"
                className="tactical-btn tactical-btn-primary text-[10px] py-1.5 px-3 disabled:opacity-50"
              >
                {aiLoading ? "ANALYZING..." : "RUN ANALYSIS"}
              </button>
            </div>
            <div className="p-4">
              {!aiResult && !aiLoading && (
                <div className="text-sm text-[#8A94A6] leading-relaxed">
                  Klik "Run Analysis" untuk menjalankan analisa AI Claude Sonnet 4.5 atas kondisi teknis & logistik aset ini.
                </div>
              )}
              {aiLoading && (
                <div className="flex items-center gap-2 text-xs mono text-[#00E5FF]">
                  <Radar size={14} className="animate-spin" /> PROCESSING TACTICAL DATA...
                </div>
              )}
              {displayedText && (
                <div
                  className="text-sm leading-relaxed whitespace-pre-wrap text-[#F1F5F9] typewriter-caret"
                  data-testid="ai-output"
                  style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                >
                  {displayedText}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
