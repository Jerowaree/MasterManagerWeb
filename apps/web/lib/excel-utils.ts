import * as XLSX from 'xlsx';

export type InventoryImportItem = {
  rowNumber: number;
  productId: string;
  name: string;
  category: string;
  price: number;
  minStock: number;
  initialStock?: number;
  initialCost?: number;
  branchId?: string;
};

export type InventoryImportError = {
  rowNumber: number;
  message: string;
};

export type InventoryImportWarning = {
  rowNumber: number;
  message: string;
};

export type InventoryImportResult = {
  items: InventoryImportItem[];
  errors: InventoryImportError[];
  warnings: InventoryImportWarning[];
};

type NumericField = 'price' | 'minStock' | 'initialStock' | 'initialCost';
type TextField = 'productId' | 'name' | 'category';

const HEADER_ALIASES: Record<string, keyof InventoryImportItem> = {
  codigo: 'productId',
  sku: 'productId',
  producto: 'name',
  nombre: 'name',
  categoria: 'category',
  precio: 'price',
  stockminimo: 'minStock',
  stockmin: 'minStock',
  minstock: 'minStock',
  stock: 'initialStock',
  stockinicial: 'initialStock',
  cantidad: 'initialStock',
  costoinicial: 'initialCost',
  costounitario: 'initialCost',
  costo: 'initialCost',
  branchid: 'branchId',
  sucursalid: 'branchId',
  sedeid: 'branchId',
};

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]/g, '');
}

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const numeric = Number(String(value).replace(',', '.'));
  return Number.isFinite(numeric) ? numeric : undefined;
}

export function parseInventoryRows(
  rows: Array<Record<string, unknown>>,
  options?: { maxRows?: number }
): InventoryImportResult {
  const items: InventoryImportItem[] = [];
  const errors: InventoryImportError[] = [];
  const warnings: InventoryImportWarning[] = [];
  const maxRows = options?.maxRows ?? 500;

  if (rows.length > maxRows) {
    errors.push({
      rowNumber: 0,
      message: `El archivo tiene ${rows.length} filas. El maximo permitido es ${maxRows}.`,
    });
    return { items, errors, warnings };
  }

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const mapped: Partial<InventoryImportItem> = { rowNumber };

    Object.entries(row).forEach(([key, value]) => {
      const alias = HEADER_ALIASES[normalizeHeader(key)];
      if (!alias) return;
      if (alias === 'price' || alias === 'minStock' || alias === 'initialStock' || alias === 'initialCost') {
        const numeric = toNumber(value);
        if (numeric !== undefined) {
          (mapped as Record<NumericField, number | undefined>)[alias] = numeric;
        }
        return;
      }
      if (alias === 'branchId') {
        const text = String(value ?? '').trim();
        if (text) mapped.branchId = text;
        return;
      }
      if (alias === 'productId' || alias === 'name' || alias === 'category') {
        const text = String(value ?? '').trim();
        if (text) {
          (mapped as Record<TextField, string>)[alias] = text;
        }
      }
    });

    const productId = mapped.productId?.trim();
    const name = mapped.name?.trim();
    const category = mapped.category?.trim();
    const price = mapped.price;

    if (!productId || !name || !category || price === undefined) {
      errors.push({
        rowNumber,
        message: 'Faltan campos obligatorios (Codigo, Nombre, Categoria, Precio).',
      });
      return;
    }

    const minStock = mapped.minStock ?? 0;
    const initialStock = mapped.initialStock;
    const initialCost = mapped.initialCost;

    if (initialStock !== undefined && initialStock > 0 && !mapped.branchId) {
      warnings.push({
        rowNumber,
        message: 'Stock inicial informado sin branchId/sucursalId.',
      });
    }

    items.push({
      rowNumber,
      productId,
      name,
      category,
      price,
      minStock,
      initialStock,
      initialCost,
      branchId: mapped.branchId,
    });
  });

  return { items, errors, warnings };
}

export async function parseInventoryExcel(
  file: File,
  options?: { maxRows?: number }
): Promise<InventoryImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      items: [],
      errors: [{ rowNumber: 0, message: 'El archivo no contiene hojas.' }],
      warnings: [],
    };
  }
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });

  return parseInventoryRows(rows, options);
}

/**
 * Exports a JSON array to an Excel file.
 * @param data Array of objects to export
 * @param filename Name of the file (without extension)
 * @param sheetName Name of the worksheet
 */
export const exportToExcel = <T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  sheetName: string = 'Datos'
) => {
  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // Convert JSON to worksheet
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Append worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Generate and download Excel file
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
};
