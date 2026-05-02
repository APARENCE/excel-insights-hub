"use client";

import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  Plus, 
  Clock, 
  Trash2,
  ChevronsUpDown,
  Eraser,
  Factory,
  PackageCheck,
  Calendar
} from 'lucide-react';
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
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

/**
 * Sinaleiro com Rótulos de Texto
 */
function StatusStepperLine({ currentStatus }: { currentStatus: RequestStatus }) {
  const steps = [
    { id: 'PENDENTE', label: 'FILA', color: 'bg-destructive' },
    { id: 'CARREGANDO', label: 'CARREGADO', color: 'bg-warning' },
    { id: 'DESPACHADO', label: 'SAÍDA PÁTIO', color: 'bg-success' },
    { id: 'FINALIZADO', label: 'FINALIZADO', color: 'bg-info' },
  ];

  const currentIndex = steps.findIndex(s => s.id === currentStatus);

  return (
    <div className="flex flex-col gap-1 w-48">
      <div className="flex items-center gap-1">
        {steps.map((step, idx) => {
          const isPast = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div 
              key={step.id}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-500",
                isPast ? step.color : 
                isCurrent ? `${step.color} animate-pulse ring-1 ring-offset-1 ring-foreground/20` : 
                "bg-muted"
              )} 
            />
          );
        })}
      </div>
      <div className="flex justify-between px-0.5">
        {steps.map((step, idx) => {
          const isCurrent = idx === currentIndex;
          const isPast = idx < currentIndex;
          return (
            <span 
              key={step.id} 
              className={cn(
                "text-[7px] font-bold tracking-tighter",
                isCurrent ? "text-foreground scale-110 transition-transform" : 
                isPast ? "text-muted-foreground/70" : "text-muted-foreground/40"
              )}
            >
              {step.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function PrioridadesPage() {
  const ds = useDataset();
  const { userRole } = ds;
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState("");
  const [fabricaSelect, setFabricaSelect] = useState<string>("CVU");
  const [customFabrica, setCustomFabrica] = useState("");

  const isCliente = userRole === "CLIENTE";
  const isTransportadora = userRole === "TRANSPORTADORA";

  const availableContainers = useMemo(() => {
    const existingIds = new Set(ds.priorityRequests.filter(r => r.status !== 'FINALIZADO').map(r => r.conteiner));
    return ds.cheios.filter(c => 
      (c.status === "EM PATIO TLOG-SJP" || c.status === "DEPARA EM PATIO TLOG-SJP") && 
      !existingIds.has(c.conteiner)
    );
  }, [ds.cheios, ds.priorityRequests]);

  const stats = {
    pendentes: ds.priorityRequests.filter(r => r.status === 'PENDENTE').length,
    carregando: ds.priorityRequests.filter(r => r.status === 'CARREGANDO').length,
    despachados: ds.priorityRequests.filter(r => r.status === 'DESPACHADO').length,
    finalizados: ds.priorityRequests.filter(r => r.status === 'FINALIZADO').length,
  };

  const sortedRequests = useMemo(() => {
    const weight: Record<string, number> = { 'CRITICA': 3, 'ALTA': 2, 'NORMAL': 1 };
    return ds.priorityRequests.map(req => ({
      ...req,
      details: ds.cheios.find(c => c.conteiner === req.conteiner)
    })).sort((a, b) => {
      const statusWeight: Record<RequestStatus, number> = { 'PENDENTE': 4, 'CARREGANDO': 3, 'DESPACHADO': 2, 'FINALIZADO': 1 };
      if (statusWeight[a.status] !== statusWeight[b.status]) {
        return statusWeight[b.status] - statusWeight[a.status];
      }
      if (weight[a.nivel] !== weight[b.nivel]) {
        return weight[b.nivel] - weight[a.nivel];
      }
      return new Date(b.solicitadoEm).getTime() - new Date(a.solicitadoEm).getTime();
    });
  }, [ds.priorityRequests, ds.cheios]);

  const handleCreateRequest = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedContainer) {
      toast.error("Selecione um container.");
      return;
    }
    const formData = new FormData(e.currentTarget);
    const nivel = formData.get('nivel') as PriorityLevel;
    const fabricaDestino = fabricaSelect === 'OUTROS' ? customFabrica : fabricaSelect;
    const previsao = formData.get('previsao') as string;

    addPriorityRequest({
      id: crypto.randomUUID(),
      conteiner: selectedContainer,
      nivel,
      status: 'PENDENTE',
      solicitadoEm: new Date().toISOString(),
      fabricaDestino: fabricaDestino || 'CVU',
      previsaoFabrica: previsao || undefined,
      observacao: formData.get('observacao') as string
    });

    toast.success("Prioridade agendada!");
    setIsAddOpen(false);
    setSelectedContainer("");
  };

  const RequestRow = ({ req }: { req: any }) => (
    <div className={cn(
      "flex items-center gap-4 px-4 py-2 border-b border-border hover:bg-muted/30 transition-colors",
      req.status === 'FINALIZADO' && "opacity-50 bg-muted/10"
    )}>
      <div className={cn(
        "h-5 w-5 rounded flex items-center justify-center shrink-0",
        req.nivel === 'CRITICA' ? "bg-destructive text-white" :
        req.nivel === 'ALTA' ? "bg-warning text-warning-foreground" : "bg-primary text-white"
      )}>
        <Zap className="h-3 w-3" />
      </div>

      <div className="w-36 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold">{req.conteiner}</span>
          {req.details?.conteinerDePara && (
            <span className="text-[8px] bg-info/10 text-info px-1 rounded font-bold border border-info/20">
              {req.details.conteinerDePara}
            </span>
          )}
        </div>
      </div>

      <div className="w-20 shrink-0 flex items-center gap-1 text-[10px] font-medium">
        <Factory className="h-3 w-3 text-muted-foreground" />
        {req.fabricaDestino}
      </div>

      <div className="w-24 shrink-0 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Calendar className="h-3 w-3 text-primary/60" />
        {req.previsaoFabrica ? new Date(req.previsaoFabrica).toLocaleDateString('pt-BR') : "—"}
      </div>

      <div className="w-16 shrink-0 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Clock className="h-3 w-3" />
        {new Date(req.solicitadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </div>

      <div className="flex-1 flex items-center justify-center">
        <StatusStepperLine currentStatus={req.status} />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isTransportadora && req.status === 'PENDENTE' && (
          <Button size="sm" onClick={() => updatePriorityStatus(req.id, 'CARREGANDO')} className="h-6 px-2 text-[9px] bg-destructive hover:bg-destructive/90 text-white font-bold">
            CARREGAR
          </Button>
        )}
        {isTransportadora && req.status === 'CARREGANDO' && (
          <Button size="sm" onClick={() => updatePriorityStatus(req.id, 'DESPACHADO')} className="h-6 px-2 text-[9px] bg-warning hover:bg-warning/90 text-warning-foreground font-bold">
            SAÍDA PÁTIO
          </Button>
        )}
        {isTransportadora && req.status === 'DESPACHADO' && (
          <Button size="sm" onClick={() => updatePriorityStatus(req.id, 'FINALIZADO')} className="h-6 px-2 text-[9px] bg-success hover:bg-success/90 text-white font-bold">
            FINALIZAR
          </Button>
        )}
        {req.status === 'FINALIZADO' && (
          <div className="text-success flex items-center gap-1 text-[9px] font-bold px-1">
            <PackageCheck className="h-3 w-3" /> OK
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={() => deletePriorityRequest(req.id)} className="h-6 w-6 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  return (
    <AppShell>
      <PageHeader 
        title="Prioridades Fábrica" 
        subtitle="Fluxo de Saída em Tempo Real"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setDataset(prev => ({...prev, priorityRequests: prev.priorityRequests.filter(r => r.status !== 'FINALIZADO')}))} className="text-[10px] h-8">
              <Eraser className="h-3 w-3 mr-1.5" /> Limpar OK
            </Button>
            {isCliente && (
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 font-bold h-8 text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" /> SOLICITAR
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <form onSubmit={handleCreateRequest}>
                    <DialogHeader>
                      <DialogTitle>Nova Solicitação de Prioridade</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Container no Pátio</Label>
                        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between font-normal h-9 text-sm">
                              {selectedContainer || "Selecione..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="ID ou Dê-para..." />
                              <CommandList>
                                <CommandEmpty>Nenhum disponível.</CommandEmpty>
                                <CommandGroup>
                                  {availableContainers.map((c) => (
                                    <CommandItem key={c.conteiner} value={`${c.conteiner} ${c.conteinerDePara}`} onSelect={() => { setSelectedContainer(c.conteiner); setSearchOpen(false); }} className="cursor-pointer">
                                      <div className="flex flex-col">
                                        <span className="font-bold text-sm">{c.conteiner}</span>
                                        {c.conteinerDePara && <span className="text-[10px] text-primary">Dê-para: {c.conteinerDePara}</span>}
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Destino</Label>
                          <Select value={fabricaSelect} onValueChange={setFabricaSelect}>
                            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="CVU">CVU</SelectItem><SelectItem value="CVP">CVP</SelectItem><SelectItem value="OUTROS">Outra...</SelectItem></SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Urgência</Label>
                          <Select name="nivel" defaultValue="NORMAL">
                            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="NORMAL">Normal</SelectItem><SelectItem value="ALTA">Alta</SelectItem><SelectItem value="CRITICA">Crítica</SelectItem></SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Previsão de Entrega</Label>
                        <Input type="date" name="previsao" className="h-9 text-sm" />
                      </div>
                      {fabricaSelect === 'OUTROS' && <Input placeholder="Nome da fábrica" value={customFabrica} onChange={(e) => setCustomFabrica(e.target.value)} className="h-9" />}
                      <Input name="observacao" placeholder="Obs (opcional)" className="h-9" />
                    </div>
                    <DialogFooter><Button type="submit" className="w-full font-bold">ENVIAR PRIORIDADE</Button></DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      />

      <div className="px-6 grid grid-cols-4 gap-2 mb-4">
        <div className="bg-destructive/5 border border-destructive/20 px-3 py-1.5 rounded flex items-center justify-between">
          <span className="text-[9px] font-bold text-destructive uppercase tracking-wider">Fila</span>
          <span className="text-base font-black">{stats.pendentes}</span>
        </div>
        <div className="bg-warning/5 border border-warning/20 px-3 py-1.5 rounded flex items-center justify-between">
          <span className="text-[9px] font-bold text-warning-foreground uppercase tracking-wider">Carregado</span>
          <span className="text-base font-black">{stats.carregando}</span>
        </div>
        <div className="bg-success/5 border border-success/20 px-3 py-1.5 rounded flex items-center justify-between">
          <span className="text-[9px] font-bold text-success uppercase tracking-wider">Saída Pátio</span>
          <span className="text-base font-black">{stats.despachados}</span>
        </div>
        <div className="bg-info/5 border border-info/20 px-3 py-1.5 rounded flex items-center justify-between">
          <span className="text-[9px] font-bold text-info uppercase tracking-wider">Finalizado</span>
          <span className="text-base font-black">{stats.finalizados}</span>
        </div>
      </div>

      <div className="px-6 pb-10">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-4 px-4 py-1.5 bg-muted/50 border-b border-border text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
            <div className="w-5 shrink-0">Prio</div>
            <div className="w-36 shrink-0">Container / Dê-para</div>
            <div className="w-20 shrink-0">Destino</div>
            <div className="w-24 shrink-0">Previsão</div>
            <div className="w-16 shrink-0">Hora</div>
            <div className="flex-1 text-center">Status Operacional</div>
            <div className="w-32 shrink-0 text-right">Ações</div>
          </div>

          <div className="divide-y divide-border">
            {sortedRequests.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-[10px] italic">
                Nenhuma solicitação ativa na fila.
              </div>
            ) : (
              sortedRequests.map(req => <RequestRow key={req.id} req={req} />)
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}