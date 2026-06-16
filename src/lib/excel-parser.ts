import * as XLSX from "xlsx";
import type { CheioRow, ContainerStatus, VazioLocadoRow, VazioIngesysRow, VazioGenericRow } from "./types";

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
  const u = s
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  
  if (u.includes("LOCADO") && u.includes("RENAULT")) return "LOCADO RENAULT";
  if (u.includes("LOCADO") && u.includes("TLOG")) return "LOCADO TLOG";
  if (u.includes("VAZIO INGESYS")) return "VAZIO INGESYS";
  
  if (u.includes("PROGRAMADA") || u.includes("AGENDADO")) return "PROGRAMADA ENTRADA NO PATIO";
  if (u.includes("FINALIZ")) return "FINALIZADO";
  
  // Ordem de precedência para evitar conflitos
  if (u.includes("PROCESSO") && u.includes("DEPARA")) return "EM PROCESSO DEPARA";
  if (u.includes("DEPARA") && u.includes("PATIO")) return "DEPARA EM PATIO TLOG-SJP";
  if (u.includes("ENVIADO") && u.includes("FABRICA")) return "ENVIADO PARA FABRICA";
  
  // Captura genérica de "EM PATIO" para garantir que variações sejam contadas
  if (u.includes("EM PATIO")) return "EM PATIO TLOG-SJP";
  
  return "OUTRO";
}

function findSheet(wb: XLSX.WorkBook, candidates: string[]) {
  const names = wb.SheetNames;
  const normalize = (value: string) =>
    value
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]+/g, " ")
      .trim();

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

export interface ParsedExcel {
  cheios: CheioRow[];
  vaziosLocados: VazioLocadoRow[];
  vazioIngesys: VazioIngesysRow[];
  vaziosLocadosRenault: VazioGenericRow[];
  vaziosLocadosTlog: VazioGenericRow[];
  vaziosArmadores: VazioGenericRow[];
}

function col(letter: string): number {
  let n = 0;
  for (const ch of letter.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function cellDisplayValue(ws: XLSX.WorkSheet, row: number, column: number): string | undefined {
  const cell = ws[XLSX.utils.encode_cell({ r: row, c: column })];
  if (!cell) return undefined;
  return str(cell.w ?? cell.v);
}

function parseGenericVazios(wb: XLSX.WorkBook, sheetNames: string[]): VazioGenericRow[] {
  const sheet = findSheet(wb, sheetNames);
  if (!sheet) return [];
  const aoa = sheetAsAOA(wb, sheet);
  const results: VazioGenericRow[] = [];
  const colA = col("A");
  const colD = col("D");

  for (let i = 1; i < aoa.length; i++) {
    const r = aoa[i];
    if (!r) continue;
    const conteiner = str(r[colA]);
    if (!conteiner) continue;
    results.push({
      id: crypto.randomUUID(),
      conteiner,
      colunaD: str(r[colD]) || "N/A"
    });
  }
  return results;
}

export async function parseExcelFile(file: File): Promise<ParsedExcel> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { cellDates: true });

  const cheios: CheioRow[] = [];
  const currentVazioIngesys: VazioIngesysRow[] = [];
  
  const cheiosSheet = findSheet(wb, ["CHEIOS TLOG ATENDIMENTO RENAULT", "CHEIOS TLOG", "CHEIOS"]);
  if (cheiosSheet) {
    const ws = wb.Sheets[cheiosSheet];
    const aoa = sheetAsAOA(wb, cheiosSheet);
    const colAA = col("AA");
    const colA = col("A");
    const range = ws["!ref"] ? XLSX.utils.decode_range(ws["!ref"]) : undefined;
    
    if (range) {
      for (let i = range.s.r + 1; i <= range.e.r; i++) {
        const valAA = cellDisplayValue(ws, i, colAA);
        const conteinerId = cellDisplayValue(ws, i, colA);
        if (valAA) {
          currentVazioIngesys.push({
            conteiner: conteinerId || `ITEM-${i + 1}`,
            statusD: valAA,
          });
        }
      }
    }

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
      dataRetornoLocado: col("AH"),
      infoAS: col("AS"),
    };

    for (let i = 1; i < aoa.length; i++) {
      const r = aoa[i];
      if (!r) continue;
      const conteiner = str(r[C.conteiner]);
      if (!conteiner) continue;

      const rawStatusAA = str(r[C.status]);
      const rawContentN = str(r[C.diasVenc]);
      
      let finalStatus: ContainerStatus = normalizeStatus(rawStatusAA);
      if (rawContentN && (rawContentN.toUpperCase().includes("PROGRAMADA") || rawContentN.toUpperCase().includes("ENTRADA"))) {
        finalStatus = "PROGRAMADA ENTRADA NO PATIO";
      }

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
        diasParaVencimento: typeof r[C.diasVenc] === 'number' ? num(r[C.diasVenc]) : undefined,
        status: finalStatus,
        fabrica: str(r[C.fabrica]),
        dataEnvioFabrica: excelDateToISO(r[C.dataEnvioFabrica]),
        conteinerDePara: str(r[C.conteinerDePara]),
        dataDevolucaoVazio: excelDateToISO(r[C.dataRetornoLocado]),
        colunaAS: str(r[C.infoAS]),
        raw: {},
      });
    }
  }

  const vaziosLocados: VazioLocadoRow[] = [];
  const vlSheet = findSheet(wb, ["VAZIO LOCADO", "VAZIOS LOCADOS", "LOCADOS"]);
  if (vlSheet) {
    const aoa = sheetAsAOA(wb, vlSheet);
    const V = {
      cheioDePara: col("A"),
      armador: col("B"),
      dataDePara: col("C"),
      dataEntrada: col("E"),
      conteiner: col("F"),
      tipo: col("G"),
      statusUso: col("I"),
      statusPatio: col("J"),
      diasNoPatio: col("K"),
    };
    for (let i = 1; i < aoa.length; i++) {
      const r = aoa[i];
      if (!r) continue;
      const conteiner = str(r[V.conteiner]);
      if (!conteiner) continue;
      vaziosLocados.push({
        conteiner,
        armador: str(r[V.armador]),
        tipo: str(r[V.tipo]),
        cheioDePara: str(r[V.cheioDePara]),
        dataDePara: excelDateToISO(r[V.dataDePara]),
        dataEntrada: excelDateToISO(r[V.dataEntrada]),
        statusUso: str(r[V.statusUso]),
        statusPatio: str(r[V.statusPatio]),
        diasNoPatio: num(r[V.diasNoPatio]),
      });
    }
  }

  return { 
    cheios, 
    vaziosLocados, 
    vazioIngesys: currentVazioIngesys,
    vaziosLocadosRenault: parseGenericVazios(wb, ["Vazios Locados Renault", "VAZIOS LOCADOS RENAULT"]),
    vaziosLocadosTlog: parseGenericVazios(wb, ["Vazios Locados Tlog", "VAZIOS LOCADOS TLOG"]),
    vaziosArmadores: parseGenericVazios(wb, ["Vazios Armadores", "VAZIOS ARMADORES"])
  };
}

export function exportToExcel(data: any[], fileName: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Estoque");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}