"use client";

import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  Plus, 
  Truck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2,
  Filter,
  ArrowRightLeft,
  Ship,
  Check,
  ChevronsUpDown,
  Calendar,
  Eraser,
  Timer
} from 'lucide-react';
import { AppShell, PageHeader } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
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

export default function PrioridadesPage() {
  const ds = useDataset();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filter, setFilter] = useState<RequestStatus | 'TODOS'>('TODOS');
  
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState("");

  const availableContainers = useMemo(() => {
    const existingIds = new Set(ds.priorityRequests.filter(r => r.status !== 'DESPACHADO').map(r => r.conteiner));
    return ds.cheios.filter(c => 
      (c.status === "EM PATIO TLOG-SJP" || c.status === "DEPARA EM PATIO TLOG-SJP") && 
      !existingIds.has(c.conteiner)
    );
  }, [ds.cheios, ds.priorityRequests]);

  const stats = {
    pendentes: ds.priorityRequests.filter(r => r.status === 'PENDENTE').length,
    carregando: ds.priorityRequests.filter(r => r.status === 'CARREGANDO').length,
    despachados: ds.priorityRequests.filter(r => r.status === 'DESPACHADO').length,
    criticos: ds.priorityRequests.filter(r => r.nivel === 'CRITICA' && r.status !== 'DESPACHADO').length
  };

  const filteredRequests = useMemo(() => {
    let list = ds.priorityRequests;
    if (filter !== 'TODOS') {
      list = list.filter(r => r.status === filter);
    }
    
    return list.map(req => {
      const details = ds.cheios.find(c => c.conteiner === req.conteiner);
      return { ...req, details };
    }).sort((a, b) => {
      const weight = { 'CRITICA': 3, 'ALTA': 2, 'NORMAL': 1 };
      if (a.status === 'DESPACHADO' && b.status !== 'DESPACHADO') return 1;
      if (a.status !== 'DESPACHADO' && b.status === 'DESPACHADO') return -1;
      return weight[b.nivel] - weight[a.nivel] || new Date(b.solicitadoEm).getTime() - new Date(a.solicitadoEm).getTime();
    });
  }, [ds.priorityRequests, ds.cheios, filter]);

  const handleCreateRequest = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedContainer) {
      toast.error("Selecione um container válido.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const nivel = formData.get('nivel') as PriorityLevel;
    const observacao = formData.get('observacao') as string;

    addPriorityRequest({
      id: crypto.randomUUID(),
      conteiner: selectedContainer,
      nivel,
      status: 'PENDENTE',
      solicitadoEm: new Date().toISOString(),
      observacao
    });

    toast.success(`Prioridade agendada com sucesso!`);
    setIsAddOpen(false);
    setSelectedContainer("");
  };

  const clearFinished = () => {
    setDataset(prev => ({
      ...prev,
      priorityRequests: prev.priorityRequests.filter(r => r.status !== 'DESPACHADO')
    }));
    toast.info("Lista de despachados limpa.");
  };

  // Helper para verificar se a demurrage está crítica
  const getDemurrageColor = (dateStr?: string) => {
    if (!dateStr) return "text-muted-foreground";
    const date = new Date(dateStr);
    const diff = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return "text-destructive font-black";
    if (diff <= 3) return "text-warning font-black";
    return "text-success font-bold";
  };

  return (
    <AppShell>
      <PageHeader 
        title="Prioridades Fábrica" 
        subtitle="Controle de expedição para montadora Renault"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearFinished} className="gap-2 text-xs">
              <Eraser className="h-3.5 w-3.5" /> Limpar Despachados
            </Button>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-md">
                  <Plus className="h-4 w-4" /> Nova Prioridade
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleCreateRequest}>
                  <DialogHeader>
                    <DialogTitle>Agendar Envio Renault</DialogTitle>
                    <DialogDescription>Selecione um container para priorizar o despacho.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-6 py-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-bold">Localizar Container (Número ou Dê-para)</Label>
                      <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between h-12 text-left font-normal border-2 focus:ring-2 ring-primary/20"
                          >
                            {selectedContainer
                              ? availableContainers.find((c) => c.conteiner === selectedContainer)?.conteiner
                              : "Digite o número do container..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[450px] p-0 shadow-2xl" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar por container, armador ou dê-para..." />
                            <CommandList className="max-h-[350px]">
                              <CommandEmpty className="py-6 text-center text-muted-foreground">Nenhum container disponível encontrado.</CommandEmpty>
                              <CommandGroup heading="Containers Disponíveis no Pátio">
                                {availableContainers.map((c) => (
                                  <CommandItem
                                    key={c.conteiner}
                                    value={`${c.conteiner} ${c.armador} ${c.conteinerDePara}`}
                                    onSelect={() => {
                                      setSelectedContainer(c.conteiner);
                                      setSearchOpen(false);
                                    }}
                                    className="flex flex-col items-start py-3 px-4 cursor-pointer hover:bg-accent"
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span className="font-bold text-base text-primary">{c.conteiner}</span>
                                      {selectedContainer === c.conteiner && <Check className="h-4 w-4 text-primary" />}
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-1.5">
                                      <span className="flex items-center gap-1 text-[10px] bg-muted px-2 py-1 rounded font-bold text-muted-foreground uppercase">
                                        <Ship className="h-3 w-3" /> {c.armador || "N/A"}
                                      </span>
                                      {c.conteinerDePara && (
                                        <span className="flex items-center gap-1 text-[10px] bg-primary/10 px-2 py-1 rounded font-bold text-primary uppercase border border-primary/20">
                                          <ArrowRightLeft className="h-3 w-3" /> Dê-para: {c.conteinerDePara}
                                        </span>
                                      )}
                                      {!c.colunaAS && (
                                        <span className={cn(
                                          "text-[10px] px-2 py-1 rounded font-bold border flex items-center gap-1",
                                          getDemurrageColor(c.demurrageVencimento).includes("destructive") ? "bg-destructive/10 border-destructive/20 text-destructive" :
                                          getDemurrageColor(c.demurrageVencimento).includes("warning") ? "bg-warning/10 border-warning/20 text-warning-foreground" :
                                          "bg-success/10 border-success/20 text-success"
                                        )}>
                                          <Timer className="h-3 w-3" /> 
                                          Expira: {c.demurrageVencimento ? new Date(c.demurrageVencimento).toLocaleDateString('pt-BR') : 'Sem Data'}
                                        </span>
                                      )}
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-bold">Urgência</Label>
                        <Select name="nivel" defaultValue="NORMAL">
                          <SelectTrigger className="h-11 border-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NORMAL">🟢 Normal</SelectItem>
                            <SelectItem value="ALTA">🟠 Alta Urgência</SelectItem>
                            <SelectItem value="CRITICA">🔴 Crítica (Imediato)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold">Observação</Label>
                        <Input name="observacao" placeholder="Ex: Urgente p/ Linha" className="h-11 border-2" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full h-12 text-base font-bold shadow-lg">Confirmar Prioridade</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="px-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Aguardando" value={stats.pendentes} icon={Clock} tone="warning" />
        <StatCard label="Carregando" value={stats.carregando} icon={Truck} tone="info" />
        <StatCard label="Enviados Hoje" value={stats.despachados} icon={CheckCircle2} tone="success" />
        <StatCard label="Urgência Crítica" value={stats.criticos} icon={AlertTriangle} tone="destructive" />
      </div>

      <div className="px-6 mt-8 flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-muted p-2 rounded-lg">
            <Filter className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <span className="text-sm font-bold">Filtro de Status</span>
            <div className="flex gap-1.5 mt-1">
              {(['TODOS', 'PENDENTE', 'CARREGANDO', 'DESPACHADO'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={cn(
                    "px-4 py-1.5 text-[11px] font-bold rounded-full border transition-all uppercase tracking-tight",
                    filter === s 
                      ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                      : "bg-card text-muted-foreground border-border hover:bg-accent"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 mt-6 pb-12 space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border bg-card/50 p-16 text-center">
            <Zap className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-muted-foreground">Fila de prioridades vazia</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">Adicione novos containers para agilizar a saída do pátio.</p>
          </div>
        ) : (
          filteredRequests.map(req => (
            <div 
              key={req.id} 
              className={cn(
                "group rounded-2xl border-2 p-5 flex flex-col lg:flex-row lg:items-center gap-6 transition-all hover:shadow-md relative overflow-hidden",
                req.status === 'DESPACHADO' ? 'bg-muted/40 border-border' : 'bg-card border-border hover:border-primary/30',
                req.nivel === 'CRITICA' && req.status !== 'DESPACHADO' ? 'border-l-8 border-l-destructive shadow-destructive/5' : ''
              )}
            >
              <div className="absolute bottom-0 left-0 h-1.5 bg-muted w-full">
                <div 
                  className={cn(
                    "h-full transition-all duration-500",
                    req.status === 'PENDENTE' ? 'w-1/3 bg-warning' :
                    req.status === 'CARREGANDO' ? 'w-2/3 bg-info' :
                    'w-full bg-success'
                  )} 
                />
              </div>

              <div className={cn(
                "h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
                req.nivel === 'CRITICA' && req.status !== 'DESPACHADO' ? 'bg-destructive/10 text-destructive' :
                req.nivel === 'ALTA' && req.status !== 'DESPACHADO' ? 'bg-warning/10 text-warning-foreground' :
                req.status === 'DESPACHADO' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
              )}>
                <Zap className={cn("h-7 w-7", req.status === 'PENDENTE' && 'animate-pulse')} />
              </div>
              
              <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black tracking-tighter text-foreground">{req.conteiner}</span>
                    <StatusBadge tone={
                      req.status === 'DESPACHADO' ? 'success' :
                      req.nivel === 'CRITICA' ? 'destructive' :
                      req.nivel === 'ALTA' ? 'warning' : 'primary'
                    }>
                      {req.status === 'DESPACHADO' ? 'CONCLUÍDO' : req.nivel}
                    </StatusBadge>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/5 px-2 py-0.5 rounded">
                      <Clock className="h-3.5 w-3.5" /> {new Date(req.solicitadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {req.observacao && (
                      <div className="text-xs font-medium text-muted-foreground truncate">
                         → {req.observacao}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col justify-center space-y-1.5 lg:border-l lg:border-border/50 lg:pl-6">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
                    <Ship className="h-3.5 w-3.5 text-primary/60" /> Armador: <span className="text-foreground">{req.details?.armador || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
                    <ArrowRightLeft className="h-3.5 w-3.5 text-primary/60" /> Dê-para: <span className="text-primary font-black">{req.details?.conteinerDePara || '—'}</span>
                  </div>
                </div>

                <div className="hidden xl:flex flex-col justify-center space-y-1.5 border-l border-border/50 pl-6">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
                    <Calendar className="h-3.5 w-3.5 text-primary/60" /> Chegada: <span className="text-foreground">{req.details?.dataChegada ? new Date(req.details.dataChegada).toLocaleDateString('pt-BR') : '—'}</span>
                  </div>
                  {!req.details?.colunaAS && (
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
                      <Timer className="h-3.5 w-3.5 text-primary/60" /> Vencimento (M): <span className={cn("font-black", getDemurrageColor(req.details?.demurrageVencimento))}>
                        {req.details?.demurrageVencimento ? new Date(req.details.demurrageVencimento).toLocaleDateString('pt-BR') : 'SEM DATA'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 self-end lg:self-center">
                <div className="flex flex-col items-end min-w-[100px]">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    req.status === 'PENDENTE' ? 'text-warning' :
                    req.status === 'CARREGANDO' ? 'text-info' : 'text-success'
                  )}>
                    {req.status}
                  </span>
                  <div className="flex gap-1 mt-1.5">
                    <div className={cn("h-1.5 w-6 rounded-full transition-colors", req.status === 'PENDENTE' || req.status === 'CARREGANDO' || req.status === 'DESPACHADO' ? 'bg-primary' : 'bg-muted')} />
                    <div className={cn("h-1.5 w-6 rounded-full transition-colors", req.status === 'CARREGANDO' || req.status === 'DESPACHADO' ? 'bg-primary' : 'bg-muted')} />
                    <div className={cn("h-1.5 w-6 rounded-full transition-colors", req.status === 'DESPACHADO' ? 'bg-success shadow-sm shadow-success/40' : 'bg-muted')} />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {req.status === 'PENDENTE' && (
                    <Button 
                      onClick={() => updatePriorityStatus(req.id, 'CARREGANDO')}
                      className="h-10 px-4 gap-2 bg-info hover:bg-info/90 text-white font-bold border-b-4 border-info/70 active:border-b-0 active:translate-y-0.5 transition-all"
                    >
                      <Truck className="h-4 w-4" /> CARREGAR
                    </Button>
                  )}
                  {req.status === 'CARREGANDO' && (
                    <Button 
                      onClick={() => updatePriorityStatus(req.id, 'DESPACHADO')}
                      className="h-10 px-4 gap-2 bg-success hover:bg-success/90 text-white font-bold border-b-4 border-success/70 active:border-b-0 active:translate-y-0.5 transition-all"
                    >
                      <CheckCircle2 className="h-4 w-4" /> DESPACHAR
                    </Button>
                  )}
                  {req.status === 'DESPACHADO' && (
                    <div className="bg-success/10 text-success text-xs font-black flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-success/20">
                      <CheckCircle2 className="h-4 w-4" /> DESPACHADO
                    </div>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                    onClick={() => {
                      deletePriorityRequest(req.id);
                      toast.info("Solicitação removida.");
                    }}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}