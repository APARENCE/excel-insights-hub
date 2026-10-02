"use client";

import { AppShell } from "@/components/AppShell";
import PriorityQueue from "@/components/PriorityQueue";
import ExcelDebugImport from "@/components/ExcelDebugImport";

export default function TransportadoraPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <PriorityQueue role="TRANSPORTADORA" />
        <ExcelDebugImport />
      </div>
    </AppShell>
  );
}