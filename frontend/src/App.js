import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AssetList from "./pages/AssetList";
import AssetDetail from "./pages/AssetDetail";
import AssetForm from "./pages/AssetForm";
import AIAnalysis from "./pages/AIAnalysis";
import Layout from "./components/Layout";
import { Toaster } from "sonner";

function RequireAuth({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Layout>{children}</Layout>;
}

function RedirectIfAuthed({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <Toaster theme="dark" position="top-right" />
          <Routes>
            <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
            <Route path="/register" element={<RedirectIfAuthed><Register /></RedirectIfAuthed>} />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />

            <Route path="/kapal" element={<RequireAuth><AssetList type="kapal" /></RequireAuth>} />
            <Route path="/kapal/new" element={<RequireAuth><AssetForm type="kapal" /></RequireAuth>} />
            <Route path="/kapal/:id" element={<RequireAuth><AssetDetail type="kapal" /></RequireAuth>} />
            <Route path="/kapal/:id/edit" element={<RequireAuth><AssetForm type="kapal" /></RequireAuth>} />

            <Route path="/pangkalan" element={<RequireAuth><AssetList type="pangkalan" /></RequireAuth>} />
            <Route path="/pangkalan/new" element={<RequireAuth><AssetForm type="pangkalan" /></RequireAuth>} />
            <Route path="/pangkalan/:id" element={<RequireAuth><AssetDetail type="pangkalan" /></RequireAuth>} />
            <Route path="/pangkalan/:id/edit" element={<RequireAuth><AssetForm type="pangkalan" /></RequireAuth>} />

            <Route path="/ai-analysis" element={<RequireAuth><AIAnalysis /></RequireAuth>} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

// Use URL to distinguish kapal vs pangkalan detail page
// (We re-extract type from route param in AssetDetail if needed.)

export default App;
