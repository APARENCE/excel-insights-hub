import { createFileRoute } from "@tanstack/react-router";
import TransportadoraPage from "@/pages/Transportadora";

export const Route = createFileRoute("/transportadora")({
  component: TransportadoraPage,
});