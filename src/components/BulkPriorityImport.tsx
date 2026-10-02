"use client";

import React, { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle, Loader2, Eye, Download } from "lucide-react";
import { toast } from "sonner";
import { useDataset, addPriorityRequest } from "@/lib/store";
import { PriorityLevel, CheioRow } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BulkPriorityItem {
  conteiner: string;
  nivel: PriorityLevel;
  fabricaDestino: "CVP" | "CVU" | string;
  previsaoFabrica?: string;
  observacao?: string;
  // Matched container details
  matchedContainer?: CheioRow;
  matchStatus: "matched" | "not_found" | "already_pending" | "finalized";
  matchMessage: string;
}

interface ParsedSheetData {
  cvp: BulkPriorityItem[];
  cvu: BulkPriorityItem[];
}

function normalizeSheetName(name: string): string {
  return name
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function findProgramacaoSheet(wb: XLSX.WorkBook, factory: "CVP" | "CVU"): string | undefined {
  const names = wb.SheetNames;
  const factoryUpper = factory.toUpperCase();
  
  console.log(`[BulkImport] Looking for ${factory} sheet. Available sheets:`, names);
  
  // Strategy 1: Exact match after normalization (handles accents, case, extra spaces)
  const candidates = [
    `PROGRAMACAO ${factoryUpper}`,
    `PROGRAMACAO ${factoryUpper} `,
    `PROGRAMA ${factoryUpper}`,
    `PROGRAMA ${factoryUpper} `,
  ];
  
  const normalize = (value: string) => normalizeSheetName(value);
  
  for (const c of candidates) {
    const normalizedCandidate = normalize(c);
    const found = names.find((n) => normalize(n) === normalizedCandidate);
    if (found) {
      console.log(`[BulkImport] Found exact match for ${factory}: "${found}"`);
      return found;
    }
  }
  
  // Strategy 2: Contains both "PROGRAMACAO"/"PROGRAMA" AND factory code
  for (const n of names) {
    const normalized = normalize(n);
    const hasProgramacao = normalized.includes("PROGRAMACAO") || normalized.includes("PROGRAMA");
    const hasFactory = normalized.includes(factoryUpper);
    if (hasProgramacao && hasFactory) {
      console.log(`[BulkImport] Found contains match for ${factory}: "${n}" (normalized: "${normalized}")`);
      return n;
    }
  }
  
  // Strategy 3: Just contains factory code (fallback)
  for (const n of names) {
    const normalized = normalize(n);
    if (normalized.includes(factoryUpper)) {
      console.log(`[BulkImport] Found factory-only match for ${factory}: "${n}" (normalized: "${normalized}")`);
      return n;
    }
  }
  
  console.log(`[BulkImport] No sheet found for ${factory}`);
  return undefined;
}

function parseProgramacaoSheet(ws: XLSX.WorkSheet, factory: "CVP" | "CVU"): BulkPriorityItem[] {
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });
  console.log(`[BulkImport] Parsing ${factory} sheet. Rows: ${aoa.length}`);
  if (aoa.length < 2) {
    console.log(`[BulkImport] ${factory} sheet has insufficient rows`);
    return [];
  }
  
  const headers = aoa[0] as string[];
  console.log(`[BulkImport] ${factory} headers:`, headers);
  
  // Try to find column indices for common fields
  const findCol = (patterns: string[]) => {
    return headers.findIndex(h => 
      patterns.some(p => h && h.toString().toUpperCase().includes(p.toUpperCase()))
    );
  };
  
  const colContainer = findCol(["CONTAINER", "CONTEINER", "CONTÊINER", "NÚMERO", "NUMERO", "ID"]);
    const colPriority = findCol(["PRIORIDADE", "NIVEL", "NÍVEL", "URGENCIA", "URGÊNCIA", "CRITICIDADE"]);
    const colFactory = findCol(["FABRICA", "FÁBRICA", "DESTINO", "FÁBRICA DESTINO"]);
    const colDate = findCol(["PREVISAO", "PREVISÃO", "DATA", "ENTREGA", "PRAZO"]);
    const colObs = findCol(["OBS", "OBSERVAÇÃO", "OBSERVACAO", "NOTA", "COMENTARIO"]);
    
    console.log(`[BulkImport] ${factory} column indices:`, { colContainer, colPriority, colFactory, colDate, colObs });
    
    const results: BulkPriorityItem[] = [];
  
  for (let i = 1; i < aoa.length; i++) {
    const row = aoa[i];
    if (!row || row.length === 0) continue;
    
    const container = colContainer >= 0 ? String(row[colContainer] ?? "").trim() : "";
    if (!container) continue;
    
    let nivel: PriorityLevel = "NORMAL";
    if (colPriority >= 0) {
      const val = String(row[colPriority] ?? "").toUpperCase();
      if (val.includes("CRITIC") || val.includes("CRITICAL") || val === "3") nivel = "CRITICA";
      else if (val.includes("ALTA") || val === "2") nivel = "ALTA";
      else if (val.includes("NORMAL") || val === "1") nivel = "NORMAL";
    }
    
    let fabricaDestino = factory;
    if (colFactory >= 0) {
      const val = String(row[colFactory] ?? "").toUpperCase();
      if (val.includes("CVP")) fabricaDestino = "CVP";
      else if (val.includes("CVU")) fabricaDestino = "CVU";
      else if (val) fabricaDestino = val;
    }
    
    const previsao = colDate >= 0 && row[colDate] ? String(row[colDate]) : undefined;
    const observacao = colObs >= 0 && row[colObs] ? String(row[colObs]) : undefined;
    
    results.push({
          conteiner: container,
          nivel,
          fabricaDestino,
          previsaoFabrica: previsao,
          observacao,
          matchStatus: "not_found",
          matchMessage: "Aguardando verificação",
        });
      }
      
      console.log(`[BulkImport] ${factory} parsed ${results.length} items`);
      return results;
}

