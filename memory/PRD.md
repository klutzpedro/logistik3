# Koarmada 3 Logistics Monitoring - PRD

## Original Problem Statement
Aplikasi MONITORING DAN ANALISA LOGISTIK KAPAL KOARMADA 3 dengan analisa Kondisi Teknis (KONIS) dari Sistem Senjata Armada Terpadu (KAPAL dan pangkalan). Aset mencakup kapal dan pangkalan dengan form KONIS, persentase kesiapan (siap/siap terbatas/tidak siap), kondisi logistik (BBM, air bersih, fresh room, minyak lincir, amunisi, ransum), gambar aset, spesifikasi, list staff personil (pangkalan), 3D, animasi, AI, dan grafik.

## User Choices (Iterasi 1)
- Autentikasi: JWT custom auth
- AI: Claude Sonnet 4.5 (Emergent LLM Key)
- Upload: Base64 di MongoDB
- 3D: Three.js @react-three/fiber
- Dummy data: Lengkap (5 KRI + 2 Pangkalan di Sorong/Manokwari)

## Architecture
- **Backend**: FastAPI + MongoDB (Motor). Routes di /api. JWT bcrypt auth. Seed pada startup.
- **Frontend**: React 19 + react-router v7 + recharts + @react-three/fiber v9 + framer-motion + sonner + shadcn/ui. Craco, GENERATE_SOURCEMAP=false.
- **AI**: emergentintegrations LlmChat Claude Sonnet 4.5 (claude-sonnet-4-5-20250929).
- **Design**: Tactical command center. Obsidian #050608 + cyan #00E5FF glow. Exo 2 / IBM Plex Sans / Mono.

## User Personas
1. **Admin** (Laksma): full CRUD + user mgmt
2. **Operator** (Letkol/Mayor): create & edit assets
3. **Viewer** (Kapten): read-only monitoring

## Implemented (17 Apr 2026) — v1
- JWT auth (register/login/me) dengan role-based access (admin/operator/viewer)
- Seeded 3 user accounts + 5 KRI (Diponegoro, Sultan Hasanuddin, Bung Tomo, Nanggala, Banda Aceh) + 2 pangkalan (Lantamal XIV Sorong, Fasharkan Manokwari)
- CRUD /api/assets dengan filter kapal/pangkalan, konis status, readiness %, logistik 6 item, personnel, weapon_systems, base64 images, specifications
- Dashboard /api/dashboard/stats dengan 4 metric cards + bar chart readiness + pie chart status + logistics bars + live intel feed
- AI KONIS Analyzer via Claude Sonnet 4.5 dengan typewriter effect (endpoint: /api/ai-analysis)
- 3D ship viewer wireframe (kapal with gun turret, mast, radar, helipad; pangkalan with pier+buildings+tower) menggunakan R3F v9 (React.createElement untuk bypass visual-edits babel plugin)
- Asset form lengkap: upload image base64, spesifikasi dinamis, weapon systems, personnel (pangkalan)
- Gallery multi-image dengan thumbnail navigation
- Framer Motion animations, grid background, scanlines, pulse glow

## Prioritized Backlog (P0/P1/P2)
### P1 (next)
- Export laporan PDF/Excel status armada
- History tracking KONIS (timeline readiness per asset)
- Peta geospasial posisi kapal (Leaflet)
- Notifikasi status kritis (email/push)

### P2
- Maintenance scheduling & alerts
- User management page (admin UI)
- Personnel roster per kapal (saat ini hanya pangkalan)
- Real-time socket untuk update status

## Next Tasks
- Tambah role-based nav visibility (hide admin-only CTAs for viewer)
- Add PDF export & data timeline charts
- Add map visualization

## Test Credentials
Lihat /app/memory/test_credentials.md
