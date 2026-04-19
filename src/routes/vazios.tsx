import { createFileRoute } from "@tanstack/react-router";
import VaziosPage from "@/pages/Vazios";

export const Route = createFileRoute("/vazios")({
  component: VaziosPage,
});
