"use client";

import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  Plus, 
  Trash2,
  ChevronsUpDown,
  Eraser,
  PackageCheck,
  Search as SearchIcon,
  Loader2,
  Clock
} from 'lucide-react';
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useDataset, addPriorityRequest, updatePriorityStatus, deletePriorityRequest, setDataset } from "@/lib/store";
import { toast } from "sonner";
import { PriorityLevel, RequestStatus } from '@/lib/types';
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";

export default function PrioridadesPage() {
  const ds = useDataset();
  const { userRole } = ds;
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState("");
  const [fabricaSelect, setFabricaSelect] = useState<string>("CVU");
  const [customFabrica, setCustomFabrica] = useState("");
  const [nivelSelect, setNivelSelect] = useState<PriorityLevel>("NORMAL");
  const [isUpdating, setIsUpdating] = useState(false);

  const isCliente = userRole === "CLIENTE";
  const isTransportadora = userRole === "TRANSPORTADORA";

  const sortedRequests = useMemo(() => {
    const weight: Record<string, number> = { 'CRITICA': 3, 'ALTA': 2, 'NORMAL': 1 };
    const statusWeight: Record<RequestStatus, number> = { 'PENDENTE': 4, 'CARREGANDO': 3, 'DESPACHADO': 2, 'FINALIZADO': 1 };

    return [...ds.priorityRequests].sort((a, b) => {
      if (statusWeight[a.status] !== statusWeight[b.status]) {
        return statusWeight[b.status] - statusWeight[a.status];
      }
      if (weight[a.nivel] !== weight[b.nivel]) {
        return weight[b.nivel] - weight[a.nivel];
      }
      return new Date(b.solicitadoEm).getTime() - new Date(a.solicitadoEm).getTime();
    });
  }, [ds.priorityRequests]);

  const availableContainers = useMemo(() => {
    const existingIds = new Set(ds.priorityRequests.filter(r => r.status !== 'FINALIZADO').map(r => r.conteiner));
    return ds.cheios.filter(c => 
      (c.status === "EM PATIO TLOG-SJP" || c.status === "DEPARA EM PATIO TLOG-SJP") && 
      !existingIds.has(c.conteiner)
    );
  }, [ds.cheios, ds.priorityRequests]);

  const handleUpdateStatus = async (e: React.MouseEvent, id: string, currentStatus: RequestStatus) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUpdating) return;
    
    let nextStatus: RequestStatus = 'PENDENTE';
    if (currentStatus === 'PENDENTE') nextStatus = 'CARREGANDO';
    else if (currentStatus === 'CARREGANDO') nextStatus = 'DESPACHADO';
    else if (currentStatus === 'DESPACHADO') nextStatus = 'FINALIZADO';

    setIsUpdating(true);
    try {
      await updatePriorityStatus(id, nextStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteRequest = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await deletePriorityRequest(id);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedContainer) return toast.error("Selecione um container.");
    
    const formData = new FormData(e.currentTarget);
    const fabricaDestino = fabricaSelect === 'OUTROS' ? customFabrica : fabricaSelect;
    
    setIsUpdating(true);
    try {
      await addPriorityRequest({
        id: crypto.randomUUID(),
        conteiner: selectedContainer,
        nivel: nivelSelect,
        status: 'PENDENTE',
        solicitadoEm: new Date().toISOString(),
        fabricaDestino: fabricaDestino || 'CVU',
        previsaoFabrica: (formData.get('previsao') as string) || undefined,
        observacao: (formData.get('observacao') as string) || ""
      });
      setIsAddOpen(false);
      setSelectedContainer("");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AppShell>
      <PageHeader 
        title="Prioridades Fábrica" 
        subtitle="Controle de Saída"
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setDataset(prev => ({...prev, priorityRequests: prev.priorityRequests.filter(r => r.status !== 'FINALIZADO')}))} 
              className="h-10 rounded-xl font-bold text-[10px]"
            >
              <Eraser className="h-4 w-4 mr-2" /> LIMPAR OK
            </Button>
            {isCliente && (
              <Button onClick={() => setIsAddOpen(true)} className="bg-primary font-bold h-10 text-xs rounded-xl shadow-lg">
                <Plus className="h-4 w-4 mr-2" /> SOLICITAR
              </Button>
            )}
          </div>
        }
      />

      <div className="px-4 md:px-8 pb-20">
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-muted/50 border-b border-border">
                <tr className="text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  <th className="px-6 py-4">Prio</th>
                  <th className="px-6 py-4">Container</th>
                  <th className="px-6 py-4">Destino</th>
                  <th className="px-6 py-4">Status Atual</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-muted-foreground font-bold uppercase text-xs tracking-widest opacity-30">
                      Fila de prioridades vazia
                    </td>
                  </tr>
                ) : (
                  sortedRequests.map((req) => {
                    const details = ds.cheios.find(c => c.conteiner === req.conteiner);
                    const isFinalizado = req.status === 'FINALIZADO';
                    
                    return (
                      <tr key={req.id} className={cn(
                        "hover:bg-muted/10 transition-colors",
                        isFinalizado && "opacity-60 bg-muted/5"
                      )}>
                        <td className="px-6 py-4">
                          <div className={cn(
                            "h-7 w-7 rounded-lg flex items-center justify-center",
                            req.nivel === 'CRITICA' ? "bg-destructive text-white" :
                            req.nivel === 'ALTA' ? "bg-warning text-warning-foreground" : "bg-primary text-white"
                          )}>
                            <Zap className="h-3.5 w-3.5" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-black text-sm">{req.conteiner}</div>
                          {details?.conteinerDePara && (
                            <div className="text-[9px] font-bold text-primary uppercase">Dê-para: {details.conteinerDePara}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs font-bold">{req.fabricaDestino || "CVU"}</div>
                          <div className="text-[10px] text-muted-foreground">{req.previsaoFabrica ? new Date(req.previsaoFabrica).toLocaleDateString('pt-BR') : "—"}</div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge tone={
                            req.status === 'PENDENTE' ? 'destructive' :
                            req.status === 'CARREGANDO' ? 'warning' :
                            req.status === 'DESPACHADO' ? 'success' : 'info'
                          }>
                            {req.status}
                          </StatusBadge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase mr-2">
                              {new Date(req.solicitadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            
                            {isTransportadora && !isFinalizado && (
                              <Button 
                                size="sm"
                                disabled={isUpdating}
                                onClick={(e) => handleUpdateStatus(e, req.id, req.status)}
                                className={cn(
                                  "h-8 px-4 text-[10px] font-black rounded-lg",
                                  req.status === 'PENDENTE' ? "bg-destructive hover:bg-destructive/90" :
                                  req.status === 'CARREGANDO' ? "bg-warning hover:bg-warning/90 text-black" : "bg-success hover:bg-success/90"
                                )}
                              >
                                {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : (
                                  req.status === 'PENDENTE' ? "CARREGAR" :
                                  req.status === 'CARREGANDO' ? "SAÍDA PÁTIO" : "FINALIZAR"
                                )}
                              </Button>
                            )}

                            {isFinalizado && (
                              <div className="h-8 px-3 flex items-center gap-2 bg-success/10 text-success rounded-lg border border-success/20 text-[10px] font-black uppercase">
                                <PackageCheck className="h-3.5 w-3.5" /> OK
                              </div>
                            )}

                            <Button 
                              variant="ghost" 
                              size="icon" 
                              disabled={isUpdating}
                              onClick={(e) => handleDeleteRequest(e, req.id)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Dialog de Solicitação */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <form onSubmit={handleCreateRequest}>
            <DialogHeader><DialogTitle className="text-xl font-bold">Nova Solicitação</DialogTitle></DialogHeader>
            <div className="grid gap-5 py-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Container</Label>
                <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between h-12 rounded-xl border-2">
                      {selectedContainer || "Selecione..."}
                      <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0 rounded-2xl border-2">
                    <Command>
                      <CommandInput placeholder="Buscar..." />
                      <CommandList>
                        <CommandEmpty>Não encontrado.</CommandEmpty>
                        <CommandGroup>
                          {availableContainers.map((c) => (
                            <CommandItem key={c.conteiner} onSelect={() => { setSelectedContainer(c.conteiner); setSearchOpen(false); }}>
                              {c.conteiner} {c.conteinerDePara ? `(${c.conteinerDePara})` : ''}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['NORMAL', 'ALTA', 'CRITICA'] as PriorityLevel[]).map(n => (
                  <Button key={n} type="button" variant={nivelSelect === n ? 'default' : 'outline'} onClick={() => setNivelSelect(n)} className="h-12 rounded-xl text-[10px] font-bold">
                    {n}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select value={fabricaSelect} onValueChange={setFabricaSelect}>
                  <SelectTrigger className="h-12 rounded-xl border-2"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="CVU">CVU</SelectItem><SelectItem value="CVP">CVP</SelectItem><SelectItem value="OUTROS">Outra...</SelectItem></SelectContent>
                </Select>
                <Input type="date" name="previsao" className="h-12 rounded-xl border-2" />
              </div>
              <Input name="observacao" placeholder="Observações" className="h-12 rounded-xl border-2" />
            </div>
            <DialogFooter><Button type="submit" disabled={isUpdating} className="w-full h-14 font-bold rounded-2xl">SOLICITAR</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}