function matchContainers(items: BulkPriorityItem[], cheios: CheioRow[], existingRequests: any[]) {
  const cheiosMap = new Map(cheios.map(c => [c.conteiner, c]));
  const pendingContainers = new Set(
    existingRequests
      .filter(r => r.status !== "FINALIZADO")
      .map(r => r.conteiner)
  );
  const finalizedContainers = new Set(
    existingRequests
      .filter(r => r.status === "FINALIZADO")
      .map(r => r.conteiner)
  );
  
  return items.map(item => {
    const matched = cheiosMap.get(item.conteiner);
    if (!matched) {
      return {
        ...item,
        matchStatus: "not_found" as const,
        matchMessage: "Container não encontrado no pátio",
      };
    }
    
    if (finalizedContainers.has(item.conteiner)) {
      return {
        ...item,
        matchedContainer: matched,
        matchStatus: "finalized" as const,
        matchMessage: "Já finalizado anteriormente",
      };
    }
    
    if (pendingContainers.has(item.conteiner)) {
      return {
        ...item,
        matchedContainer: matched,
        matchStatus: "already_pending" as const,
        matchMessage: "Já possui prioridade pendente",
      };
    }
    
    return {
      ...item,
      matchedContainer: matched,
      matchStatus: "matched" as const,
      matchMessage: "Pronto para importar",
    };
  });
}

