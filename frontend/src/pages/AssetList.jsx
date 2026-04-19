import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { StatusBadge, ReadinessBar } from "../components/Tactical";
import { Plus, Search, Ship, Building2 } from "lucide-react";
import { motion } from "framer-motion";

export default function AssetList({ type }) {
  const [assets, setAssets] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const canEdit = true;

  useEffect(() => {
    setLoading(true);
    api.get(`/assets?type=${type}`).then((r) => setAssets(r.data)).finally(() => setLoading(false));
  }, [type]);

  const filtered = assets.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.code.toLowerCase().includes(search.toLowerCase())
  );

  const Icon = type === "kapal" ? Ship : Building2;
  const title = type === "kapal" ? "ARMADA KAPAL (KRI)" : "PANGKALAN";

  return (
    <div className="p-8" data-testid={`${type}-list-page`}>
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="label-mono text-[#00E5FF] mb-2">// ASSET REGISTRY</div>
          <h1 className="heading text-4xl sm:text-5xl font-bold">{title}</h1>
          <p className="text-[#8A94A6] mt-2">Daftar aset {type === "kapal" ? "kapal KRI" : "pangkalan"} Koarmada 3</p>
        </div>
        {canEdit && (
          <button
            onClick={() => navigate(`/${type}/new`)}
            data-testid={`create-${type}-btn`}
            className="tactical-btn tactical-btn-primary flex items-center gap-2"
          >
            <Plus size={14} /> TAMBAH {type === "kapal" ? "KAPAL" : "PANGKALAN"}
          </button>
        )}
      </div>

      <div className="mb-6 relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A94A6]" />
        <input
          type="text"
          placeholder="Cari nama atau kode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="search-input"
          className="w-full bg-[#0A0C10] border border-[#212530] pl-10 pr-4 py-2.5 text-sm focus:border-[#00E5FF] focus:outline-none mono"
        />
      </div>

      {loading ? (
        <div className="label-mono text-[#00E5FF]">LOADING ASSETS...</div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-[#212530] p-12 text-center text-[#8A94A6]">
          <Icon size={40} className="mx-auto mb-4 opacity-40" />
          <div className="mono uppercase text-sm tracking-wider">Tidak ada aset</div>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          initial="hidden" animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        >
          {filtered.map((a) => (
            <motion.div
              key={a.id}
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              className="relative group/card"
            >
              <Link
                to={`/${type}/${a.id}`}
                data-testid={`asset-card-${a.code}`}
                className="block border border-[#212530] bg-[#0A0C10] hover:border-[#00E5FF]/60 transition-all group relative overflow-hidden"
              >
                <div className="relative h-44 overflow-hidden border-b border-[#212530]">
                  {a.images?.[0] ? (
                    <img src={a.images[0]} alt={a.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                  ) : (
                    <div className="w-full h-full bg-[#101216] flex items-center justify-center">
                      <Icon size={40} className="text-[#212530]" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0C10] via-transparent to-transparent" />
                  <div className="absolute top-3 right-3">
                    <StatusBadge status={a.konis_status} size="sm" />
                  </div>
                  <div className="absolute bottom-3 left-3 label-mono text-[#00E5FF]">{a.code}</div>
                </div>
                <div className="p-4">
                  <div className="heading text-lg font-semibold mb-1 group-hover:text-[#00E5FF] transition-colors">{a.name}</div>
                  <div className="text-xs text-[#8A94A6] mono uppercase mb-4">{a.location || "-"}</div>
                  <ReadinessBar value={a.readiness_percentage} label="READINESS" />
                </div>
              </Link>
              {canEdit && (
                <button
                  onClick={(e) => { e.preventDefault(); navigate(`/${type}/${a.id}/edit`); }}
                  data-testid={`edit-card-${a.code}`}
                  className="absolute top-3 left-3 px-2 py-1 text-[10px] mono uppercase tracking-wider border border-[#00E5FF] bg-[#050608]/80 text-[#00E5FF] opacity-0 group-hover/card:opacity-100 hover:bg-[#00E5FF] hover:text-[#050608] transition-all flex items-center gap-1 z-10"
                >
                  <Plus size={10} className="rotate-0" style={{ transform: "none" }} /> EDIT
                </button>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
