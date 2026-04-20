import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { ArrowLeft, Plus, X, Upload, Save, User, Lock } from "lucide-react";
import { useEditAuth } from "../context/EditAuthContext";

const EMPTY_LOGISTICS = { bahan_bakar: 0, air_bersih: 0, fresh_room: 0, minyak_lincir: 0, amunisi: 0, ransum: 0 };

export default function AssetForm({ type }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    type,
    name: "",
    code: "",
    description: "",
    location: "",
    commander: "",
    konis_status: "siap",
    readiness_percentage: 100,
    images: [],
    specifications: {},
    logistics: { ...EMPTY_LOGISTICS },
    personnel: [],
    weapon_systems: [],
  });
  const [specRows, setSpecRows] = useState([{ key: "", value: "" }]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const { canEdit: hasEditAuth, openLogin } = useEditAuth();

  useEffect(() => {
    if (isEdit && hasEditAuth) {
      api.get(`/assets/${id}`).then(({ data }) => {
        setForm({ ...data, logistics: { ...EMPTY_LOGISTICS, ...data.logistics } });
        setSpecRows(
          Object.keys(data.specifications || {}).length
            ? Object.entries(data.specifications).map(([k, v]) => ({ key: k, value: String(v) }))
            : [{ key: "", value: "" }]
        );
      });
    }
  }, [id, isEdit, hasEditAuth]);

  if (!hasEditAuth) {
    return (
      <div className="p-8" data-testid="form-locked">
        <div className="max-w-md mx-auto border border-[#FFC400]/40 bg-[#FFC400]/5 p-6 text-center mt-12">
          <Lock size={32} className="mx-auto mb-3 text-[#FFC400]" />
          <div className="heading text-xl font-bold mb-2">EDIT DIKUNCI</div>
          <p className="text-sm text-[#8A94A6] mb-4">
            Halaman ini hanya bisa diakses oleh <span className="mono text-[#00E5FF]">admin</span> atau
            <span className="mono text-[#00E5FF]"> super_user</span> dari k3ics.online.
          </p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => openLogin()} className="tactical-btn tactical-btn-primary" data-testid="locked-login-btn">
              LOGIN UNTUK EDIT
            </button>
            <button onClick={() => navigate(`/${type}`)} className="tactical-btn">
              KEMBALI
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setForm((prev) => ({ ...prev, images: [...prev.images, ev.target.result] }));
      };
      reader.readAsDataURL(f);
    });
  };

  const removeImage = (i) => setForm({ ...form, images: form.images.filter((_, idx) => idx !== i) });

  const addSpec = () => setSpecRows([...specRows, { key: "", value: "" }]);
  const updateSpec = (i, k, v) => {
    const n = [...specRows];
    n[i][k] = v;
    setSpecRows(n);
  };
  const removeSpec = (i) => setSpecRows(specRows.filter((_, idx) => idx !== i));

  const addPersonnel = () => setForm({
    ...form,
    personnel: [...form.personnel, { id: crypto.randomUUID(), name: "", rank: "", position: "", photo: null }],
  });
  const updatePersonnel = (i, key, value) => {
    const n = [...form.personnel];
    n[i][key] = value;
    setForm({ ...form, personnel: n });
  };
  const uploadPersonnelPhoto = (i, e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => updatePersonnel(i, "photo", ev.target.result);
    r.readAsDataURL(f);
  };
  const removePersonnel = (i) => setForm({ ...form, personnel: form.personnel.filter((_, idx) => idx !== i) });

  const addWeapon = () => setForm({
    ...form,
    weapon_systems: [...form.weapon_systems, { id: crypto.randomUUID(), name: "", type: "", status: "siap", notes: "" }],
  });
  const updateWeapon = (i, key, value) => {
    const n = [...form.weapon_systems];
    n[i][key] = value;
    setForm({ ...form, weapon_systems: n });
  };
  const removeWeapon = (i) => setForm({ ...form, weapon_systems: form.weapon_systems.filter((_, idx) => idx !== i) });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const specs = {};
      specRows.forEach((r) => r.key && (specs[r.key] = r.value));
      const payload = { ...form, type, specifications: specs, readiness_percentage: Number(form.readiness_percentage) };
      if (isEdit) {
        await api.put(`/assets/${id}`, payload);
      } else {
        await api.post("/assets", payload);
      }
      navigate(`/${type}`);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-[#050608] border border-[#212530] px-3 py-2 text-sm focus:border-[#00E5FF] focus:outline-none mono";

  return (
    <div className="p-8 pb-16 max-w-5xl" data-testid="asset-form-page">
      <button
        onClick={() => navigate(`/${type}`)}
        className="label-mono text-[#8A94A6] hover:text-[#00E5FF] flex items-center gap-2 mb-4"
        data-testid="form-back-btn"
      >
        <ArrowLeft size={14} /> Kembali
      </button>

      <div className="mb-8">
        <div className="label-mono text-[#00E5FF] mb-2">// {isEdit ? "EDIT" : "REGISTER"} ASSET</div>
        <h1 className="heading text-3xl sm:text-4xl font-bold">
          {isEdit ? "Edit" : "Daftar"} {type === "kapal" ? "Kapal (KRI)" : "Pangkalan"}
        </h1>
      </div>

      <form onSubmit={submit} className="space-y-6" data-testid="asset-form">
        {/* Basic */}
        <div className="border border-[#212530] bg-[#0A0C10] p-6">
          <div className="label-mono text-[#00E5FF] mb-4">BASIC INFORMATION</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-mono block mb-2">Nama Aset *</label>
              <input required data-testid="form-name" className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label-mono block mb-2">Kode *</label>
              <input required data-testid="form-code" className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div>
              <label className="label-mono block mb-2">Lokasi</label>
              <input data-testid="form-location" className={inputCls} value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
              <label className="label-mono block mb-2">Komandan</label>
              <input data-testid="form-commander" className={inputCls} value={form.commander || ""} onChange={(e) => setForm({ ...form, commander: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="label-mono block mb-2">Deskripsi</label>
              <textarea rows="3" data-testid="form-description" className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
        </div>

        {/* KONIS */}
        <div className="border border-[#212530] bg-[#0A0C10] p-6">
          <div className="label-mono text-[#00E5FF] mb-4">KONIS & READINESS</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-mono block mb-2">Status KONIS</label>
              <select data-testid="form-konis" className={inputCls} value={form.konis_status} onChange={(e) => setForm({ ...form, konis_status: e.target.value })}>
                <option value="siap">Siap</option>
                <option value="siap_terbatas">Siap Terbatas</option>
                <option value="tidak_siap">Tidak Siap</option>
              </select>
            </div>
            <div>
              <label className="label-mono block mb-2">Kesiapan (%)</label>
              <input type="number" min="0" max="100" data-testid="form-readiness" className={inputCls} value={form.readiness_percentage} onChange={(e) => setForm({ ...form, readiness_percentage: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Logistics */}
        <div className="border border-[#212530] bg-[#0A0C10] p-6">
          <div className="label-mono text-[#00E5FF] mb-4">KONDISI LOGISTIK (%)</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.keys(EMPTY_LOGISTICS).map((k) => (
              <div key={k}>
                <label className="label-mono block mb-2">{k.replace(/_/g, " ")}</label>
                <input
                  type="number" min="0" max="100"
                  data-testid={`form-logistik-${k}`}
                  className={inputCls}
                  value={form.logistics[k]}
                  onChange={(e) => setForm({ ...form, logistics: { ...form.logistics, [k]: Number(e.target.value) } })}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Images */}
        <div className="border border-[#212530] bg-[#0A0C10] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="label-mono text-[#00E5FF]">GAMBAR ASET</div>
            <label className="tactical-btn flex items-center gap-2 cursor-pointer" data-testid="upload-img-btn">
              <Upload size={14} /> UPLOAD
              <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
            </label>
          </div>
          {form.images.length === 0 ? (
            <div className="text-sm text-[#8A94A6] border border-dashed border-[#212530] p-6 text-center">
              Belum ada gambar. Upload gambar atau gunakan URL.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {form.images.map((img, i) => (
                <div key={i} className="relative group border border-[#212530]">
                  <img src={img} alt="" className="w-full h-24 object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-[#FF3D00] text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3">
            <label className="label-mono block mb-2">Atau tambah via URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://..."
                className={inputCls}
                id="img-url-input"
              />
              <button
                type="button"
                className="tactical-btn"
                onClick={() => {
                  const el = document.getElementById("img-url-input");
                  if (el.value) {
                    setForm({ ...form, images: [...form.images, el.value] });
                    el.value = "";
                  }
                }}
              >
                ADD
              </button>
            </div>
          </div>
        </div>

        {/* Specs */}
        <div className="border border-[#212530] bg-[#0A0C10] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="label-mono text-[#00E5FF]">SPESIFIKASI</div>
            <button type="button" onClick={addSpec} className="tactical-btn flex items-center gap-2">
              <Plus size={14} /> TAMBAH
            </button>
          </div>
          <div className="space-y-2">
            {specRows.map((row, i) => (
              <div key={i} className="flex gap-2">
                <input placeholder="nama spek" className={inputCls} value={row.key} onChange={(e) => updateSpec(i, "key", e.target.value)} />
                <input placeholder="nilai" className={inputCls} value={row.value} onChange={(e) => updateSpec(i, "value", e.target.value)} />
                <button type="button" onClick={() => removeSpec(i)} className="tactical-btn tactical-btn-danger">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Weapons */}
        <div className="border border-[#212530] bg-[#0A0C10] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="label-mono text-[#00E5FF]">SISTEM SENJATA / KEMAMPUAN</div>
            <button type="button" onClick={addWeapon} className="tactical-btn flex items-center gap-2">
              <Plus size={14} /> TAMBAH
            </button>
          </div>
          <div className="space-y-3">
            {form.weapon_systems.map((w, i) => (
              <div key={w.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start border border-[#212530] p-3">
                <input placeholder="Nama" className={`md:col-span-4 ${inputCls}`} value={w.name} onChange={(e) => updateWeapon(i, "name", e.target.value)} />
                <input placeholder="Tipe" className={`md:col-span-2 ${inputCls}`} value={w.type} onChange={(e) => updateWeapon(i, "type", e.target.value)} />
                <select className={`md:col-span-2 ${inputCls}`} value={w.status} onChange={(e) => updateWeapon(i, "status", e.target.value)}>
                  <option value="siap">Siap</option>
                  <option value="siap_terbatas">Siap Terbatas</option>
                  <option value="tidak_siap">Tidak Siap</option>
                </select>
                <input placeholder="Catatan" className={`md:col-span-3 ${inputCls}`} value={w.notes} onChange={(e) => updateWeapon(i, "notes", e.target.value)} />
                <button type="button" onClick={() => removeWeapon(i)} className="tactical-btn tactical-btn-danger md:col-span-1">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Personnel (for pangkalan) */}
        {type === "pangkalan" && (
          <div className="border border-[#212530] bg-[#0A0C10] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="label-mono text-[#00E5FF]">STAFF PERSONIL</div>
              <button type="button" onClick={addPersonnel} className="tactical-btn flex items-center gap-2">
                <Plus size={14} /> TAMBAH
              </button>
            </div>
            <div className="space-y-3">
              {form.personnel.map((p, i) => (
                <div key={p.id} className="flex gap-3 items-start border border-[#212530] p-3">
                  <label className="w-14 h-14 border border-[#212530] flex items-center justify-center cursor-pointer overflow-hidden flex-shrink-0">
                    {p.photo ? <img src={p.photo} alt="" className="w-full h-full object-cover" /> : <User size={20} className="text-[#8A94A6]" />}
                    <input type="file" accept="image/*" onChange={(e) => uploadPersonnelPhoto(i, e)} className="hidden" />
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 flex-1">
                    <input placeholder="Nama" className={inputCls} value={p.name} onChange={(e) => updatePersonnel(i, "name", e.target.value)} />
                    <input placeholder="Pangkat" className={inputCls} value={p.rank} onChange={(e) => updatePersonnel(i, "rank", e.target.value)} />
                    <input placeholder="Jabatan" className={inputCls} value={p.position} onChange={(e) => updatePersonnel(i, "position", e.target.value)} />
                  </div>
                  <button type="button" onClick={() => removePersonnel(i)} className="tactical-btn tactical-btn-danger">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {err && (
          <div className="border border-[#FF3D00]/40 bg-[#FF3D00]/5 p-3 text-sm text-[#FF3D00] mono" data-testid="form-error">{err}</div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={loading} data-testid="form-submit" className="tactical-btn tactical-btn-primary flex items-center gap-2 disabled:opacity-50">
            <Save size={14} /> {loading ? "MENYIMPAN..." : "SIMPAN"}
          </button>
          <button type="button" onClick={() => navigate(`/${type}`)} className="tactical-btn" data-testid="form-cancel">
            BATAL
          </button>
        </div>
      </form>
    </div>
  );
}
