import * as XLSX from "xlsx";
import type { CheioRow, ContainerStatus, VazioLocadoRow } from "./types";

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
  if (u.includes("FINALIZ")) return "FINALIZADO";
  if (u.includes("DEPARA") && u.includes("PATIO")) return "DEPARA EM PATIO TLOG-SJP";
  if (u.includes("ENVIADO") && u.includes("FABRICA")) return "ENVIADO PARA FABRICA";
  if (u.startsWith("EM PATIO")) return "EM PATIO TLOG-SJP";
  return "OUTRO";
}

function findSheet(wb: XLSX.WorkBook, candidates: string[]) {
  const names = wb.SheetNames;
  for (const c of candidates) {
    const found = names.find((n) => n.toUpperCase().trim() === c.toUpperCase().trim());
    if (found) return found;
  }
  for (const c of candidates) {
    const found = names.find((n) => n.toUpperCase().includes(c.toUpperCase()));
    if (found) return found;
  }
  return undefined;
}

/** Get sheet as array-of-arrays (raw cell values, indexed by column position). */
function sheetAsAOA(wb: XLSX.WorkBook, sheetName: string): unknown[][] {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });
}

export interface ParsedExcel {
  cheios: CheioRow[];
  vaziosLocados: VazioLocadoRow[];
}

// Excel column letter -> 0-based index. A=0, B=1, ..., Z=25, AA=26, AB=27, etc.
function col(letter: string): number {
  let n = 0;
  for (const ch of letter.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export async function parseExcelFile(file: File): Promise<ParsedExcel> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { cellDates: true });

  const cheios: CheioRow[] = [];
  const cheiosSheet = findSheet(wb, ["CHEIOS TLOG ATENDIMENTO RENAULT", "CHEIOS TLOG"]);
  if (cheiosSheet) {
    const aoa = sheetAsAOA(wb, cheiosSheet);
    // Row 0 = headers; data starts at row 1.
    // Fixed column positions per the spreadsheet:
    // A=CONTEINER CHEIO, B=LACRE, C=TIPO, G=DATA CHEGADA PATIO TLOG,
    // H=DIAS EM PATIO, I=ARMADOR, J=NAVIO, L=FREE TIME, M=DEMURRAGE,
    // N=DIAS PARA VENCIMENTO, S=FABRICA, X=CONTEINER DE-PARA,
    // AA=STATUS, AD=DATA ENVIO FABRICA, AH=DATA RETORNO LOCADO
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
        dataDevolucaoVazio: excelDateToISO(r[C.dataRetornoLocado]),
        raw: {},
      });
    }
  }

  const vaziosLocados: VazioLocadoRow[] = [];
  const vlSheet = findSheet(wb, ["VAZIO LOCADO", "VAZIOS LOCADOS"]);
  if (vlSheet) {
    const aoa = sheetAsAOA(wb, vlSheet);
    // A=CHEIO DE-PARA, B=ARMADOR, C=DATA DE-PARA, D=TIPO,
    // E=DATA ENTRADA, F=CONTEINERS LOCADOS, G=TIPO, H=LACRES,
    // I=STATUS DE USO, J=STATUS DE PATIO, K=DIAS EM PATIO, L=TIPO
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

  return { cheios, vaziosLocados };
}
