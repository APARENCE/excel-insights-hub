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
  ArrowRightLeft,
  ChevronsUpDown,
  Eraser,
  Timer,
  Factory,
  PackageCheck,
  ChevronRight,
  MapPin
} from 'lucide-react';
import { AppShell, PageHeader } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
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

/**
 * Componente de Sinaleiro / Stepper Operacional
 */
function StatusStepper({ currentStatus }: { currentStatus: RequestStatus }) {
  const steps = [
    { id: 'PENDENTE', label: 'Fila', color: 'bg-destructive' },
    { id: 'CARREGANDO', label: 'Carga', color: 'bg-warning' },
    { id: 'DESPACHADO', label: 'Trânsito', color: 'bg-success' },
    { id: 'FINALIZADO', label: 'OK', color: 'bg-info' },
  ];

  const currentIndex = steps.findIndex(s => s.id === currentStatus);

  return (
    <div className="flex items-center gap-1.5 mt-3 bg-muted/30 p-2 rounded-lg border border-border/50">
      {steps.map((step, idx) => {
        const isPast = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isFuture = idx > currentIndex;

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1 flex-1">
              <div 
                className={cn(
                  "h-2.5 w-full rounded-full transition-all duration-500",
                  isPast ? step.color : 
                  isCurrent ? `${step.color} animate-pulse shadow-[0_0_8px_var(--color-primary)]` : 
                  "bg-muted-foreground/20"
                )} 
              />
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-tighter",
                isCurrent ? "text-foreground" : "text-muted-foreground/60"
              )}>
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground/20 mt-[-14px]" />
            )}
          </React.Fragment>
        );
      })}
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
      // Primeiro por status (Pendente > Carregando > Despachado > Finalizado)
      const statusWeight: Record<RequestStatus, number> = { 'PENDENTE': 4, 'CARREGANDO': 3, 'DESPACHADO': 2, 'FINALIZADO': 1 };
      if (statusWeight[a.status] !== statusWeight[b.status]) {
        return statusWeight[b.status] - statusWeight[a.status];
      }
      // Segundo por nível de prioridade
      if (weight[a.nivel] !== weight[b.nivel]) {
        return weight[b.nivel] - weight[a.nivel];
      }
      // Por fim por data
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

    addPriorityRequest({
      id: crypto.randomUUID(),
      conteiner: selectedContainer,
      nivel,
      status: 'PENDENTE',
      solicitadoEm: new Date().toISOString(),
      fabricaDestino: fabricaDestino || 'CVU',
      observacao: formData.get('observacao') as string
    });

    toast.success("Prioridade agendada!");
    setIsAddOpen(false);
    setSelectedContainer("");
  };

  const RequestCard = ({ req }: { req: any }) => (
    <div className={cn(
      "group rounded-xl border p-4 bg-card transition-all hover:ring-1 hover:ring-primary/20",
      req.status === 'FINALIZADO' ? 'opacity-60 border-dashed' : 'border-border shadow-sm'
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl font-black tracking-tight">{req.conteiner}</span>
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-black uppercase",
              req.nivel === 'CRITICA' ? "bg-destructive text-white" :
              req.nivel === 'ALTA' ? "bg-warning text-warning-foreground" : "bg-primary text-white"
            )}>
              {req.nivel}
            </span>
            {req.details?.conteinerDePara && (
              <span className="text-[10px] bg-info/10 text-info px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <ArrowRightLeft className="h-3 w-3" /> {req.details.conteinerDePara}
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1 font-bold text-foreground">
              <Factory className="h-3.5 w-3.5 text-primary" /> {req.fabricaDestino}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {new Date(req.solicitadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            {req.details?.armador && <div>{req.details.armador}</div>}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isTransportadora && req.status === 'PENDENTE' && (
            <Button size="sm" onClick={() => updatePriorityStatus(req.id, 'CARREGANDO')} className="h-9 bg-destructive hover:bg-destructive/90 text-white font-bold">
              <Truck className="h-4 w-4 mr-1.5" /> INICIAR CARGA
            </Button>
          )}
          {isTransportadora && req.status === 'CARREGANDO' && (
            <Button size="sm" onClick={() => updatePriorityStatus(req.id, 'DESPACHADO')} className="h-9 bg-warning hover:bg-warning/90 text-warning-foreground font-bold">
              <MapPin className="h-4 w-4 mr-1.5" /> DESPACHAR
            </Button>
          )}
          {isTransportadora && req.status === 'DESPACHADO' && (
            <Button size="sm" onClick={() => updatePriorityStatus(req.id, 'FINALIZADO')} className="h-9 bg-success hover:bg-success/90 text-white font-bold">
              <PackageCheck className="h-4 w-4 mr-1.5" /> FINALIZAR
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => deletePriorityRequest(req.id)} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <StatusStepper currentStatus={req.status} />
      
      {req.observacao && (
        <div className="mt-3 p-2 bg-muted/50 rounded text-[11px] text-muted-foreground italic border-l-2 border-primary/20">
          "{req.observacao}"
        </div>
      )}
    </div>
  );

  return (
    <AppShell>
      <PageHeader 
        title="Controle Sinaleiro de Prioridades" 
        subtitle={isCliente ? "Renault: Solicitação de Carga" : "Transportadora: Gestão de Fluxo"}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setDataset(prev => ({...prev, priorityRequests: prev.priorityRequests.filter(r => r.status !== 'FINALIZADO')}))} className="text-xs">
              <Eraser className="h-4 w-4 mr-2" /> Resetar Dia
            </Button>
            {isCliente && (
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 font-bold shadow-lg">
                    <Plus className="h-4 w-4 mr-1" /> NOVA PRIORIDADE
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleCreateRequest}>
                    <DialogHeader>
                      <DialogTitle>Solicitar Prioridade Renault</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>Container no Pátio</Label>
                        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between font-normal border-2">
                              {selectedContainer || "Selecione o container..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[450px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Filtrar por ID ou Dê-para..." />
                              <CommandList>
                                <CommandEmpty>Nenhum disponível no pátio.</CommandEmpty>
                                <CommandGroup>
                                  {availableContainers.map((c) => (
                                    <CommandItem key={c.conteiner} value={`${c.conteiner} ${c.conteinerDePara}`} onSelect={() => { setSelectedContainer(c.conteiner); setSearchOpen(false); }} className="cursor-pointer">
                                      <div className="flex flex-col">
                                        <span className="font-bold">{c.conteiner}</span>
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
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Destino</Label>
                          <Select value={fabricaSelect} onValueChange={setFabricaSelect}>
                            <SelectTrigger className="border-2"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="CVU">CVU</SelectItem><SelectItem value="CVP">CVP</SelectItem><SelectItem value="OUTROS">Outra...</SelectItem></SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Urgência</Label>
                          <Select name="nivel" defaultValue="NORMAL">
                            <SelectTrigger className="border-2"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="NORMAL">Normal</SelectItem><SelectItem value="ALTA">Alta</SelectItem><SelectItem value="CRITICA">Crítica</SelectItem></SelectContent>
                          </Select>
                        </div>
                      </div>
                      {fabricaSelect === 'OUTROS' && <Input placeholder="Nome da fábrica" value={customFabrica} onChange={(e) => setCustomFabrica(e.target.value)} className="border-2" />}
                      <Input name="observacao" placeholder="Observações (opcional)" className="border-2" />
                    </div>
                    <DialogFooter><Button type="submit" className="w-full font-bold h-11">ENVIAR PARA OPERAÇÃO</Button></DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      />

      <div className="px-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Aguardando (Pare)" value={stats.pendentes} icon={AlertTriangle} tone="destructive" />
        <StatCard label="Em Carga (Atenção)" value={stats.carregando} icon={Truck} tone="warning" />
        <StatCard label="Em Trânsito (Siga)" value={stats.despachados} icon={MapPin} tone="success" />
        <StatCard label="Finalizados" value={stats.finalizados} icon={PackageCheck} tone="info" />
      </div>

      <div className="px-6 mt-6 pb-20 space-y-3">
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
          <Zap className="h-3 w-3 text-primary animate-pulse" /> Fila de Execução Ordenada
        </div>
        {sortedRequests.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-xl border-border/50">
            <p className="text-muted-foreground text-sm">Nenhuma prioridade na fila.</p>
          </div>
        ) : (
          sortedRequests.map(req => <RequestCard key={req.id} req={req} />)
        )}
      </div>
    </AppShell>
  );
}