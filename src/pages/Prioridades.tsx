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
  Ship
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
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useDataset, addPriorityRequest, updatePriorityStatus, deletePriorityRequest } from "@/lib/store";
import { toast } from "sonner";
import { PriorityLevel, RequestStatus } from '@/lib/types';

export default function PrioridadesPage() {
  const ds = useDataset();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filter, setFilter] = useState<RequestStatus | 'TODOS'>('TODOS');

  // Filtra apenas containers que estão no pátio conforme as regras da Coluna N
  const availableContainers = useMemo(() => {
    const existingIds = new Set(ds.priorityRequests.map(r => r.conteiner));
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
    const list = filter === 'TODOS' 
      ? ds.priorityRequests 
      : ds.priorityRequests.filter(r => r.status === filter);
    
    // Mapeia os dados extras do estoque para exibição
    return list.map(req => {
      const details = ds.cheios.find(c => c.conteiner === req.conteiner);
      return { ...req, details };
    });
  }, [ds.priorityRequests, ds.cheios, filter]);

  const handleCreateRequest = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const conteiner = formData.get('conteiner') as string;
    const nivel = formData.get('nivel') as PriorityLevel;
    const observacao = formData.get('observacao') as string;

    if (!conteiner) {
      toast.error("Selecione um container.");
      return;
    }

    addPriorityRequest({
      id: crypto.randomUUID(),
      conteiner,
      nivel,
      status: 'PENDENTE',
      solicitadoEm: new Date().toISOString(),
      observacao
    });

    toast.success(`Prioridade solicitada para ${conteiner}`);
    setIsAddOpen(false);
  };

  return (
    <AppShell>
      <PageHeader 
        title="Prioridades Fábrica" 
        subtitle="Expedição de containers em pátio para envio Renault"
        actions={
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4" /> Nova Solicitação
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleCreateRequest}>
                <DialogHeader>
                  <DialogTitle>Solicitar Prioridade</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Selecionar Container (Col A)</Label>
                    <Select name="conteiner" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Busque por container no pátio..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {availableContainers.length === 0 ? (
                          <div className="p-2 text-xs text-muted-foreground text-center">Nenhum container disponível no pátio.</div>
                        ) : (
                          availableContainers.map(c => (
                            <SelectItem key={c.conteiner} value={c.conteiner}>
                              <div className="flex flex-col text-left py-0.5">
                                <span className="font-bold">{c.conteiner}</span>
                                <span className="text-[10px] text-muted-foreground uppercase">
                                  {c.armador || 'N/A'} • Dê-para: {c.conteinerDePara || '—'}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nível de Urgência</Label>
                    <Select name="nivel" defaultValue="NORMAL">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NORMAL">Normal</SelectItem>
                        <SelectItem value="ALTA">Alta Urgência</SelectItem>
                        <SelectItem value="CRITICA">Crítica (Imediato)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Observação / Destino Renault</Label>
                    <Input name="observacao" placeholder="Ex: Linha de montagem X" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Confirmar Agendamento</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="px-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Aguardando" value={stats.pendentes} icon={Clock} tone="warning" />
        <StatCard label="Carregando" value={stats.carregando} icon={Truck} tone="info" />
        <StatCard label="Enviados Hoje" value={stats.despachados} icon={CheckCircle2} tone="success" />
        <StatCard label="Urgência Crítica" value={stats.criticos} icon={AlertTriangle} tone="destructive" />
      </div>

      <div className="px-6 mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtro de Status:</span>
          <div className="flex gap-1 ml-2">
            {(['TODOS', 'PENDENTE', 'CARREGANDO', 'DESPACHADO'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  filter === s 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-card text-muted-foreground border-border hover:bg-accent"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 mt-4 pb-10 space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <Zap className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-muted-foreground">Nenhuma solicitação encontrada</h3>
            <p className="text-xs text-muted-foreground mt-1">Selecione um container no pátio para agendar a prioridade.</p>
          </div>
        ) : (
          filteredRequests.map(req => (
            <div key={req.id} className="rounded-xl border border-border bg-card p-4 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-sm transition-shadow">
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center shrink-0 ${
                req.nivel === 'CRITICA' ? 'bg-destructive/10 text-destructive' :
                req.nivel === 'ALTA' ? 'bg-warning/10 text-warning-foreground' :
                'bg-primary/10 text-primary'
              }`}>
                <Zap className="h-6 w-6" />
              </div>
              
              <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold tracking-tight">{req.conteiner}</span>
                    <StatusBadge tone={
                      req.nivel === 'CRITICA' ? 'destructive' :
                      req.nivel === 'ALTA' ? 'warning' : 'primary'
                    }>
                      {req.nivel}
                    </StatusBadge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                    <span className="flex items-center gap-1 font-medium text-primary">
                      <Clock className="h-3 w-3" /> {new Date(req.solicitadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {req.observacao && <span className="truncate max-w-[200px]">Destino: {req.observacao}</span>}
                  </div>
                </div>

                <div className="flex flex-col justify-center border-l border-border/50 pl-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Ship className="h-3 w-3" /> 
                    <span className="uppercase font-semibold text-foreground/80">Armador: {req.details?.armador || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <ArrowRightLeft className="h-3 w-3" />
                    <span className="uppercase font-semibold text-foreground/80">Dê-para (Col X): {req.details?.conteinerDePara || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end md:self-center">
                <div className="flex flex-col items-end mr-2">
                  <span className={`text-[10px] font-bold uppercase ${
                    req.status === 'PENDENTE' ? 'text-warning' :
                    req.status === 'CARREGANDO' ? 'text-info' :
                    'text-success'
                  }`}>
                    {req.status}
                  </span>
                  <div className="flex gap-0.5 mt-0.5">
                    <div className={`h-1.5 w-4 rounded-full ${req.status === 'PENDENTE' || req.status === 'CARREGANDO' || req.status === 'DESPACHADO' ? 'bg-primary' : 'bg-muted'}`} />
                    <div className={`h-1.5 w-4 rounded-full ${req.status === 'CARREGANDO' || req.status === 'DESPACHADO' ? 'bg-primary' : 'bg-muted'}`} />
                    <div className={`h-1.5 w-4 rounded-full ${req.status === 'DESPACHADO' ? 'bg-primary' : 'bg-muted'}`} />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {req.status === 'PENDENTE' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => updatePriorityStatus(req.id, 'CARREGANDO')}
                      className="h-9 gap-1.5 border-info text-info hover:bg-info/10 font-bold"
                    >
                      <Truck className="h-4 w-4" /> Iniciar Carga
                    </Button>
                  )}
                  {req.status === 'CARREGANDO' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => updatePriorityStatus(req.id, 'DESPACHADO')}
                      className="h-9 gap-1.5 border-success text-success hover:bg-success/10 font-bold"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Despachar
                    </Button>
                  )}
                  {req.status === 'DESPACHADO' && (
                    <div className="bg-success/10 text-success text-xs font-bold flex items-center gap-1.5 px-3 py-2 rounded-md">
                      <CheckCircle2 className="h-4 w-4" /> ENVIADO
                    </div>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                    onClick={() => {
                      deletePriorityRequest(req.id);
                      toast.info("Agendamento removido.");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
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