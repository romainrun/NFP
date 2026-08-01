import type { Product } from '@/features/products/domain/types';
import { eurosToCents, parseEurosInput } from '@/shared/utils/money';

export type CsvProductRow = {
  sku?: string;
  name: string;
  barcode?: string | null;
  priceCents: number;
  vatRate: number;
  stockQuantity: number;
  categoryName?: string | null;
};

function csvEscape(value: unknown): string {
  const raw = String(value ?? '');
  if (/[;"\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

export function csvLine(values: unknown[]): string {
  return values.map(csvEscape).join(';');
}

export function productsToCsv(products: Product[]): string {
  const rows = [
    csvLine(['sku', 'nom', 'code_barres', 'prix_ttc', 'tva', 'stock', 'actif']),
    ...products.map((product) =>
      csvLine([
        product.sku,
        product.name,
        product.barcode ?? '',
        (product.priceCents / 100).toFixed(2),
        product.vatRate,
        product.stockQuantity,
        product.isActive ? 'oui' : 'non',
      ]),
    ),
  ];
  return rows.join('\n');
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if ((char === ';' || char === ',') && !quoted) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

export function parseProductsCsv(raw: string): CsvProductRow[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]!).map((header) =>
    header.trim().toLowerCase().replace(/\s+/g, '_'),
  );

  const read = (cells: string[], names: string[]) => {
    const index = headers.findIndex((header) => names.includes(header));
    return index >= 0 ? cells[index]?.trim() ?? '' : '';
  };

  return lines.slice(1).map((line, index) => {
    const cells = splitCsvLine(line);
    const name = read(cells, ['name', 'nom', 'designation', 'désignation']);
    const sku = read(cells, ['sku', 'reference', 'référence']);
    const barcode = read(cells, ['barcode', 'code_barres', 'ean']);
    const priceCentsRaw = read(cells, ['price_cents', 'prix_centimes']);
    const priceRaw = read(cells, ['price', 'prix', 'prix_ttc']);
    const vatRaw = read(cells, ['vat', 'tva', 'vat_rate']);
    const stockRaw = read(cells, ['stock', 'stock_quantity', 'quantite', 'quantité']);
    const categoryName = read(cells, ['category', 'categorie', 'catégorie']);
    const parsedPrice = priceCentsRaw
      ? Number(priceCentsRaw)
      : eurosToCents(parseEurosInput(priceRaw) ?? Number.NaN);
    const vatRate = vatRaw ? Number(vatRaw.replace(',', '.')) : 5.5;
    const stockQuantity = stockRaw ? Number(stockRaw.replace(',', '.')) : 0;

    if (!name || !Number.isFinite(parsedPrice)) {
      throw new Error(`Ligne ${index + 2}: nom ou prix invalide`);
    }

    return {
      sku: sku || undefined,
      name,
      barcode: barcode || null,
      priceCents: Math.round(parsedPrice),
      vatRate: Number.isFinite(vatRate) ? vatRate : 5.5,
      stockQuantity: Number.isFinite(stockQuantity) ? stockQuantity : 0,
      categoryName: categoryName || null,
    };
  });
}
