import centrosNegocioCsv from '../../docs/catalogos/centros_negocio.csv?raw';
import tiposDocumentoCsv from '../../docs/catalogos/tipos_documento.csv?raw';
import tiposGastoCsv from '../../docs/catalogos/tipos_gasto.csv?raw';
import tiposRendicionCsv from '../../docs/catalogos/tipos_rendicion.csv?raw';
import type { Table } from 'dexie';
import type {
  CentroNegocio,
  CatalogoBase,
  GastoCatalogos,
  TipoDocumento,
  TipoGasto,
  TipoRendicion,
} from '../types/catalogo';
import {
  centrosNegocioTable,
  db,
  tiposDocumentoTable,
  tiposGastoTable,
  tiposRendicionTable,
} from './db';

type CsvRow = Record<string, string>;
type CatalogoSource = 'CSV seed -> Dexie';
type CatalogoTable<T extends CatalogoBase> = Table<T, string>;

let seedPromise: Promise<void> | null = null;
const CATALOG_SOURCE: CatalogoSource = 'CSV seed -> Dexie';

function logCatalogosDiagnostic(
  message: string,
  details: Record<string, unknown>,
): void {
  if (import.meta.env.DEV) {
    console.info(`[SGO Catalogos] ${message}`, details);
  }
}

function warnCatalogosDiagnostic(
  message: string,
  details: Record<string, unknown>,
): void {
  if (import.meta.env.DEV) {
    console.warn(`[SGO Catalogos] ${message}`, details);
  }
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === ',' && !insideQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsv(content: string): CsvRow[] {
  const [headerLine, ...rows] = content.trim().split(/\r?\n/);
  const headers = parseCsvLine(headerLine).map((header) => header.replace(/^\uFEFF/, ''));

  return rows
    .filter((row) => row.trim().length > 0)
    .map((row) => {
      const values = parseCsvLine(row);

      return headers.reduce<CsvRow>((record, header, index) => {
        record[header] = values[index] ?? '';
        return record;
      }, {});
    });
}

function parseActivo(value: string): boolean {
  return ['TRUE', '1', 'SI', 'S', 'ACTIVO'].includes(value.trim().toUpperCase());
}

function isActivo(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return parseActivo(value);
  }

  return false;
}

function parseCentrosNegocio(): CentroNegocio[] {
  return parseCsv(centrosNegocioCsv).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    codigo: row.codigo,
    activo: parseActivo(row.activo),
  }));
}

function parseTiposDocumento(): TipoDocumento[] {
  return parseCsv(tiposDocumentoCsv).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    codigo: row.codigo,
    cuenta_contable: row.cuenta_contable,
    activo: parseActivo(row.activo),
  }));
}

function parseTiposRendicion(): TipoRendicion[] {
  return parseCsv(tiposRendicionCsv).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    cuenta_contable: row.cuenta_contable,
    activo: parseActivo(row.activo),
  }));
}

function parseTiposGasto(): TipoGasto[] {
  return parseCsv(tiposGastoCsv).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    cuenta_contable: row.cuenta_contable,
    activo: parseActivo(row.activo),
  }));
}

function getActiveCount<T extends CatalogoBase>(items: T[]): number {
  return items.filter((item) => isActivo(item.activo)).length;
}

async function ensureCatalogoSeed<T extends CatalogoBase>(
  table: CatalogoTable<T>,
  parsedItems: T[],
  catalogName: string,
): Promise<void> {
  const storedItems = await table.toArray();
  const totalLocal = storedItems.length;
  const activeLocal = getActiveCount(storedItems);
  const activeSeed = getActiveCount(parsedItems);
  const storedIds = new Set(storedItems.map((item) => item.id));
  const missingSeedItems = parsedItems.filter((item) => !storedIds.has(item.id));
  const shouldRepairActiveCatalog = activeLocal === 0 && activeSeed > 0;

  if (totalLocal === 0 || shouldRepairActiveCatalog) {
    await table.bulkPut(parsedItems);
    logCatalogosDiagnostic('catalogo hidratado desde seed', {
      catalogo: catalogName,
      source: CATALOG_SOURCE,
      totalLocal,
      activeLocal,
      insertedOrRepaired: parsedItems.length,
      reason: totalLocal === 0 ? 'tabla local vacia' : 'sin registros activos locales',
    });
    return;
  }

  if (missingSeedItems.length > 0) {
    await table.bulkPut(missingSeedItems);
    logCatalogosDiagnostic('catalogo completado desde seed', {
      catalogo: catalogName,
      source: CATALOG_SOURCE,
      totalLocal,
      activeLocal,
      missingSeedItems: missingSeedItems.length,
    });
    return;
  }

  logCatalogosDiagnostic('catalogo local disponible', {
    catalogo: catalogName,
    source: 'Dexie',
    totalLocal,
    activeLocal,
  });
}

