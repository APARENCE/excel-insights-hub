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
  if (aoa.length === 0) return [];

  // Busca dinâmica de cabeçalhos nas primeiras linhas
  let headerRowIndex = 0;
  let headers: string[] = [];
  for (let i = 0; i < Math.min(10, aoa.length); i++) {
    const row = aoa[i];
    if (row && row.some(cell => typeof cell === 'string' && /conteiner|container|prefixo/i.test(cell))) {
      headerRowIndex = i;
      headers = row.map(cell => String(cell || '').toUpperCase().trim());
      break;
    }
  }

  if (headers.length === 0 && aoa[0]) {
    headers = aoa[0].map(cell => String(cell || '').toUpperCase().trim());
  }

  const findCol = (names: string[], defaultCol: number): number => {
    const idx = headers.findIndex(h => names.some(name => h === name || h.includes(name)));
    return idx !== -1 ? idx : defaultCol;
  };

  const containerCol = findCol(["CONTAINER", "CONTEINER", "PREFIXO"], col("A"));
  const statusCol = findCol(["STATUS", "SITUACAO", "SITUAÇÃO", "TIPO", "ARMADOR"], col("D"));

  const results: VazioGenericRow[] = [];
  for (let i = headerRowIndex + 1; i < aoa.length; i++) {
    const r = aoa[i];
    if (!r) continue;
    const conteiner = str(r[containerCol]);
    if (!conteiner) continue;
    results.push({
      id: crypto.randomUUID(),
      conteiner,
      colunaD: str(r[statusCol]) || "N/A"
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
    
    // Busca dinâmica de cabeçalhos nas primeiras linhas
    let headerRowIndex = 0;
    let headers: string[] = [];
    for (let i = 0; i < Math.min(10, aoa.length); i++) {
      const row = aoa[i];
      if (row && row.some(cell => typeof cell === 'string' && /conteiner|container/i.test(cell))) {
        headerRowIndex = i;
        headers = row.map(cell => String(cell || '').toUpperCase().trim());
        break;
      }
    }

    if (headers.length === 0 && aoa[0]) {
      headers = aoa[0].map(cell => String(cell || '').toUpperCase().trim());
    }

    const findCol = (names: string[], defaultCol: number): number => {
      const idx = headers.findIndex(h => names.some(name => h === name || h.includes(name)));
      return idx !== -1 ? idx : defaultCol;
    };

    const C = {
      conteiner: findCol(["CONTAINER", "CONTEINER", "PREFIXO"], col("A")),
      lacre: findCol(["LACRE"], col("B")),
      tipo: findCol(["TIPO"], col("C")),
      dataChegada: findCol(["DATA CHEGADA", "CHEGADA", "DT CHEGADA", "DT_CHEGADA"], col("G")),
      diasNoPatio: findCol(["DIAS NO PATIO", "DIAS PATIO", "DIAS NO PÁTIO", "DIAS PÁTIO"], col("H")),
      armador: findCol(["ARMADOR"], col("I")),
      navio: findCol(["NAVIO"], col("J")),
      freeTime: findCol(["FREE TIME", "FREETIME"], col("L")),
      demurrage: findCol(["DEMURRAGE", "VENCIMENTO DEMURRAGE", "VENC. DEMURRAGE", "VENCIMENTO"], col("M")),
      diasVenc: findCol(["DIAS PARA VENCIMENTO", "DIAS VENCIMENTO", "DIAS RESTANTES", "DIAS VENC", "DIAS PARA VENC"], col("N")), 
      fabrica: findCol(["FABRICA", "FÁBRICA", "DESTINO"], col("S")),
      conteinerDePara: findCol(["DE-PARA", "DE PARA", "CONTEINER DE-PARA", "CONTEINER DE PARA", "DE_PARA"], col("X")),
      status: findCol(["STATUS", "SITUACAO", "SITUAÇÃO"], col("AA")),
      dataEnvioFabrica: findCol(["DATA ENVIO FABRICA", "ENVIO FABRICA", "DATA ENVIO FÁBRICA", "ENVIO FÁBRICA"], col("AD")),
      dataRetornoLocado: findCol(["DATA RETORNO", "RETORNO LOCADO", "DEVOLUCAO", "DEVOLUÇÃO"], col("AH")),
      infoAS: findCol(["AS", "COLUNA AS", "INFO AS", "COLUNA_AS"], col("AS")),
    };

    const range = ws["!ref"] ? XLSX.utils.decode_range(ws["!ref"]) : undefined;
    if (range) {
      for (let i = range.s.r + 1; i <= range.e.r; i++) {
        const valAA = cellDisplayValue(ws, i, C.status);
        const conteinerId = cellDisplayValue(ws, i, C.conteiner);
        if (valAA) {
          currentVazioIngesys.push({
            conteiner: conteinerId || `ITEM-${i + 1}`,
            statusD: valAA,
          });
        }
      }
    }

    for (let i = headerRowIndex + 1; i < aoa.length; i++) {
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
    
    // Busca dinâmica de cabeçalhos nas primeiras linhas
    let headerRowIndex = 0;
    let headers: string[] = [];
    for (let i = 0; i < Math.min(10, aoa.length); i++) {
      const row = aoa[i];
      if (row && row.some(cell => typeof cell === 'string' && /conteiner|container/i.test(cell))) {
        headerRowIndex = i;
        headers = row.map(cell => String(cell || '').toUpperCase().trim());
        break;
      }
    }

    if (headers.length === 0 && aoa[0]) {
      headers = aoa[0].map(cell => String(cell || '').toUpperCase().trim());
    }

    const findCol = (names: string[], defaultCol: number): number => {
      const idx = headers.findIndex(h => names.some(name => h === name || h.includes(name)));
      return idx !== -1 ? idx : defaultCol;
    };

    const V = {
      cheioDePara: findCol(["CHEIO DE-PARA", "CHEIO DE PARA", "CHEIO_DE_PARA"], col("A")),
      armador: findCol(["ARMADOR"], col("B")),
      dataDePara: findCol(["DATA DE-PARA", "DATA DE PARA", "DATA DE_PARA"], col("C")),
      dataEntrada: findCol(["DATA ENTRADA", "ENTRADA", "DATA_ENTRADA"], col("E")),
      conteiner: findCol(["CONTAINER", "CONTEINER", "PREFIXO"], col("F")),
      tipo: findCol(["TIPO"], col("G")),
      statusUso: findCol(["STATUS USO", "STATUS_USO", "USO"], col("I")),
      statusPatio: findCol(["STATUS PATIO", "STATUS_PATIO", "PATIO", "PÁTIO"], col("J")),
      diasNoPatio: findCol(["DIAS NO PATIO", "DIAS PATIO", "DIAS NO PÁTIO", "DIAS PÁTIO"], col("K")),
    };

    for (let i = headerRowIndex + 1; i < aoa.length; i++) {
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