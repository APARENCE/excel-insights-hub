"use client";

import { useState } from "react";
import { CloudUpload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Trash2, Bug } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { parseExcelFile } from "@/lib/excel-parser";
import { setDataset, useDataset, clearAllDataset } from "@/lib/store";
import * as XLSX from "xlsx";

export default function ImportarPage() {
  const ds = useDataset();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  async function handleFiles(files: FileList | File[]) {
    setError(null);
    setDebugInfo(null);
    const list = Array.from(files);
    if (!list.length) return;
    setBusy(true);
    try {
      for (const file of list) {
        if (!/\.xlsx?$/i.test(file.name)) {
          throw new Error("Apenas arquivos .xlsx ou .xls são suportados.");
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error("Arquivo maior que 10MB.");
        }

        // Executa uma leitura de depuração rápida
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { cellDates: true });
        const sheetNames = wb.SheetNames;
        
        const cheiosSheet = sheetNames.find(n => 
          n.toUpperCase().includes("CHEIOS TLOG ATENDIMENTO RENAULT") || 
          n.toUpperCase().includes("CHEIOS TLOG") || 
          n.toUpperCase().includes("CHEIOS")
        );

        let debugData: any = {
          fileName: file.name,
          sheets: sheetNames,
        };

        if (cheiosSheet) {
          const ws = wb.Sheets[cheiosSheet];
          const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });
          if (aoa.length > 0) {
            const headers = aoa[0] as string[];
            debugData.cheiosSheetName = cheiosSheet;
            debugData.totalRows = aoa.length;
            debugData.headers = headers.map((h, idx) => {
              // Converte índice para letra da coluna Excel (0 -> A, 26 -> AA, etc.)
              let temp = idx;
              let letter = "";
              while (temp >= 0) {
                letter = String.fromCharCode((temp % 26) + 65) + letter;
                temp = Math.floor(temp / 26) - 1;
              }
              return { idx, letter, name: h || `[Vazia]` };
            });

            // Pega as primeiras 10 linhas de dados reais
            debugData.sampleRows = aoa.slice(1, 11).map((row: any, rIdx) => {
              const rowData: Record<string, any> = {};
              headers.forEach((h, cIdx) => {
                if (cIdx < 45) { // Limita para não estourar a tela
                  let letter = "";
                  let temp = cIdx;
                  while (temp >= 0) {
                    letter = String.fromCharCode((temp % 26) + 65) + letter;
                    temp = Math.floor(temp / 26) - 1;
                  }
                  rowData[`${letter} (${h || 'Vazia'})`] = row[cIdx];
                }
              });
              return { rowNum: rIdx + 2, data: rowData };
            });
          }
        }
        setDebugInfo(debugData);

        const parsed = await parseExcelFile(file);
        
        // Soma total de itens importados para o histórico
        const itemCount = 
          parsed.cheios.length + 
          parsed.vaziosLocados.length + 
          parsed.vazioIngesys.length +
          parsed.vaziosLocadosRenault.length +
          parsed.vaziosLocadosTlog.length +
          parsed.vaziosArmadores.length;

        const record = {
          id: crypto.randomUUID(),
          fileName: file.name,
          importedAt: new Date().toISOString(),
          itemCount,
          status: "success" as const,
        };

        // Atualiza o dataset global incluindo as novas abas de vazios
        setDataset((prev) => ({
          ...prev,
          cheios: parsed.cheios.length ? parsed.cheios : prev.cheios,
          vaziosLocados: parsed.vaziosLocados.length ? parsed.vaziosLocados : prev.vaziosLocados,
          vazioIngesys: parsed.vazioIngesys.length ? parsed.vazioIngesys : prev.vazioIngesys,
          vaziosLocadosRenault: parsed.vaziosLocadosRenault.length ? parsed.vaziosLocadosRenault : prev.vaziosLocadosRenault,
          vaziosLocadosTlog: parsed.vaziosLocadosTlog.length ? parsed.vaziosLocadosTlog : prev.vaziosLocadosTlog,
          vaziosArmadores: parsed.vaziosArmadores.length ? parsed.vaziosArmadores : prev.vaziosArmadores,
          imports: [record, ...prev.imports].slice(0, 50),
          lastImportAt: record.importedAt,
        }));
      }
    } catch (e) {
      console.error("Import error:", e);
      setError(e instanceof Error ? e.message : "Erro ao processar o arquivo.");
    } finally {
      setBusy(false);
    }
  }

  const handleClear = async () => {
    const confirmed = window.confirm(
      "ATENÇÃO: Tem certeza que deseja apagar TODOS os dados do sistema e do Supabase? Esta ação não pode ser desfeita e deixará o sistema pronto para um novo upload."
    );
    if (confirmed) {
      setBusy(true);
      await clearAllDataset();
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <PageHeader 
        title="Importar" 
        subtitle="Envie arquivo Excel" 
        actions={
          <button
            onClick={handleClear}
            disabled={busy}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider border border-destructive/30 rounded-md px-3 py-1.5 bg-destructive/10 hover:bg-destructive text-destructive hover:text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4" /> Limpar Banco de Dados
          </button>
        }
      />

      <div className="px-6">
        <label
          htmlFor="excel-file-input"
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={`block cursor-pointer rounded-xl border-2 border-dashed p-10 text-center bg-card transition-colors ${
            drag ? "border-primary bg-primary/5" : "border-border hover:border-primary/60 hover:bg-accent/40"
          } ${busy ? "pointer-events-none opacity-70" : ""}`}
        >
          <div className="mx-auto h-14 w-14 rounded-full bg-info/10 flex items-center justify-center mb-3">
            {busy ? (
              <Loader2 className="h-7 w-7 text-info animate-spin" />
            ) : (
              <CloudUpload className="h-7 w-7 text-info" />
            )}
          </div>
          <h3 className="text-lg font-semibold">Envie ou arraste um arquivo</h3>
          <p className="text-xs text-muted-foreground mt-1">Excel: .xlsx, .xls (máx 10MB)</p>

          <input
            id="excel-file-input"
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            multiple
            disabled={busy}
            onChange={(e) => {
              if (e.target.files && e.target.files.length) {
                handleFiles(e.target.files);
              }
              e.target.value = "";
            }}
            className="sr-only"
          />

          <span className="mt-4 inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-primary/90">
            <CloudUpload className="h-4 w-4" />
            {busy ? "Processando..." : "Selecionar arquivo"}
          </span>

          {error && (
            <div className="mt-3 inline-flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </label>
      </div>

      {/* Painel de Depuração Visual */}
      {debugInfo && (
        <div className="mx-6 mt-6 p-5 rounded-xl border border-warning/30 bg-warning/5">
          <div className="flex items-center gap-2 text-warning-foreground font-bold text-sm mb-3">
            <Bug className="h-4 w-4" /> Painel de Depuração da Planilha
          </div>
          <div className="text-xs space-y-2 text-muted-foreground">
            <div><strong>Arquivo:</strong> {debugInfo.fileName}</div>
            <div><strong>Abas encontradas:</strong> {debugInfo.sheets.join(", ")}</div>
            <div><strong>Aba de Cheios identificada:</strong> {debugInfo.cheiosSheetName} ({debugInfo.totalRows} linhas)</div>
            
            <div className="mt-4">
              <strong>Mapeamento de Colunas Importantes:</strong>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                {debugInfo.headers.filter((h: any) => ["A", "B", "C", "G", "H", "I", "J", "L", "M", "N", "S", "X", "AA", "AD", "AH", "AS"].includes(h.letter)).map((h: any) => (
                  <div key={h.idx} className="p-1.5 bg-card border rounded text-[10px]">
                    <span className="font-bold text-primary">{h.letter}</span> (índice {h.idx}): <span className="text-foreground font-medium">{h.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <strong>Amostra das primeiras linhas (Coluna AA):</strong>
              <div className="max-h-48 overflow-y-auto border rounded bg-card p-2 font-mono text-[10px] space-y-1">
                {debugInfo.sampleRows.map((row: any) => {
                  const keys = Object.keys(row.data);
                  const aaKey = keys.find(k => k.startsWith("AA "));
                  const aKey = keys.find(k => k.startsWith("A "));
                  return (
                    <div key={row.rowNum} className="flex justify-between border-b border-border/50 pb-1">
                      <span>Linha {row.rowNum} - Container: <strong className="text-foreground">{row.data[aKey || ""]}</strong></span>
                      <span>Coluna AA (Status): <strong className="text-warning-foreground">{row.data[aaKey || ""] || "[Vazio/Nulo]"}</strong></span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 mt-6 pb-8">
        <h3 className="font-semibold mb-3">Importações Recentes</h3>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Arquivo</th>
                <th className="px-4 py-3 text-left font-medium">Data</th>
                <th className="px-4 py-3 text-left font-medium">Itens</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {ds.imports.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                    Nenhuma importação ainda.
                  </td>
                </tr>
              )}
              {ds.imports.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-4 py-2.5 flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-success" />
                    {r.fileName}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {new Date(r.importedAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-2.5">{r.itemCount}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge tone="success">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Sucesso
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}