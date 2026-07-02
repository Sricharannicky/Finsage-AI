"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Download } from "lucide-react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

const SAMPLE_CSV = `date,type,category,amount,note,paymentMethod,source
2026-07-01,income,Salary,75000,Monthly salary,,
2026-07-02,expense,Rent,18000,Monthly rent,Auto,
2026-07-03,expense,Food,450,Groceries,UPI,
2026-07-04,expense,Travel,250,Metro card,Cash,
2026-07-05,expense,Utilities,1800,Electricity bill,Net Banking,`;

export function CsvImportDialog({ open, onOpenChange, onImported }: CsvImportDialogProps) {
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: { income: number; expense: number }; errors: { row: number; error: string }[]; totalProcessed: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvText(ev.target?.result as string);
      setResult(null);
    };
    reader.readAsText(file);
  }

  function parseCsv(text: string): any[] {
    const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = parseCsvLine(lines[i]);
      const row: any = {};
      headers.forEach((h, idx) => {
        row[h] = cells[idx]?.trim() ?? "";
      });
      rows.push(row);
    }
    return rows;
  }

  // Handle simple CSV parsing with quoted fields
  function parseCsvLine(line: string): string[] {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === "," && !inQuotes) {
        cells.push(current);
        current = "";
      } else {
        current += c;
      }
    }
    cells.push(current);
    return cells;
  }

  function downloadTemplate() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "finsage-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    if (!csvText.trim()) {
      toast.error("Please paste CSV content or upload a file");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const rows = parseCsv(csvText);
      if (rows.length === 0) {
        toast.error("No data rows found in CSV");
        setLoading(false);
        return;
      }
      const res = await api.post<{ success: boolean; imported: { income: number; expense: number }; errors: { row: number; error: string }[]; totalProcessed: number }>("/api/import", { rows });
      setResult(res);
      if (res.imported.income + res.imported.expense > 0) {
        toast.success(`Imported ${res.imported.income} incomes + ${res.imported.expense} expenses`);
        onImported?.();
      }
      if (res.errors.length > 0 && res.imported.income + res.imported.expense === 0) {
        toast.error(`${res.errors.length} rows failed to import`);
      }
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    } finally {
      setLoading(false);
    }
  }

  function handleClose(open: boolean) {
    onOpenChange(open);
    if (!open) {
      setCsvText("");
      setResult(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-4 text-emerald-500" /> Import Transactions (CSV)
          </DialogTitle>
          <DialogDescription>
            Upload or paste CSV data. Required columns: date, type (income/expense), category, amount.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => fileRef.current?.click()}>
              <FileSpreadsheet className="size-3.5" /> Choose File
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={downloadTemplate}>
              <Download className="size-3.5" /> Template
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          <Textarea
            placeholder={SAMPLE_CSV}
            value={csvText}
            onChange={(e) => { setCsvText(e.target.value); setResult(null); }}
            className="font-mono text-xs h-40 resize-none"
          />

          {result && (
            <Alert className={result.errors.length > 0 && result.imported.income + result.imported.expense === 0 ? "border-rose-500/30 bg-rose-500/5" : "border-emerald-500/30 bg-emerald-500/5"}>
              <div className="flex items-start gap-2">
                {result.imported.income + result.imported.expense > 0 ? (
                  <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="size-4 text-rose-500 mt-0.5 flex-shrink-0" />
                )}
                <AlertDescription className="text-xs">
                  <p className="font-medium">
                    Imported: {result.imported.income} income, {result.imported.expense} expense ({result.totalProcessed} rows processed)
                  </p>
                  {result.errors.length > 0 && (
                    <div className="mt-2 space-y-0.5 max-h-24 overflow-y-auto scrollbar-thin">
                      {result.errors.slice(0, 10).map((e, i) => (
                        <p key={i} className="text-rose-600 dark:text-rose-400">Row {e.row}: {e.error}</p>
                      ))}
                      {result.errors.length > 10 && <p className="text-muted-foreground">...and {result.errors.length - 10} more</p>}
                    </div>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          )}

          <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg p-2.5 leading-relaxed">
            <span className="font-medium">Columns:</span> date (YYYY-MM-DD), type (income|expense), category, amount, note (optional), paymentMethod (optional, expense only), source (optional, income only)
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          <Button onClick={handleImport} disabled={loading || !csvText.trim()} className="gradient-emerald text-white border-0 gap-1.5">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Import {csvText ? `(${parseCsv(csvText).length - 0} rows)` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
