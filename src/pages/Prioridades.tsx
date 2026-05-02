"use client";

import React, { useState, useMemo, memo, useCallback } from 'react';
import { 
  Zap, 
  Plus, 
  Clock, 
  Trash2,
  ChevronsUpDown,
  Eraser,
  Factory,
  PackageCheck,
  Calendar,
  Search as SearchIcon,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2
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

const RequestRow = memo(({ 
  id,
  conteiner,
  status,
  nivel,
  solicitadoEm,
  fabricaDestino,
  previsaoFabrica,
  conteinerDePara,
  isTransportadora,
  isGlobalBusy,
  onUpdateStatus, 
  onDelete 
}: { 
  id: string;
  conteiner: string;
  status: RequestStatus;
  nivel: PriorityLevel;
  solicitadoEm: string;
  fabricaDestino?: string;
  previsaoFabrica?: string;
  conteinerDePara?: string;
  isTransportadora: boolean;
  isGlobalBusy: boolean;
  onUpdateStatus: (id: string, status: RequestStatus) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) => {
  const [localBusy, setLocalBusy] = useState(false);
  const disabled = isGlobalBusy || localBusy;

  const handleAction = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    
    let nextStatus: RequestStatus = 'PENDENTE';
    if (status === 'PENDENTE') nextStatus = 'CARREGANDO';
    else if (status === 'CARREGANDO') nextStatus = 'DESPACHADO';
    else if (status === 'DESPACHADO') nextStatus = 'FINALIZADO';

    setLocalBusy(true);
    try {
      await onUpdateStatus(id, nextStatus);
    } finally {
      setLocalBusy(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    
    setLocalBusy(true);
    try {
      await onDelete(id);
    } finally {
      setLocalBusy(false);
    }
  };

  return (
    <div className={cn(
      "flex flex-col md:flex-row md:items-center gap-4 px-4 md:px-6 py-4 border-b border-border hover:bg-muted/30 transition-all duration-300",
      status === 'FINALIZADO' && "opacity-60 bg-muted/10",
      localBusy && "bg-primary/5"
    )}>
      <div className="flex items-center justify-between md:justify-start gap-4">
        <div className={cn(
          "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
          nivel === 'CRITICA' ? "bg-destructive text-white" :
          nivel === 'ALTA' ? "bg-warning text-warning-foreground" : "bg-primary text-white"
        )}>
          <Zap className="h-4 w-4" />
        </div>

        <div className="flex-1 md:w-44 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight">{conteiner}</span>
            {conteinerDePara && (
              <span className="text-[9px] bg-info/10 text-info px-2 py-0.5 rounded-full font-bold border border-info/20 uppercase">
                {conteinerDePara}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase">
              <Factory className="h-3 w-3" />
              {fabricaDestino}
            </div>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase">
              <Calendar className="h-3 w-3" />
              {previsaoFabrica ? new Date(previsaoFabrica).toLocaleDateString('pt-BR') : "—"}
            </div>
          </div>
        </div>

        <div className="md:hidden">
          <StatusStepperLine currentStatus={status} />
        </div>
      </div>

      <div className="hidden md:flex flex-1 items-center justify-center">
        <StatusStepperLine currentStatus={status} />
      </div>

      <div className="flex items-center justify-between md:justify-end gap-3 mt-2 md:mt-0">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold uppercase">
          <Clock className="h-3.5 w-3.5" />
          {new Date(solicitadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>

        <div className="flex items-center gap-2">
          {isTransportadora && status !== 'FINALIZADO' && (
            <Button 
              type="button"
              size="sm" 
              disabled={disabled}
              onClick={handleAction} 
              className={cn(
                "h-8 px-4 text-[10px] font-bold rounded-xl shadow-lg transition-all",
                status === 'PENDENTE' && "bg-destructive hover:bg-destructive/90 text-white shadow-destructive/20",
                status === 'CARREGANDO' && "bg-warning hover:bg-warning/90 text-warning-foreground shadow-warning/20",
                status === 'DESPACHADO' && "bg-success hover:bg-success/90 text-white shadow-success/20"
              )}
            >
              {localBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : (
                status === 'PENDENTE' ? "CARREGAR" :
                status === 'CARREGANDO' ? "SAÍDA PÁTIO" : "FINALIZAR"
              )}
            </Button>
          )}
          {status === 'FINALIZADO' && (
            <div className="text-success flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 bg-success/10 rounded-full border border-success/20 uppercase">
              <PackageCheck className="h-3.5 w-3.5" /> CONCLUÍDO
            </div>
          )}
          <Button 
            type="button"
            variant="ghost" 
            size="icon" 
            disabled={disabled}
            onClick={handleDelete} 
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});

RequestRow.displayName = "RequestRow";

function StatusStepperLine({ currentStatus }: { currentStatus: RequestStatus }) {
  const steps = [
    { id: 'PENDENTE', label: 'FILA', color: 'bg-destructive' },
    { id: 'CARREGANDO', label: 'CARGA', color: 'bg-warning' },
    { id: 'DESPACHADO', label: 'SAÍDA', color: 'bg-success' },
    { id: 'FINALIZADO', label: 'OK', color: 'bg-info' },
  ];

  const currentIndex = steps.findIndex(s => s.id === currentStatus);

  return (
    <div className="flex flex-col gap-1.5 w-full max-w-[200px]">
      <div className="flex items-center gap-1">
        {steps.map((step, idx) => {
          const isPast = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div 
              key={step.id}
              className={cn(
                "h-2 flex-1 rounded-full transition-all duration-500",
                isPast ? step.color : 
                isCurrent ? `${step.color} animate-pulse ring-2 ring-offset-1 ring-foreground/10` : 
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
                "text-[8px] font-bold tracking-tighter uppercase",
                isCurrent ? "text-foreground scale-110 transition-transform" : 
                isPast ? "text-muted-foreground/60" : "text-muted-foreground/30"
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
  const [nivelSelect, setNivelSelect] = useState<PriorityLevel>("NORMAL");
  const [isUpdating, setIsUpdating] = useState(false);

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
    const statusWeight: Record<RequestStatus, number> = { 'PENDENTE': 4, 'CARREGANDO': 3, 'DESPACHADO': 2, 'FINALIZADO': 1 };

    return ds.priorityRequests.map(req => ({
      ...req,
      details: ds.cheios.find(c => c.conteiner === req.conteiner)
    })).sort((a, b) => {
      if (statusWeight[a.status] !== statusWeight[b.status]) {
        return statusWeight[b.status] - statusWeight[a.status];
      }
      if (weight[a.nivel] !== weight[b.nivel]) {
        return weight[b.nivel] - weight[a.nivel];
      }
      const timeA = new Date(a.solicitadoEm).getTime();
      const timeB = new Date(b.solicitadoEm).getTime();
      if (timeA !== timeB) return timeB - timeA;
      return a.id.localeCompare(b.id);
    });
  }, [ds.priorityRequests, ds.cheios]);

  // Estabilizando as funções com useCallback para evitar re-renders desnecessários e garantir o ID correto
  const handleUpdateStatus = useCallback(async (id: string, status: RequestStatus) => {
    setIsUpdating(true);
    try {
      await updatePriorityStatus(id, status);
    } finally {
      // Delay de 300ms para garantir que o navegador processe o reordenamento antes de liberar novos cliques
      setTimeout(() => setIsUpdating(false), 300);
    }
  }, []);

  const handleDeleteRequest = useCallback(async (id: string) => {
    setIsUpdating(true);
    try {
      await deletePriorityRequest(id);
    } finally {
      setTimeout(() => setIsUpdating(false), 300);
    }
  }, []);

  const handleCreateRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedContainer) {
      toast.error("Selecione um container.");
      return;
    }
    const formData = new FormData(e.currentTarget);
    const fabricaDestino = fabricaSelect === 'OUTROS' ? customFabrica : fabricaSelect;
    const previsao = formData.get('previsao') as string;

    setIsUpdating(true);
    try {
      await addPriorityRequest({
        id: crypto.randomUUID(),
        conteiner: selectedContainer,
        nivel: nivelSelect,
        status: 'PENDENTE',
        solicitadoEm: new Date().toISOString(),
        fabricaDestino: fabricaDestino || 'CVU',
        previsaoFabrica: previsao || undefined,
        observacao: formData.get('observacao') as string
      });
      toast.success("Prioridade agendada!");
      setIsAddOpen(false);
      setSelectedContainer("");
      setNivelSelect("NORMAL");
    } finally {
      setTimeout(() => setIsUpdating(false), 300);
    }
  };

  return (
    <AppShell>
      {/* ESCUDO DE CLIQUES: Camada invisível que bloqueia qualquer clique na tela enquanto o sistema processa */}
      {isUpdating && (
        <div className="fixed inset-0 z-[9999] cursor-wait bg-transparent" />
      )}

      <PageHeader 
        title="Prioridades Fábrica" 
        subtitle="Fluxo de Saída em Tempo Real"
        actions={
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={isUpdating}
              onClick={() => setDataset(prev => ({...prev, priorityRequests: prev.priorityRequests.filter(r => r.status !== 'FINALIZADO')}))} 
              className="text-[10px] h-10 rounded-xl flex-1 sm:flex-none font-semibold"
            >
              <Eraser className="h-4 w-4 mr-2" /> Limpar OK
            </Button>
            {isCliente && (
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button disabled={isUpdating} className="bg-primary hover:bg-primary/90 font-bold h-10 text-xs rounded-xl flex-1 sm:flex-none shadow-lg shadow-primary/20">
                    <Plus className="h-4 w-4 mr-2" /> SOLICITAR
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md rounded-3xl">
                  <form onSubmit={handleCreateRequest}>
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold">Nova Solicitação</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-5 py-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Container no Pátio</Label>
                        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between font-semibold h-12 text-sm rounded-xl border-2">
                              <div className="flex items-center gap-2">
                                <SearchIcon className="h-4 w-4 text-muted-foreground" />
                                {selectedContainer || "Selecione o container..."}
                              </div>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[calc(100vw-2rem)] md:w-[400px] p-0 rounded-2xl shadow-2xl border-2" align="start">
                            <Command>
                              <CommandInput placeholder="Buscar por ID ou Dê-para..." className="h-12" />
                              <CommandList className="max-h-[300px]">
                                <CommandEmpty>Nenhum container disponível.</CommandEmpty>
                                <CommandGroup>
                                  {availableContainers.map((c) => (
                                    <CommandItem key={c.conteiner} value={`${c.conteiner} ${c.conteinerDePara}`} onSelect={() => { setSelectedContainer(c.conteiner); setSearchOpen(false); }} className="cursor-pointer p-3">
                                      <div className="flex flex-col">
                                        <span className="font-bold text-sm">{c.conteiner}</span>
                                        {c.conteinerDePara && <span className="text-[10px] text-primary font-semibold uppercase">Dê-para: {c.conteinerDePara}</span>}
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div className="space-y-3">
                        <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Nível de Urgência</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setNivelSelect("NORMAL")}
                            className={cn(
                              "flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all duration-200",
                              nivelSelect === "NORMAL" 
                                ? "bg-primary/10 border-primary text-primary shadow-md" 
                                : "bg-card border-border text-muted-foreground hover:border-primary/40"
                            )}
                          >
                            <Info className="h-5 w-5" />
                            <span className="text-[10px] font-bold uppercase">Normal</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setNivelSelect("ALTA")}
                            className={cn(
                              "flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all duration-200",
                              nivelSelect === "ALTA" 
                                ? "bg-warning/10 border-warning text-warning-foreground shadow-md" 
                                : "bg-card border-border text-muted-foreground hover:border-warning/40"
                            )}
                          >
                            <AlertTriangle className="h-5 w-5" />
                            <span className="text-[10px] font-bold uppercase">Alta</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setNivelSelect("CRITICA")}
                            className={cn(
                              "flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all duration-200",
                              nivelSelect === "CRITICA" 
                                ? "bg-destructive/10 border-destructive text-destructive shadow-md" 
                                : "bg-card border-border text-muted-foreground hover:border-destructive/40"
                            )}
                          >
                            <AlertCircle className="h-5 w-5" />
                            <span className="text-[10px] font-bold uppercase">Crítica</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Destino</Label>
                          <Select value={fabricaSelect} onValueChange={setFabricaSelect}>
                            <SelectTrigger className="h-12 text-sm rounded-xl border-2 font-semibold"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-xl"><SelectItem value="CVU">CVU</SelectItem><SelectItem value="CVP">CVP</SelectItem><SelectItem value="OUTROS">Outra...</SelectItem></SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Previsão de Entrega</Label>
                          <Input type="date" name="previsao" className="h-12 text-sm rounded-xl border-2 font-semibold" />
                        </div>
                      </div>
                      
                      {fabricaSelect === 'OUTROS' && <Input placeholder="Nome da fábrica" value={customFabrica} onChange={(e) => setCustomFabrica(e.target.value)} className="h-12 rounded-xl border-2 font-semibold" />}
                      <Input name="observacao" placeholder="Observações adicionais (opcional)" className="h-12 rounded-xl border-2 font-semibold" />
                    </div>
                    <DialogFooter><Button type="submit" disabled={isUpdating} className="w-full h-14 font-bold text-base rounded-2xl shadow-xl shadow-primary/20">ENVIAR PRIORIDADE</Button></DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      />

      <div className="px-4 md:px-8 grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-2xl flex flex-col gap-1 shadow-sm">
          <span className="text-[10px] font-semibold text-destructive uppercase tracking-widest">Em Fila</span>
          <span className="text-3xl font-bold tracking-tight">{stats.pendentes}</span>
        </div>
        <div className="bg-warning/5 border border-warning/20 p-4 rounded-2xl flex flex-col gap-1 shadow-sm">
          <span className="text-[10px] font-semibold text-warning-foreground uppercase tracking-widest">Carregando</span>
          <span className="text-3xl font-bold tracking-tight">{stats.carregando}</span>
        </div>
        <div className="bg-success/5 border border-success/20 p-4 rounded-2xl flex flex-col gap-1 shadow-sm">
          <span className="text-[10px] font-semibold text-success uppercase tracking-widest">Saída Pátio</span>
          <span className="text-3xl font-bold tracking-tight">{stats.despachados}</span>
        </div>
        <div className="bg-info/5 border border-info/20 p-4 rounded-2xl flex flex-col gap-1 shadow-sm">
          <span className="text-[10px] font-semibold text-info uppercase tracking-widest">Finalizado</span>
          <span className="text-3xl font-bold tracking-tight">{stats.finalizados}</span>
        </div>
      </div>

      <div className="px-4 md:px-8 pb-16">
        <div className={cn(
          "rounded-2xl border border-border bg-card overflow-hidden shadow-sm transition-all",
          isUpdating && "opacity-80"
        )}>
          <div className="hidden md:flex items-center gap-4 px-6 py-3 bg-muted/50 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            <div className="w-8 shrink-0">Prio</div>
            <div className="w-44 shrink-0">Container / Dê-para</div>
            <div className="flex-1 text-center">Status Operacional</div>
            <div className="w-48 shrink-0 text-right">Ações & Horário</div>
          </div>

          <div className="divide-y divide-border">
            {sortedRequests.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-4 opacity-10" />
                <p className="text-sm font-semibold uppercase tracking-widest">Nenhuma solicitação ativa na fila</p>
              </div>
            ) : (
              sortedRequests.map(req => (
                <RequestRow 
                  key={req.id} 
                  id={req.id}
                  conteiner={req.conteiner}
                  status={req.status}
                  nivel={req.nivel}
                  solicitadoEm={req.solicitadoEm}
                  fabricaDestino={req.fabricaDestino}
                  previsaoFabrica={req.previsaoFabrica}
                  conteinerDePara={req.details?.conteinerDePara}
                  isTransportadora={isTransportadora}
                  isGlobalBusy={isUpdating}
                  onUpdateStatus={handleUpdateStatus}
                  onDelete={handleDeleteRequest}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}