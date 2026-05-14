import { supabase } from "@/integrations/supabase/client";
import { parseExcelFile } from "@/lib/excel-parser";
import { setDataset, useDataset } from "@/lib/store";
import type {
  VazioLocadoTlogRow,
  VazioLocadoRenaultRow,
  VazioArmadorRow,
} from "@/lib/types";

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
        if (!/\.xlsx?$/i.test(file.name)) {
          throw new Error("Apenas arquivos .xlsx ou .xls são suportados.");
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error("Arquivo maior que 10MB.");
        }

        const parsed = await parseExcelFile(file);

        // Persistir as três novas tabelas
        await Promise.all([
          supabase.from("vazios_locados_tlog").insert(parsed.vaziosLocadosTlog),
          supabase.from("vazios_locados_renault").insert(parsed.vaziosLocadosRenault),
          supabase.from("vazios_armadores").insert(parsed.vaziosArmadores),
        ]);

        // Persistir os dados já existentes (cheios, vazios locados, vazio ingesys)
        const record = {
          id: crypto.randomUUID(),
          fileName: file.name,
          importedAt: new Date().toISOString(),
          itemCount:
            parsed.cheios.length +
            parsed.vaziosLocados.length +
            parsed.vazioIngesys.length +
            parsed.vaziosLocadosTlog.length +
            parsed.vaziosLocadosRenault.length +
            parsed.vaziosArmadores.length,
          status: "success" as const,
        };

        setDataset((prev) => ({
          ...prev,
          cheios: parsed.cheios.length ? parsed.cheios : prev.cheios,
          vaziosLocados: parsed.vaziosLocados.length ? parsed.vaziosLocados : prev.vaziosLocados,
          vazioIngesys: parsed.vazioIngesys.length ? parsed.vazioIngesys : prev.vazioIngesys,
          // novos arrays são mantidos apenas na camada Supabase; no cliente usamos o sync
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

  ...
}