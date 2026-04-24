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
 * Versão Compacta do Sinaleiro
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
    <div className="flex items-center gap-1 mt-2 bg-muted/20 p-1.5 rounded-md border border-border/40">
      {steps.map((step, idx) => {
        const isPast = idx < currentIndex;
        const isCurrent = idx === currentIndex;

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-0.5 flex-1">
              <div 
                className={cn(
                  "h-1.5 w-full rounded-full transition-all duration-500",
                  isPast ? step.color : 
                  isCurrent ? `${step.color} animate-pulse` : 
                  "bg-muted-foreground/15"
                )} 
              />
              <span className={cn(
                "text-[8px] font-bold uppercase tracking-tighter",
                isCurrent ? "text-foreground" : "text-muted-foreground/50"
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
      "group rounded-lg border p-2.5 bg-card transition-all hover:bg-muted/5",
      req.status === 'FINALIZADO' ? 'opacity-50 border-dashed bg-muted/20' : 'border-border shadow-sm'
    )}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <div className={cn(
            "h-7 w-7 rounded flex items-center justify-center shrink-0",
            req.nivel === 'CRITICA' ? "bg-destructive text-white" :
            req.nivel === 'ALTA' ? "bg-warning text-warning-foreground" : "bg-primary text-white"
          )}>
            <Zap className="h-4 w-4" />
          </div>
          
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight">{req.conteiner}</span>
              {req.details?.conteinerDePara && (
                <span className="text-[9px] bg-info/10 text-info px-1.5 py-0 rounded font-bold border border-info/20">
                  {req.details.conteinerDePara}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
              <div className="flex items-center gap-1 font-bold text-foreground/80">
                <Factory className="h-3 w-3 text-primary" /> {req.fabricaDestino}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {new Date(req.solicitadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isTransportadora && req.status === 'PENDENTE' && (
            <Button size="sm" onClick={() => confirmAction(req.id, 'CARREGANDO', 'Iniciar Carga')} className="h-7 px-2 text-[10px] bg-destructive hover:bg-destructive/90 text-white font-bold">
              INICIAR
            </Button>
          )}
          {isTransportadora && req.status === 'CARREGANDO' && (
            <Button size="sm" onClick={() => confirmAction(req.id, 'DESPACHADO', 'Despachar')} className="h-7 px-2 text-[10px] bg-warning hover:bg-warning/90 text-warning-foreground font-bold">
              DESPACHAR
            </Button>
          )}
          {isTransportadora && req.status === 'DESPACHADO' && (
            <Button size="sm" onClick={() => confirmAction(req.id, 'FINALIZADO', 'Finalizar')} className="h-7 px-2 text-[10px] bg-success hover:bg-success/90 text-white font-bold">
              FINALIZAR
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => deletePriorityRequest(req.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <StatusStepper currentStatus={req.status} />
      
      {req.observacao && (
        <div className="mt-2 p-2 bg-muted/50 rounded text-[11px] text-muted-foreground italic border-l border-primary/20">
          "{req.observacao}"
        </div>
      )}
    </div>
  );

  const confirmAction = (id: string, newStatus: RequestStatus, actionLabel: string) => {
    const currentStatus = ds.priorityRequests.find(r => r.id === id)?.status;
    if (!currentStatus || currentStatus === newStatus) return;

    const confirmDialog = (
      <Dialog open={true} onClose={() => setIsConfirmOpen(false)}>
        <DialogTrigger asChild>
          <Button className="bg-warning hover:bg-warning/90 font-bold h-8 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" /> {actionLabel}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <p className="text-sm text-muted-foreground">
            Você está prestes a alterar o status de "{currentStatus}" para "{newStatus}". Deseja continuar?
          </p>
        </DialogContent>
        <DialogFooter>
          <Button type="button" onClick={() => setIsConfirmOpen(false)} className="w-full">
            <ChevronRight className="h-3.5 w-3.5" /> Cancelar
          </Button>
          <Button type="button" onClick={() => {
            setIsConfirmOpen(false);
            updatePriorityStatus(id, newStatus);
          }} className="w-full bg-success hover:bg-success/90 text-white font-bold">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Confirmar
          </Button>
        </DialogFooter>
      </Dialog>
    );

    setIsConfirmOpen(true);
  };

  return (
    <AppShell>
      <PageHeader 
        title="Painel de Prioridades" 
        subtitle="Controle Operacional"
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
                      <DialogTitle>Solicitar Prioridade Renault</DialogTitle>
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
        <div className="bg-destructive/10 border border-destructive/20 p-2 rounded-lg text-center">
          <div className="text-[8px] uppercase font-bold text-destructive">Pare (Fila)</div>
          <div className="text-lg font-black">{stats.pendentes}</div>
        </div>
        <div className="bg-warning/10 border border-warning/20 p-2 rounded-lg text-center">
          <div className="text-[8px] uppercase font-bold text-warning-foreground">Atenção (Carga)</div>
          <div className="text-lg font-black">{stats.carregando}</div>
        </div>
        <div className="bg-success/10 border border-success/20 p-2 rounded-lg text-center">
          <div className="text-[8px] uppercase font-bold text-success">Siga (Trânsito)</div>
          <div className="text-lg font-black">{stats.despachados}</div>
        </div>
        <div className="bg-info/10 border border-info/20 p-2 rounded-lg text-center">
          <div className="text-[8px] uppercase font-bold text-info">Finalizados</div>
          <div className="text-lg font-black">{stats.finalizados}</div>
        </div>
      </div>

      <div className="px-6 pb-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
        {sortedRequests.length === 0 ? (
          <div className="col-span-full text-center py-10 border border-dashed rounded-lg text-muted-foreground text-xs italic">
            Sem solicitações na fila.
          </div>
        ) : (
          sortedRequests.map(req => <RequestCard key={req.id} req={req} />)
        )}
      </div>
    </AppShell>
  );
}