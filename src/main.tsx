import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import "./styles.css";
import Dashboard from "@/pages/Dashboard";
import ClientePage from "@/pages/Cliente";
import TransportadoraPage from "@/pages/Transportadora";
import ImportarPage from "@/pages/Importar";
import Login from "@/pages/Login";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import { Toaster } from "sonner";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Carregando Sistema...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/cliente" element={<ProtectedRoute><ClientePage /></ProtectedRoute>} />
          <Route path="/transportadora" element={<ProtectedRoute><TransportadoraPage /></ProtectedRoute>} />
          <Route path="/importar" element={<ProtectedRoute><ImportarPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
    </AuthProvider>
  </StrictMode>,
);