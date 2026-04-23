import { createFileRoute } from "@tanstack/react-router";
import PrioridadesPage from "@/pages/Prioridades";

export const Route = createFileRoute("/prioridades")({
  component: PrioridadesPage,
});