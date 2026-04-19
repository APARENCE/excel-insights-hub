import { createFileRoute } from "@tanstack/react-router";
import EstoquePage from "@/pages/Estoque";

export const Route = createFileRoute("/estoque")({
  component: EstoquePage,
});
