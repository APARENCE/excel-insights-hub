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
  ChevronRight,
  Filter
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

  // Filtra apenas containers que estão no pátio e não estão na lista de prioridades
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
    return filter === 'TODOS' 
      ? ds.priorityRequests 
      : ds.priorityRequests.filter(r => r.status === filter);
  }, [ds.priorityRequests, filter]);

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
        subtitle="Gestão de containers urgentes para envio"
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
                    <Label>Container no Pátio</Label>
                    <Select name="conteiner" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um container..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableContainers.length === 0 ? (
                          <div className="p-2 text-xs text-muted-foreground">Nenhum container disponível no pátio.</div>
                        ) : (
                          availableContainers.map(c => (
                            <SelectItem key={c.conteiner} value={c.conteiner}>
                              {c.conteiner} ({c.tipo})
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
                    <Label>Observação / Destino</Label>
                    <Input name="observacao" placeholder="Ex: Linha de montagem X" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Confirmar Solicitação</Button>
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
          <span className="text-sm font-medium">Filtrar por:</span>
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

      <div className="px-6 mt-4 pb-10 space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <Zap className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-muted-foreground">Nenhuma solicitação encontrada</h3>
            <p className="text-xs text-muted-foreground mt-1">Crie uma nova solicitação para iniciar o despacho prioritário.</p>
          </div>
        ) : (
          filteredRequests.map(req => (
            <div key={req.id} className="rounded-xl border border-border bg-card p-4 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-sm transition-shadow">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                req.nivel === 'CRITICA' ? 'bg-destructive/10 text-destructive' :
                req.nivel === 'ALTA' ? 'bg-warning/10 text-warning-foreground' :
                'bg-primary/10 text-primary'
              }`}>
                <Zap className="h-5 w-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold">{req.conteiner}</span>
                  <StatusBadge tone={
                    req.nivel === 'CRITICA' ? 'destructive' :
                    req.nivel === 'ALTA' ? 'warning' : 'primary'
                  }>
                    {req.nivel}
                  </StatusBadge>
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {new Date(req.solicitadoEm).toLocaleString('pt-BR')}
                  </span>
                  {req.observacao && <span>• {req.observacao}</span>}
                </div>
              </div>

              <div className="flex items-center gap-3 self-end md:self-center">
                <div className="flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${
                    req.status === 'PENDENTE' ? 'bg-warning' :
                    req.status === 'CARREGANDO' ? 'bg-info' :
                    'bg-success'
                  }`} />
                  <span className="text-xs font-semibold">{req.status}</span>
                </div>
                
                <div className="h-8 w-[1px] bg-border hidden md:block mx-2" />
                
                <div className="flex items-center gap-2">
                  {req.status === 'PENDENTE' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => updatePriorityStatus(req.id, 'CARREGANDO')}
                      className="h-8 gap-1 border-info text-info hover:bg-info/10"
                    >
                      <Truck className="h-3.5 w-3.5" /> Iniciar Carga
                    </Button>
                  )}
                  {req.status === 'CARREGANDO' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => updatePriorityStatus(req.id, 'DESPACHADO')}
                      className="h-8 gap-1 border-success text-success hover:bg-success/10"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Despachar
                    </Button>
                  )}
                  {req.status === 'DESPACHADO' && (
                    <div className="text-success text-xs font-medium flex items-center gap-1 px-3">
                      <CheckCircle2 className="h-4 w-4" /> Enviado
                    </div>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      deletePriorityRequest(req.id);
                      toast.info("Solicitação removida.");
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