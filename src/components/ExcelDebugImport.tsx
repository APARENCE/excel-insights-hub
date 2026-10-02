"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Eye, Copy } from "lucide-react";
import { toast } from "sonner";

export default function ExcelDebugImport() {
  const [sheets, setSheets] = useState<Array<{name: string; headers: string[]; rows: unknown[][]; rowCount: number}>>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const loadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setLoading(true);
    try {
      const buffer = await f.arrayBuffer();
      const wb = XLSX.read(buffer, { cellDates: true });
      
      const sheetInfos = wb.SheetNames.map(sheetName => {
        const ws = wb.Sheets[sheetName];
        const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });
        return {
          name: sheetName,
          headers: aoa[0] as string[] || [],
          rows: aoa.slice(1, 6), // first 5 data rows
          rowCount: aoa.length - 1
        };
      });
      setSheets(sheetInfos);
      toast.success(`${sheetInfos.length} abas carregadas`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao ler arquivo");
    } finally {
      setLoading(false);
    }
  };

  const parseSelectedSheet = () => {
    if (!file || !selectedSheet) return;
    setLoading(true);
    try {
      const buffer = file.arrayBuffer();
      buffer.then(buf => {
        const wb = XLSX.read(buf, { cellDates: true });
        const ws = wb.Sheets[selectedSheet];
        const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });
        
        console.log(`=== FULL PARSE: ${selectedSheet} ===`);
        console.log("Headers:", aoa[0]);
        console.log("All rows:");
        aoa.slice(1).forEach((row, i) => {
          console.log(`Row ${i+1}:`, row);
        });
        
        // Try to find container column
        const headers = aoa[0] as string[];
        const findCol = (patterns: string[]) => headers.findIndex(h => patterns.some(p => h && h.toString().toUpperCase().includes(p.toUpperCase())));
        
        const colContainer = findCol(["CONTAINER", "CONTEINER", "CONTÊINER", "NÚMERO", "NUMERO", "ID"]);
        const containerCol = colContainer >= 0 ? colContainer : 0;
        
        console.log(`Container column: ${containerCol} (${colContainer >= 0 ? 'header match' : 'fallback A'})`);
        
        const containers: string[] = [];
        for (let i = 1; i < aoa.length; i++) {
          const row = aoa[i];
          if (!row || row.length === 0) continue;
          let container = String(row[containerCol] ?? "").trim();
          if (!container) {
            for (let fc = 0; fc < Math.min(5, row.length); fc++) {
              if (fc === containerCol) continue;
              const val = String(row[fc] ?? "").trim();
              if (val && val.length >= 5) { container = val; break; }
            }
          }
          if (container) containers.push(container);
        }
        console.log(`Found ${containers.length} containers:`, containers);
        toast.success(`${containers.length} containers encontrados na aba ${selectedSheet}`);
      });
    } catch (e) {
      console.error(e);
      toast.error("Erro ao parsear");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-6xl mx-auto mt-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Debug Importação Excel</span>
          <Badge variant="secondary">Use para debugar antes de importar</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Selecione o arquivo Excel:</label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={loadExcel}
            disabled={loading}
            className="w-full p-2 border rounded bg-muted/30"
          />
          {file && <p className="text-xs text-muted-foreground">Arquivo: {file.name} ({(file.size/1024).toFixed(1)} KB)</p>}
        </div>

        {sheets.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Abas encontradas ({sheets.length}):</p>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {sheets.map((sheet) => (
                <Button
                  key={sheet.name}
                  variant={selectedSheet === sheet.name ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSheet(sheet.name)}
                  className="text-left h-auto p-3 gap-2"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{sheet.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {sheet.rowCount} linhas • {sheet.headers.length} colunas
                    </div>
                    <div className="text-[10px] text-primary mt-1">
                      Headers: {sheet.headers.slice(0, 8).join(", ")}{sheet.headers.length > 8 ? "..." : ""}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Primeiras linhas: {sheet.rows.map((r, i) => `${i+1}:[${r.slice(0,4).map(c => String(c ?? "")).join(",")}]`).join(" | ")}
                    </div>
                  </div>
                  <Eye className="h-4 w-4" />
                </Button>
              ))}
            </div>
          </div>
        )}

        {selectedSheet && (
          <div className="flex gap-2">
            <Button onClick={parseSelectedSheet} disabled={loading} variant="default">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Parse Completo no Console (F12)
            </Button>
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(JSON.stringify(sheets.find(s => s.name === selectedSheet), null, 2)); toast.success("Copiado!"); }}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar JSON da Aba
            </Button>
          </div>
        )}

        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-4 text-sm">
            <p className="font-medium text-destructive">Como usar:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground mt-2">
              <li>Carregue o mesmo arquivo Excel que está tentando importar</li>
              <li>Clique na aba "Programação CVP" ou "Programação CVU"</li>
              <li>Clique "Parse Completo no Console" e abra F12 → Console</li>
              <li>Verifique: qual coluna tem o container, quantos containers encontrou</li>
              <li>Se não encontrou containers, veja as primeiras linhas completas no console</li>
            </ol>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}