async function seedTiposRendicionIfEmpty(): Promise<void> {
  await ensureCatalogoSeed(tiposRendicionTable, parseTiposRendicion(), 'tipos_rendicion');
}

async function seedCatalogos(): Promise<void> {
  const centrosNegocio = parseCentrosNegocio();
  const tiposDocumento = parseTiposDocumento();
  const tiposRendicion = parseTiposRendicion();
  const tiposGasto = parseTiposGasto();

  await db.transaction(
    'rw',
    centrosNegocioTable,
    tiposDocumentoTable,
    tiposRendicionTable,
    tiposGastoTable,
    async () => {
      await ensureCatalogoSeed(centrosNegocioTable, centrosNegocio, 'centros_negocio');
      await ensureCatalogoSeed(tiposDocumentoTable, tiposDocumento, 'tipos_documento');
      await ensureCatalogoSeed(tiposRendicionTable, tiposRendicion, 'tipos_rendicion');
      await ensureCatalogoSeed(tiposGastoTable, tiposGasto, 'tipos_gasto');
    },
  );
}

export function seedCatalogosIfNeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = seedCatalogos().finally(() => {
      seedPromise = null;
    });
  }

  return seedPromise;
}

async function getActiveCatalogo<T extends { activo: boolean; nombre: string }>(
  loader: () => Promise<T[]>,
): Promise<T[]> {
  const items = await loader();
  return items
    .filter((item) => isActivo(item.activo))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

function logLoadedGastoCatalogos(catalogos: GastoCatalogos): void {
  const emptyCatalogos = [
    catalogos.centrosNegocio.length === 0 ? 'centros_negocio' : null,
    catalogos.tiposDocumento.length === 0 ? 'tipos_documento' : null,
    catalogos.tiposGasto.length === 0 ? 'tipos_gasto' : null,
  ].filter(Boolean);
  const details = {
    source: CATALOG_SOURCE,
    centrosNegocio: catalogos.centrosNegocio.length,
    tiposDocumento: catalogos.tiposDocumento.length,
    tiposGasto: catalogos.tiposGasto.length,
    emptyCatalogos,
  };

  if (emptyCatalogos.length > 0) {
    warnCatalogosDiagnostic('catalogos vacios despues de intentar cargar seed', details);
    return;
  }

  logCatalogosDiagnostic('catalogos cargados para Crear Gasto', details);
}

export async function getCentrosNegocio(): Promise<CentroNegocio[]> {
  await seedCatalogosIfNeeded();
  return getActiveCatalogo(() => centrosNegocioTable.toArray());
}

export async function getTiposDocumento(): Promise<TipoDocumento[]> {
  await seedCatalogosIfNeeded();
  return getActiveCatalogo(() => tiposDocumentoTable.toArray());
}

export async function getTiposRendicion(): Promise<TipoRendicion[]> {
  await seedCatalogosIfNeeded();
  await seedTiposRendicionIfEmpty();
  return getActiveCatalogo(() => tiposRendicionTable.toArray());
}

export async function getTiposGasto(): Promise<TipoGasto[]> {
  await seedCatalogosIfNeeded();
  return getActiveCatalogo(() => tiposGastoTable.toArray());
}

export async function getGastoCatalogos(): Promise<GastoCatalogos> {
  const [centrosNegocio, tiposDocumento, tiposGasto] = await Promise.all([
    getCentrosNegocio(),
    getTiposDocumento(),
    getTiposGasto(),
  ]);

  const catalogos = {
    centrosNegocio,
    tiposDocumento,
    tiposGasto,
  };

  logLoadedGastoCatalogos(catalogos);
  return catalogos;
}

export async function getCentroNegocioById(id: string): Promise<CentroNegocio | undefined> {
  await seedCatalogosIfNeeded();
  return centrosNegocioTable.get(id);
}

export async function getTipoDocumentoById(id: string): Promise<TipoDocumento | undefined> {
  await seedCatalogosIfNeeded();
  return tiposDocumentoTable.get(id);
}

export async function getTipoRendicionById(id: string): Promise<TipoRendicion | undefined> {
  await seedCatalogosIfNeeded();
  await seedTiposRendicionIfEmpty();
  return tiposRendicionTable.get(id);
}

export async function getTipoGastoById(id: string): Promise<TipoGasto | undefined> {
  await seedCatalogosIfNeeded();
  return tiposGastoTable.get(id);
}