export default function BulkPriorityImport({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const ds = useDataset();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedSheetData | null>(null);
  const [matchedData, setMatchedData] = useState<BulkPriorityItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"CVP" | "CVU" | "ALL">("ALL");
  const [showOnlyImportable, setShowOnlyImportable] = useState(true);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    
    if (!f.name.endsWith(".xlsx") && !f.name.endsWith(".xls")) {
      toast.error("Arquivo deve ser .xlsx ou .xls");
      return;
    }
    
    setFile(f);
    setProcessing(true);
    toast.loading("Processando planilha...", { id: "bulk-import" });
    
    try {
      const buffer = await f.arrayBuffer();
      const wb = XLSX.read(buffer, { cellDates: true });
      
      const cvpSheet = findProgramacaoSheet(wb, "CVP");
      const cvuSheet = findProgramacaoSheet(wb, "CVU");
      
      const cvpData = cvpSheet ? parseProgramacaoSheet(wb.Sheets[cvpSheet], "CVP") : [];
      const cvuData = cvuSheet ? parseProgramacaoSheet(wb.Sheets[cvuSheet], "CVU") : [];
      
      const combined = [...cvpData, ...cvuData];
      const matched = matchContainers(combined, ds.cheios, ds.priorityRequests);
      
      setParsedData({ cvp: cvpData, cvu: cvuData });
      setMatchedData(matched);
      toast.success(`${matched.length} itens processados`, { id: "bulk-import" });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar planilha", { id: "bulk-import" });
    } finally {
      setProcessing(false);
    }
  }, [ds.cheios, ds.priorityRequests]);

  const handleImport = async () => {
      const toImport = matchedData.filter(
        m => m.matchStatus === "matched" || m.matchStatus === "not_found"
      );
      
      if (toImport.length === 0) {
        toast.error("Nenhum item válido para importar");
        return;
      }
      
      setProcessing(true);
      toast.loading(`Importando ${toImport.length} prioridades...`, { id: "bulk-import" });
      
      let success = 0;
      for (const item of toImport) {
        try {
          await addPriorityRequest({
            id: crypto.randomUUID(),
            conteiner: item.conteiner,
            nivel: item.nivel,
            status: "PENDENTE",
            solicitadoEm: new Date().toISOString(),
            fabricaDestino: item.fabricaDestino,
            previsaoFabrica: item.previsaoFabrica,
            observacao: item.observacao,
          });
          success++;
        } catch (e) {
          console.error("[BulkImport] Error adding priority:", e);
          toast.error(`Erro ao importar ${item.conteiner}: ${e instanceof Error ? e.message : 'Erro desconhecido'}`);
        }
      }
      
      if (success > 0) {
        toast.success(`${success} prioridades importadas com sucesso!`, { id: "bulk-import" });
        setFile(null);
        setParsedData(null);
        setMatchedData([]);
        onOpenChange(false);
      }
      setProcessing(false);
    };

  const filteredItems = matchedData.filter(item => {
    if (activeTab !== "ALL" && item.fabricaDestino !== activeTab) return false;
    if (showOnlyImportable) {
      return item.matchStatus === "matched" || item.matchStatus === "not_found";
    }
    return true;
  });

  const stats = {
    total: matchedData.length,
    matched: matchedData.filter(m => m.matchStatus === "matched").length,
    notFound: matchedData.filter(m => m.matchStatus === "not_found").length,
    alreadyPending: matchedData.filter(m => m.matchStatus === "already_pending").length,
    finalized: matchedData.filter(m => m.matchStatus === "finalized").length,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Importação em Massa de Prioridades</span>
            {file && (
              <Button variant="ghost" size="icon" onClick={() => {
                setFile(null);
                setParsedData(null);
                setMatchedData([]);
              }} className="text-destructive">
                <X className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {!file ? (
          <div className="py-8 space-y-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                processing ? "border-muted" : "border-border hover:border-primary/50"
              )}
              onClick={() => document.getElementById("bulk-file-input")?.click()}
            >
              <input
                id="bulk-file-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                disabled={processing}
              />
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-lg font-medium">Clique ou arraste a planilha Excel</p>
              <p className="text-sm text-muted-foreground mt-1">
                Suporta abas: <strong>"Programação CVP"</strong> e <strong>"Programação CVU"</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Colunas esperadas: Container, Prioridade (Crítica/Alta/Normal), Fábrica, Previsão, Obs
              </p>
            </div>
            
            <Card className="border-info/20 bg-info/5">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-info">Como preparar a planilha:</p>
                    <ul className="text-xs text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                      <li>Aba "Programação CVP" para containers destino CVP</li>
                      <li>Aba "Programação CVU" para containers destino CVU</li>
                      <li>Coluna Container (obrigatória)</li>
                      <li>Coluna Prioridade/Nível (opcional, padrão: Normal)</li>
                      <li>Coluna Fábrica/Destino (opcional, usa nome da aba)</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-info">Regras de importação:</p>
                    <ul className="text-xs text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                      <li>Containers já finalizados: ignorados</li>
                      <li>Containers com prioridade pendente: ignorados</li>
                      <li>Containers não encontrados no pátio: importados com aviso</li>
                      <li>Apenas containers "EM PATIO TLOG-SJP" ou "DEPARA EM PATIO TLOG-SJP" são válidos</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(parsedData?.cvp.length ?? 0) + (parsedData?.cvu.length ?? 0)} itens total • 
                  {stats.matched} prontos • {stats.notFound} não encontrados • 
                  {stats.alreadyPending} já pendentes • {stats.finalized} finalizados
                </p>
              </div>
              <Badge variant={stats.matched > 0 ? "default" : "secondary"}>
                <CheckCircle className="h-3 w-3 mr-1" /> {stats.matched} Importáveis
              </Badge>
            </div>

            <div className="flex gap-2 border-b pb-2">
              {["ALL", "CVP", "CVU"].map(tab => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab(tab as any)}
                >
                  {tab === "ALL" ? "Todas" : tab}
                  <Badge variant="secondary" className="ml-1">
                    {tab === "ALL" ? stats.total : filteredItems.filter(f => f.fabricaDestino === tab).length}
                  </Badge>
                </Button>
              ))}
              <label className="flex items-center gap-2 ml-auto text-sm">
                <Input type="checkbox" checked={showOnlyImportable} onChange={e => setShowOnlyImportable(e.target.checked)} />
                Apenas importáveis
              </label>
            </div>

            <ScrollArea className="max-h-[50vh]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left p-2 w-8">#</th>
                    <th className="text-left p-2">Container</th>
                    <th className="text-left p-2 w-24">Fábrica</th>
                    <th className="text-left p-2 w-24">Prioridade</th>
                    <th className="text-left p-2 w-32">Previsão</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2 w-48">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                        Nenhum item encontrado
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => (
                      <tr key={item.conteiner} className={cn(
                        "border-b border-border/50",
                        item.matchStatus === "matched" && "bg-success/5",
                        item.matchStatus === "not_found" && "bg-warning/5",
                        item.matchStatus === "already_pending" && "bg-muted/10 opacity-60",
                        item.matchStatus === "finalized" && "bg-destructive/5 opacity-40",
                      )}>
                        <td className="p-2 text-xs text-muted-foreground">{idx + 1}</td>
                        <td className="p-2 font-mono font-medium">{item.conteiner}</td>
                        <td className="p-2">
                          <Badge variant={item.fabricaDestino === "CVP" ? "default" : "secondary"}>
                            {item.fabricaDestino}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Badge variant={
                            item.nivel === "CRITICA" ? "destructive" :
                            item.nivel === "ALTA" ? "warning" : "secondary"
                          }>
                            {item.nivel}
                          </Badge>
                        </td>
                        <td className="p-2 text-xs text-muted-foreground">
                          {item.previsaoFabrica ? new Date(item.previsaoFabrica).toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="p-2">
                          <Badge variant={
                            item.matchStatus === "matched" ? "default" :
                            item.matchStatus === "not_found" ? "warning" :
                            item.matchStatus === "already_pending" ? "secondary" : "destructive"
                          } className="text-[9px]">
                            {item.matchStatus === "matched" && "✓ Importar"}
                            {item.matchStatus === "not_found" && "⚠ Não no pátio"}
                            {item.matchStatus === "already_pending" && "⏭ Já pendente"}
                            {item.matchStatus === "finalized" && "✗ Finalizado"}
                          </Badge>
                        </td>
                        <td className="p-2">
                          {item.matchedContainer && (
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span>{item.matchedContainer.status}</span>
                              {item.matchedContainer.conteinerDePara && (
                                <Badge variant="outline" className="text-[8px] h-4 px-1.5">
                                  Dê-para: {item.matchedContainer.conteinerDePara}
                                </Badge>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </ScrollArea>

            <Separator />
            <DialogFooter className="flex justify-between">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
                Cancelar
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={processing || stats.matched === 0}
                className="w-[200px]"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Importando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Importar {stats.matched} Prioridades
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}