import * as XLSX from "xlsx";
import type { 
  CheioRow, 
  ContainerStatus, 
  VazioLocadoRow, 
  VazioIngesysRow,
  VazioLocadoTlogRow,
  VazioLocadoRenaultRow,
  VazioArmadorRow
} from "./types";

function excelDateToISO(v: unknown): string | undefined {
  if (v == null || v === "") return undefined;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return undefined;
    const dt = new Date(Date.UTC(d.y, d.m - 1, d.d, d.H || 0, d.M || 0, Math.floor(d.S || 0)));
    return dt.toISOString();
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const [, dd, mm, yy] = m;
    const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
    return new Date(Date.UTC(year, Number(mm) - 1, Number(dd))).toISOString();
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

function num(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? undefined : n;
}

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === "" || s === "-" ? undefined : s;
}

function normalizeStatus(s?: string): ContainerStatus {
  if (!s) return "OUTRO";
  const u = s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
  if (u.includes("LOCADO") && u.includes("RENAULT")) return "LOCADO RENAULT";
  if (u.includes("LOCADO") && u.includes("TLOG")) return "LOCADO TLOG";
  if (u.includes("VAZIO INGESYS")) return "VAZIO INGESYS";
  if (u.includes("PROGRAMADA") || u.includes("AGENDADO")) return "PROGRAMADA ENTRADA NO PATIO";
  if (u.includes("FINALIZ")) return "FINALIZADO";
  if (u.includes("DEPARA") && u.includes("PATIO")) return "DEPARA EM PATIO TLOG-SJP";
  if (u.includes("ENVIADO") && u.includes("FABRICA")) return "ENVIADO PARA FABRICA";
  if (u.startsWith("EM PATIO")) return "EM PATIO TLOG-SJP";
  return "OUTRO";
}

function findSheet(wb: XLSX.WorkBook, candidates: string[]) {
  const names = wb.SheetNames;
  const normalize = (value: string) => value.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]+/g, " ").trim();
  for (const c of candidates) {
    const found = names.find((n) => normalize(n) === normalize(c));
    if (found) return found;
  }
  for (const c of candidates) {
    const found = names.find((n) => normalize(n).includes(normalize(c)));
    if (found) return found;
  }
  return undefined;
}

function sheetAsAOA(wb: XLSX.WorkBook, sheetName: string): unknown[][] {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });
}

function col(letter: string): number {
  let n = 0;
  for (const ch of letter.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export interface ParsedExcel {
  cheios: CheioRow[];
  vaziosLocados: VazioLocadoRow[];
  vazioIngesys: VazioIngesysRow[];
  vaziosLocadosTlog: VazioLocadoTlogRow[];
  vaziosLocadosRenault: VazioLocadoRenaultRow[];
  vaziosArmadores: VazioArmadorRow[];
}

export async function parseExcelFile(file: File): Promise<ParsedExcel> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { cellDates: true });

  const cheios: CheioRow[] = [];
  const currentVazioIngesys: VazioIngesysRow[] = [];
  
  const cheiosSheet = findSheet(wb, ["CHEIOS TLOG ATENDIMENTO RENAULT", "CHEIOS TLOG", "CHEIOS"]);
  if (cheiosSheet) {
    const aoa = sheetAsAOA(wb, cheiosSheet);
    const C = {
      conteiner: col("A"),
      lacre: col("B"),
      tipo: col("C"),
      dataChegada: col("G"),
      diasNoPatio: col("H"),
      armador: col("I"),
      navio: col("J"),
      freeTime: col("L"),
      demurrage: col("M"),
      diasVenc: col("N"), 
      fabrica: col("S"),
      conteinerDePara: col("X"),
      status: col("AA"),
      dataEnvioFabrica: col("AD"),
      infoAS: col("AS"),
    };

    for (let i = 1; i < aoa.length; i++) {
      const r = aoa[i];
      if (!r) continue;
      const conteiner = str(r[C.conteiner]);
      if (!conteiner) continue;
      cheios.push({
        conteiner,
        lacre: str(r[C.lacre]),
        tipo: str(r[C.tipo]),
        armador: str(r[C.armador]),
        navio: str(r[C.navio]),
        dataChegada: excelDateToISO(r[C.dataChegada]),
        diasNoPatio: num(r[C.diasNoPatio]),
        freeTime: num(r[C.freeTime]),
        demurrageVencimento: excelDateToISO(r[C.demurrage]),
        diasParaVencimento: num(r[C.diasVenc]),
        status: normalizeStatus(str(r[C.status])),
        fabrica: str(r[C.fabrica]),
        dataEnvioFabrica: excelDateToISO(r[C.dataEnvioFabrica]),
        conteinerDePara: str(r[C.conteinerDePara]),
        colunaAS: str(r[C.infoAS]),
      });
    }
  }

  const vaziosLocadosTlog: VazioLocadoTlogRow[] = [];
  const tlogSheet = findSheet(wb, ["VAZIOS LOCADOS TLOG"]);
  if (tlogSheet) {
    const aoa = sheetAsAOA(wb, tlogSheet);
    for (let i = 1; i < aoa.length; i++) {
      const r = aoa[i];
      if (!r || !str(r[0])) continue;
      vaziosLocadosTlog.push({
        id: crypto.randomUUID(),
        conteiner: str(r[0])!,
        armador: str(r[1]),
        status: str(r[2]),
        data_entrada: excelDateToISO(r[3]), // Coluna D
        status_patio: str(r[4]),
        dias_no_patio: num(r[5])
      });
    }
  }

  const vaziosLocadosRenault: VazioLocadoRenaultRow[] = [];
  const renaultSheet = findSheet(wb, ["VAZIOS LOCADOS RENAULT"]);
  if (renaultSheet) {
    const aoa = sheetAsAOA(wb, renaultSheet);
    for (let i = 1; i < aoa.length; i++) {
      const r = aoa[i];
      if (!r || !str(r[0])) continue;
      vaziosLocadosRenault.push({
        id: crypto.randomUUID(),
        conteiner: str(r[0])!,
        status: str(r[1]),
        data_entrada: excelDateToISO(r[2]), // Coluna C (ajustado conforme planilha padrão)
        status_patio: str(r[3]) // Coluna D
      });
    }
  }

  const vaziosArmadores: VazioArmadorRow[] = [];
  const armadoresSheet = findSheet(wb, ["VAZIOS ARMADORES"]);
  if (armadoresSheet) {
    const aoa = sheetAsAOA(wb, armadoresSheet);
    for (let i = 1; i < aoa.length; i++) {
      const r = aoa[i];
      if (!r || !str(r[0])) continue;
      vaziosArmadores.push({
        id: crypto.randomUUID(),
        conteiner: str(r[0])!,
        armador: str(r[1]),
        status: str(r[3]) // Coluna D
      });
    }
  }

  return { 
    cheios, 
    vaziosLocados: [], 
    vazioIngesys: [],
    vaziosLocadosTlog,
    vaziosLocadosRenault,
    vaziosArmadores
  };
}

export function exportToExcel(data: any[], fileName: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Estoque");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}