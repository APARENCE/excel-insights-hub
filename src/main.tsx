import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import "./styles.css";
import Dashboard from "@/pages/Dashboard";
import EstoquePage from "@/pages/Estoque";
import DemurragePage from "@/pages/Demurrage";
import VaziosPage from "@/pages/Vazios";
import ImportarPage from "@/pages/Importar";
import PrioridadesPage from "@/pages/Prioridades";
import Login from "@/pages/Login";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import { Toaster } from "sonner";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Proteção de rotas baseada no e-mail
  const userEmail = user?.email?.toLowerCase() || "";
  const isRestricted = userEmail === "renaultdobrasil.com@outlook.com";
  const allowedPaths = ["/", "/prioridades", "/demurrage", "/login"];

  if (isRestricted && !allowedPaths.includes(location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/estoque" element={<ProtectedRoute><EstoquePage /></ProtectedRoute>} />
          <Route path="/prioridades" element={<ProtectedRoute><PrioridadesPage /></ProtectedRoute>} />
          <Route path="/demurrage" element={<ProtectedRoute><DemurragePage /></ProtectedRoute>} />
          <Route path="/vazios" element={<ProtectedRoute><VaziosPage /></ProtectedRoute>} />
          <Route path="/importar" element={<ProtectedRoute><ImportarPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </AuthProvider>
  </StrictMode>,
);