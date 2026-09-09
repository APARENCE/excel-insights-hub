import { createFileRoute } from "@tanstack/react-router";
import ClientePage from "@/pages/Cliente";

export const Route = createFileRoute("/cliente")({
  component: ClientePage,
});