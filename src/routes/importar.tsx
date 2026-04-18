import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { CloudUpload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { parseExcelFile } from "@/lib/excel-parser";
import { setDataset, useDataset } from "@/lib/store";

export const Route = createFileRoute("/importar")({
  component: ImportarPage,
});

function ImportarPage() {
  const ds = useDataset();
  const fileRef = useRef<HTMLInputElement>(null);
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
        if (!/\.xlsx?$/i.test(file.name)) {
          throw new Error("Apenas arquivos .xlsx ou .xls são suportados.");
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error("Arquivo maior que 10MB.");
        }
        const parsed = await parseExcelFile(file);
        const itemCount = parsed.cheios.length + parsed.vaziosLocados.length;
        const record = {
          id: crypto.randomUUID(),
          fileName: file.name,
          importedAt: new Date().toISOString(),
          itemCount,
          status: "success" as const,
        };
        setDataset((prev) => ({
          ...prev,
          cheios: parsed.cheios.length ? parsed.cheios : prev.cheios,
          vaziosLocados: parsed.vaziosLocados.length ? parsed.vaziosLocados : prev.vaziosLocados,
          imports: [record, ...prev.imports].slice(0, 50),
          lastImportAt: record.importedAt,
        }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao processar o arquivo.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <AppShell>
      <PageHeader title="Importar" subtitle="Envie arquivo Excel" />

      <div className="px-6">
        <div
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
          className={`rounded-xl border-2 border-dashed p-10 text-center bg-card transition-colors ${
            drag ? "border-primary bg-primary/5" : "border-border"
          }`}
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
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            multiple
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />
          <button
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="mt-4 inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            <CloudUpload className="h-4 w-4" />
            Selecionar arquivo
          </button>
          {error && (
            <div className="mt-3 inline-flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>
      </div>

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
