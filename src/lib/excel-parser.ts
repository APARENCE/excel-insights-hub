import * as XLSX from "xlsx";
import type { CheioRow, ContainerStatus, VazioLocadoRow } from "./types";

function excelDateToISO(v: unknown): string | undefined {
  if (v == null || v === "") return undefined;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return undefined;
    const dt = new Date(Date.UTC(d.y, d.m - 1, d.d, d.H || 0, d.M || 0, Math.floor(d.S || 0)));
    return dt.toISOString();
  }
  const s = String(v).trim();
  // dd/mm/yyyy
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
  if (u.includes("ENVIADO PARA FABRICA")) return "ENVIADO PARA FABRICA";
  if (u.startsWith("EM PATIO")) return "EM PATIO TLOG-SJP";
  return "OUTRO";
}

/** Find a sheet by fuzzy name match. */
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

function rowsAsObjects(wb: XLSX.WorkBook, sheetName: string, headerRow = 0) {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });
  if (!aoa.length) return [];
  const headers = (aoa[headerRow] as unknown[]).map((h) => String(h ?? "").trim());
  const out: Record<string, unknown>[] = [];
  for (let i = headerRow + 1; i < aoa.length; i++) {
    const row = aoa[i] as unknown[];
    if (!row || row.every((c) => c == null || c === "")) continue;
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      if (h) obj[h] = row[idx];
    });
    out.push(obj);
  }
  return out;
}

function pick(row: Record<string, unknown>, ...keys: string[]) {
  for (const k of keys) {
    const found = Object.keys(row).find((rk) => rk.toUpperCase().trim() === k.toUpperCase().trim());
    if (found && row[found] != null && row[found] !== "") return row[found];
  }
  // partial match
  for (const k of keys) {
    const found = Object.keys(row).find((rk) => rk.toUpperCase().includes(k.toUpperCase()));
    if (found && row[found] != null && row[found] !== "") return row[found];
  }
  return undefined;
}

export interface ParsedExcel {
  cheios: CheioRow[];
  vaziosLocados: VazioLocadoRow[];
}

export async function parseExcelFile(file: File): Promise<ParsedExcel> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { cellDates: true });

  const cheios: CheioRow[] = [];
  const cheiosSheet = findSheet(wb, ["CHEIOS TLOG ATENDIMENTO RENAULT", "CHEIOS TLOG"]);
  if (cheiosSheet) {
    const rows = rowsAsObjects(wb, cheiosSheet, 0);
    for (const r of rows) {
      const conteiner = str(pick(r, "CONTEINER CHEIO", "CONTAINER", "CONTEINER"));
      if (!conteiner) continue;
      cheios.push({
        conteiner,
        lacre: str(pick(r, "LACRE")),
        tipo: str(pick(r, "TIPO")),
        armador: str(pick(r, "ARMADOR")),
        navio: str(pick(r, "NAVIO")),
        dataChegada: excelDateToISO(pick(r, "DATA CHEGADA  PÁTIO TLOG", "DATA CHEGADA PÁTIO TLOG", "DATA CHEGADA")),
        diasNoPatio: num(pick(r, "DIAS EM PATIO TLOG", "DIAS NO PATIO")),
        freeTime: num(pick(r, "FREE TIME ARMADOR", "FREE TIME")),
        demurrageVencimento: excelDateToISO(pick(r, "DEMURRAGE")),
        diasParaVencimento: num(pick(r, "DIAS PARA VENCIMENTO DEMURRAGE", "DIAS PARA VENCIMENTO")),
        status: normalizeStatus(str(pick(r, "STATUS"))),
        fabrica: str(pick(r, "FABRICA")),
        dataEnvioFabrica: excelDateToISO(pick(r, "DATA ENVIO FABRICA")),
        conteinerDePara: str(pick(r, "CONTEINER DÊ-PARA", "CONTEINER DE-PARA", "CONTEINER DEPARA")),
        dataDevolucaoVazio: excelDateToISO(pick(r, "DATA DEVOLUÇÃO DE VAZIO", "DATA DEVOLUCAO")),
        raw: r,
      });
    }
  }

  const vaziosLocados: VazioLocadoRow[] = [];
  const vlSheet = findSheet(wb, ["VAZIO LOCADO", "VAZIOS LOCADOS"]);
  if (vlSheet) {
    const rows = rowsAsObjects(wb, vlSheet, 0);
    for (const r of rows) {
      const conteiner = str(pick(r, "CONTEINERS LOCADOS", "CONTEINER LOCADO", "CONTEINER VAZIO"));
      if (!conteiner) continue;
      vaziosLocados.push({
        conteiner,
        armador: str(pick(r, "ARMADOR")),
        tipo: str(pick(r, "TIPO.1", "TIPO")),
        cheioDePara: str(pick(r, "CHEIO DÊ-PARA", "CHEIO DE-PARA")),
        dataDePara: excelDateToISO(pick(r, "DATA DE DÊ-PARA", "DATA DE DE-PARA")),
        dataEntrada: excelDateToISO(pick(r, "DATA DE ENTRADA VAZIOS LOCADOS", "DATA DE ENTRADA")),
        statusUso: str(pick(r, "STATUS DE USO")),
        statusPatio: str(pick(r, "STATUS DE PATIO", "STATUS PATIO")),
        diasNoPatio: num(pick(r, "DIAS EM PATIO TLOG", "DIAS NO PATIO")),
      });
    }
  }

  return { cheios, vaziosLocados };
}
