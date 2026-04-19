import { createFileRoute } from "@tanstack/react-router";
import ImportarPage from "@/pages/Importar";

export const Route = createFileRoute("/importar")({
  component: ImportarPage,
});
