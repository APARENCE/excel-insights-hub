"use client";

import { AppShell } from "@/components/AppShell";
import PriorityQueue from "@/components/PriorityQueue";

export default function TransportadoraPage() {
  return (
    <AppShell>
      <PriorityQueue role="TRANSPORTADORA" />
    </AppShell>
  );
}