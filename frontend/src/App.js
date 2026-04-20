import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import AssetList from "./pages/AssetList";
import AssetDetail from "./pages/AssetDetail";
import AssetForm from "./pages/AssetForm";
import AIAnalysis from "./pages/AIAnalysis";
import History from "./pages/History";
import Layout from "./components/Layout";
import Gatekeeper from "./components/Gatekeeper";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from "sonner";

function TitleSetter() {
  useEffect(() => {
    document.title = "Logistic3";
    const i = setInterval(() => {
      if (document.title !== "Logistic3") document.title = "Logistic3";
    }, 1000);
    return () => clearInterval(i);
  }, []);
  return null;
}

function App() {
  return (
    <ThemeProvider>
      <div className="App">
        <BrowserRouter>
          <TitleSetter />
          <Toaster theme="dark" position="top-right" />
          <Gatekeeper>
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />

                <Route path="/kapal" element={<AssetList type="kapal" />} />
                <Route path="/kapal/new" element={<AssetForm type="kapal" />} />
                <Route path="/kapal/:id" element={<AssetDetail type="kapal" />} />
                <Route path="/kapal/:id/edit" element={<AssetForm type="kapal" />} />

                <Route path="/pangkalan" element={<AssetList type="pangkalan" />} />
                <Route path="/pangkalan/new" element={<AssetForm type="pangkalan" />} />
                <Route path="/pangkalan/:id" element={<AssetDetail type="pangkalan" />} />
                <Route path="/pangkalan/:id/edit" element={<AssetForm type="pangkalan" />} />

                <Route path="/history" element={<History />} />
                <Route path="/ai-analysis" element={<AIAnalysis />} />

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </Gatekeeper>
        </BrowserRouter>
      </div>
    </ThemeProvider>
  );
}

export default App;
