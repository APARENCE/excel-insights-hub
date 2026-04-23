"use client";

import React, { useState } from 'react';
import { Settings, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDataset, updateSettings } from "@/lib/store";
import { toast } from "sonner";

export function SettingsDialog() {
  const ds = useDataset();
  const [open, setOpen] = useState(false);
  const [capacity, setCapacity] = useState(ds.settings.capacidadePatio);

  const handleSave = () => {
    const val = parseInt(String(capacity));
    if (isNaN(val) || val <= 0) {
      toast.error("Capacidade deve ser um número positivo.");
      return;
    }
    updateSettings({ capacidadePatio: val });
    toast.success("Configurações atualizadas com sucesso.");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-2 text-sm border border-border rounded-md px-3 py-1.5 bg-card hover:bg-accent cursor-pointer">
          <Settings className="h-4 w-4" /> Configurações
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configurações do Sistema</DialogTitle>
          <DialogDescription>
            Ajuste os parâmetros operacionais do terminal Tlog.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="capacity" className="col-span-2">
              Capacidade Total (Vagas)
            </Label>
            <Input
              id="capacity"
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="col-span-2"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" /> Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}