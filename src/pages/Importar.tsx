"use client";

import { useState } from "react";
import { CloudUpload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, History } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { parseExcelFile } from "@/lib/excel-parser";
import { setDataset, useDataset, syncFromSupabase } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ImportarPage() {
  const ds = useDataset();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  async function handleFiles(files: FileList | File[]) {
    setError(null);
    const list = Array.from(files);
    if (!list.length) return;
    setBusy(true);
    try {
      for (const file of list) {
        const parsed = await parseExcelFile(file);

        // Limpar tabelas antes de inserir novos dados (opcional, dependendo da regra de negócio)
        // Aqui vamos apenas inserir os novos dados
        
        if (parsed.cheios.length > 0) {
          await supabase.from("containers_cheios").delete().neq("id", "00000000-0000-0000-0000-000000000000");
          const chunks = [];
          for (let i = 0; i < parsed.cheios.length; i += 100) {
            chunks.push(parsed.cheios.slice(i, i + 100).map(c => ({
              conteiner: c.conteiner,
              lacre: c.lacre,
              tipo: c.tipo,
              armador: c.armador,
              navio: c.navio,
              data_chegada: c.dataChegada,
              dias_no_patio: c.diasNoPatio,
              free_time: c.freeTime,
              demurrage_vencimento: c.demurrageVencimento,
              dias_para_vencimento: c.diasParaVencimento,
              status: c.status,
              fabrica: c.fabrica,
              data_envio_fabrica: c.dataEnvioFabrica,
              conteiner_de_para: c.conteinerDePara,
              coluna_as: c.colunaAS
            })));
          }
          for (const chunk of chunks) {
            await supabase.from("containers_cheios").insert(chunk);
          }
        }

        if (parsed.vaziosLocadosTlog.length > 0) {
          await supabase.from("vazios_locados_tlog").delete().neq("id", "00000000-0000-0000-0000-000000000000");
          await supabase.from("vazios_locados_tlog").insert(parsed.vaziosLocadosTlog);
        }

        if (parsed.vaziosLocadosRenault.length > 0) {
          await supabase.from("vazios_locados_renault").delete().neq("id", "00000000-0000-0000-0000-000000000000");
          await supabase.from("vazios_locados_renault").insert(parsed.vaziosLocadosRenault);
        }

        if (parsed.vaziosArmadores.length > 0) {
          await supabase.from("vazios_armadores").delete().neq("id", "00000000-0000-0000-0000-000000000000");
          await supabase.from("vazios_armadores").insert(parsed.vaziosArmadores);
        }

        const record = {
          file_name: file.name,
          item_count: parsed.cheios.length + parsed.vaziosLocadosTlog.length + parsed.vaziosLocadosRenault.length + parsed.vaziosArmadores.length,
          status: "success"
        };
        await supabase.from("import_history").insert(record);
        
        toast.success(`Arquivo ${file.name} importado com sucesso!`);
      }
      await syncFromSupabase();
    } catch (e) {
      console.error(e);
      setError("Erro ao processar o arquivo. Verifique o formato.");
      toast.error("Falha na importação.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <PageHeader title="Importar Dados" subtitle="Upload de planilhas Excel (.xlsx)" />
      <div className="px-6 max-w-4xl mx-auto mt-4 space-y-6">
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
          className={`relative border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all ${drag ? "border-primary bg-primary/5 scale-[1.01]" : "border-border bg-card"}`}
        >
          <input type="file" accept=".xlsx,.xls" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files && handleFiles(e.target.files)} disabled={busy} />
          <div className={`h-16 w-16 rounded-full flex items-center justify-center mb-4 ${busy ? "bg-muted" : "bg-primary/10 text-primary"}`}>
            {busy ? <Loader2 className="h-8 w-8 animate-spin" /> : <CloudUpload className="h-8 w-8" />}
          </div>
          <h3 className="text-lg font-semibold">Clique ou arraste a planilha aqui</h3>
          <p className="text-sm text-muted-foreground mt-1">Suporta arquivos .xlsx e .xls (Máx 10MB)</p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center gap-3 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0" /> {error}
          </div>
        )}

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2 font-semibold text-sm">
            <History className="h-4 w-4 text-primary" /> Histórico de Importações
          </div>
          <div className="divide-y divide-border">
            {ds.imports.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm italic">Nenhuma importação realizada.</div>
            ) : (
              ds.imports.map((imp) => (
                <div key={imp.id} className="px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-success/10 flex items-center justify-center text-success">
                      <FileSpreadsheet className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{imp.fileName}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(imp.importedAt).toLocaleString("pt-BR")} • {imp.itemCount} registros
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-success uppercase tracking-wider">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Sucesso
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}