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
  Timer,
  LayoutList,
  ChevronDown,
  ChevronRight
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

  const groupedRequests = useMemo(() => {
    const list = ds.priorityRequests.map(req => {
      const details = ds.cheios.find(c => c.conteiner === req.conteiner);
      return { ...req, details };
    });

    const sortFn = (a: any, b: any) => {
      const weight: Record<string, number> = { 'CRITICA': 3, 'ALTA': 2, 'NORMAL': 1 };
      const valA = weight[a.nivel] || 0;
      const valB = weight[b.nivel] || 0;
      return valB - valA || new Date(b.solicitadoEm).getTime() - new Date(a.solicitadoEm).getTime();
    };

    return {
      pendentes: list.filter(r => r.status === 'PENDENTE').sort(sortFn),
      carregando: list.filter(r => r.status === 'CARREGANDO').sort(sortFn),
      despachados: list.filter(r => r.status === 'DESPACHADO').sort((a, b) => 
        new Date(b.solicitadoEm).getTime() - new Date(a.solicitadoEm).getTime()
      )
    };
  }, [ds.priorityRequests, ds.cheios]);

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

  const getDemurrageColor = (dateStr?: string) => {
    if (!dateStr) return "text-muted-foreground";
    const date = new Date(dateStr);
    const diff = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return "text-destructive font-black";
    if (diff <= 3) return "text-warning font-black";
    return "text-success font-bold";
  };

  const RequestCard = ({ req }: { req: any }) => (
    <div 
      className={cn(
        "group rounded-xl border p-3 flex flex-col md:flex-row md:items-center gap-4 transition-all hover:shadow-sm bg-card relative overflow-hidden",
        req.nivel === 'CRITICA' && req.status !== 'DESPACHADO' ? 'border-l-4 border-l-destructive' : 'border-border'
      )}
    >
      <div className={cn(
        "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
        req.nivel === 'CRITICA' && req.status !== 'DESPACHADO' ? 'bg-destructive/10 text-destructive' :
        req.nivel === 'ALTA' && req.status !== 'DESPACHADO' ? 'bg-warning/10 text-warning-foreground' :
        req.status === 'DESPACHADO' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
      )}>
        <Zap className={cn("h-5 w-5", req.status === 'PENDENTE' && 'animate-pulse')} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">{req.conteiner}</span>
          <StatusBadge tone={
            req.status === 'DESPACHADO' ? 'success' :
            req.nivel === 'CRITICA' ? 'destructive' :
            req.nivel === 'ALTA' ? 'warning' : 'primary'
          }>
            {req.nivel}
          </StatusBadge>
          {req.details?.conteinerDePara && (
            <span className="text-[10px] bg-primary/10 px-1.5 py-0.5 rounded font-bold text-primary flex items-center gap-1">
              <ArrowRightLeft className="h-3 w-3" /> {req.details.conteinerDePara}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> {new Date(req.solicitadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <Ship className="h-3 w-3" /> {req.details?.armador || 'N/A'}
          </div>
          {!req.details?.colunaAS && req.details?.demurrageVencimento && (
            <div className={cn("text-[11px] flex items-center gap-1", getDemurrageColor(req.details.demurrageVencimento))}>
              <Timer className="h-3 w-3" /> Expira: {new Date(req.details.demurrageVencimento).toLocaleDateString('pt-BR')}
            </div>
          )}
          {req.observacao && (
            <div className="text-[11px] text-primary italic truncate max-w-[200px]">
              "{req.observacao}"
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 self-end md:self-center">
        {req.status === 'PENDENTE' && (
          <Button 
            size="sm"
            onClick={() => updatePriorityStatus(req.id, 'CARREGANDO')}
            className="h-8 px-3 bg-info hover:bg-info/90 text-white font-bold"
          >
            <Truck className="h-3.5 w-3.5 mr-1.5" /> CARREGAR
          </Button>
        )}
        {req.status === 'CARREGANDO' && (
          <Button 
            size="sm"
            onClick={() => updatePriorityStatus(req.id, 'DESPACHADO')}
            className="h-8 px-3 bg-success hover:bg-success/90 text-white font-bold"
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> DESPACHAR
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => {
            deletePriorityRequest(req.id);
            toast.info("Removido.");
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <AppShell>
      <PageHeader 
        title="Painel de Prioridades" 
        subtitle="Gestão diária de expedição Renault"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearFinished} className="hidden sm:flex gap-2 text-xs">
              <Eraser className="h-3.5 w-3.5" /> Limpar Concluídos
            </Button>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-md">
                  <Plus className="h-4 w-4" /> Solicitar
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleCreateRequest}>
                  <DialogHeader>
                    <DialogTitle>Nova Solicitação Renault</DialogTitle>
                    <DialogDescription>Selecione um container em pátio para priorizar.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-6 py-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-bold text-primary">Localizar Container</Label>
                      <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between h-12 text-left font-normal border-2"
                          >
                            {selectedContainer
                              ? availableContainers.find((c) => c.conteiner === selectedContainer)?.conteiner
                              : "Buscar por número ou dê-para..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[450px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Ex: CMAU, MSC, Dê-para..." />
                            <CommandList>
                              <CommandEmpty>Nenhum container disponível.</CommandEmpty>
                              <CommandGroup>
                                {availableContainers.map((c) => (
                                  <CommandItem
                                    key={c.conteiner}
                                    value={`${c.conteiner} ${c.armador} ${c.conteinerDePara}`}
                                    onSelect={() => {
                                      setSelectedContainer(c.conteiner);
                                      setSearchOpen(false);
                                    }}
                                    className="flex flex-col items-start py-2 px-4"
                                  >
                                    <div className="font-bold text-primary">{c.conteiner}</div>
                                    <div className="flex gap-2 mt-1">
                                      <span className="text-[10px] font-bold text-muted-foreground uppercase">{c.armador}</span>
                                      {c.conteinerDePara && (
                                        <span className="text-[10px] font-bold text-primary">Dê-para: {c.conteinerDePara}</span>
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
                            <SelectItem value="ALTA">🟠 Alta</SelectItem>
                            <SelectItem value="CRITICA">🔴 Crítica</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold">Observação</Label>
                        <Input name="observacao" placeholder="Opcional" className="h-11 border-2" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full h-12 font-bold">Adicionar à Fila</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="px-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Aguardando" value={stats.pendentes} icon={Clock} tone="warning" />
        <StatCard label="Em Carga" value={stats.carregando} icon={Truck} tone="info" />
        <StatCard label="Despachados" value={stats.despachados} icon={CheckCircle2} tone="success" />
        <StatCard label="Críticos" value={stats.criticos} icon={AlertTriangle} tone="destructive" />
      </div>

      <div className="px-6 mt-6 pb-20 space-y-8">
        {/* SEÇÃO: PENDENTES */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-1 bg-warning rounded-full" />
            <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
              Aguardando Início <span className="text-[10px] bg-warning/20 text-warning-foreground px-2 py-0.5 rounded-full">{groupedRequests.pendentes.length}</span>
            </h3>
          </div>
          <div className="space-y-2">
            {groupedRequests.pendentes.length === 0 ? (
              <p className="text-xs text-muted-foreground italic pl-3">Nenhuma solicitação pendente.</p>
            ) : (
              groupedRequests.pendentes.map(req => <RequestCard key={req.id} req={req} />)
            )}
          </div>
        </section>

        {/* SEÇÃO: EM CARGA */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-1 bg-info rounded-full" />
            <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
              Em Processo de Carga <span className="text-[10px] bg-info/20 text-info px-2 py-0.5 rounded-full">{groupedRequests.carregando.length}</span>
            </h3>
          </div>
          <div className="space-y-2">
            {groupedRequests.carregando.length === 0 ? (
              <p className="text-xs text-muted-foreground italic pl-3">Nenhum container sendo carregado no momento.</p>
            ) : (
              groupedRequests.carregando.map(req => <RequestCard key={req.id} req={req} />)
            )}
          </div>
        </section>

        {/* SEÇÃO: CONCLUÍDOS */}
        <section className="opacity-70">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-1 bg-success rounded-full" />
            <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
              Despachados Hoje <span className="text-[10px] bg-success/20 text-success px-2 py-0.5 rounded-full">{groupedRequests.despachados.length}</span>
            </h3>
          </div>
          <div className="space-y-2">
            {groupedRequests.despachados.length === 0 ? (
              <p className="text-xs text-muted-foreground italic pl-3">Nenhum despacho registrado hoje.</p>
            ) : (
              groupedRequests.despachados.slice(0, 20).map(req => <RequestCard key={req.id} req={req} />)
            )}
            {groupedRequests.despachados.length > 20 && (
              <p className="text-center text-[11px] text-muted-foreground py-2">Mostrando as últimas 20 conclusões. Use "Limpar Concluídos" para resetar a lista.</p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}