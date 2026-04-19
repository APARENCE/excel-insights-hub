import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./styles.css";
import Dashboard from "@/pages/Dashboard";
import EstoquePage from "@/pages/Estoque";
import DemurragePage from "@/pages/Demurrage";
import VaziosPage from "@/pages/Vazios";
import ImportarPage from "@/pages/Importar";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/estoque" element={<EstoquePage />} />
        <Route path="/demurrage" element={<DemurragePage />} />
        <Route path="/vazios" element={<VaziosPage />} />
        <Route path="/importar" element={<ImportarPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
