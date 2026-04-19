import { createFileRoute } from "@tanstack/react-router";
import DemurragePage from "@/pages/Demurrage";

export const Route = createFileRoute("/demurrage")({
  component: DemurragePage,
});
