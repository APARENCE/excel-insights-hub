"use client";

import { AppShell } from "@/components/AppShell";
import PriorityQueue from "@/components/PriorityQueue";

export default function ClientePage() {
  return (
    <AppShell>
      <PriorityQueue role="CLIENTE" />
    </AppShell>
  );
}