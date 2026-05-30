import centrosNegocioCsv from '../../docs/catalogos/centros_negocio.csv?raw';
import tiposDocumentoCsv from '../../docs/catalogos/tipos_documento.csv?raw';
import tiposGastoCsv from '../../docs/catalogos/tipos_gasto.csv?raw';
import tiposRendicionCsv from '../../docs/catalogos/tipos_rendicion.csv?raw';
import type { Table } from 'dexie';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
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
import { firebaseAuth, firestoreDb } from './firebase/firebase';

type CsvRow = Record<string, string>;
type CatalogoSource = 'CSV seed -> Dexie';
interface RefreshCatalogosOptions {
  includeInactive?: boolean;
}
type CatalogoTable<T extends CatalogoBase> = Table<T, string>;
type RemoteCatalogoData = Partial<CatalogoBase> & {
  cuenta_contable?: string;
  created_at?: string;
  updated_at?: string;
};

let seedPromise: Promise<void> | null = null;
const CATALOG_SOURCE: CatalogoSource = 'CSV seed -> Dexie';
const remoteCatalogosWithDocuments = new Set<string>();

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

function normalizeRemoteActivo(value: unknown): boolean {
  return value === undefined ? true : isActivo(value);
}

function getRemoteString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeRemoteTimestamps(data: RemoteCatalogoData) {
  const createdAt = getRemoteString(data.createdAt ?? data.created_at);
  const updatedAt = getRemoteString(data.updatedAt ?? data.updated_at, createdAt);

  return {
    createdAt: createdAt || undefined,
    updatedAt: updatedAt || undefined,
  };
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
    codigo: row.id,
    cuenta_contable: row.cuenta_contable,
    activo: parseActivo(row.activo),
  }));
}

function parseTiposGasto(): TipoGasto[] {
  return parseCsv(tiposGastoCsv).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    codigo: row.id,
    cuenta_contable: row.cuenta_contable,
    activo: parseActivo(row.activo),
  }));
}

function normalizeRemoteCentroNegocio(id: string, data: RemoteCatalogoData): CentroNegocio {
  return {
    id,
    nombre: getRemoteString(data.nombre, 'Sin nombre'),
    codigo: getRemoteString(data.codigo, id),
    activo: normalizeRemoteActivo(data.activo),
    ...normalizeRemoteTimestamps(data),
  };
}

function normalizeRemoteTipoDocumento(id: string, data: RemoteCatalogoData): TipoDocumento {
  return {
    id,
    nombre: getRemoteString(data.nombre, 'Sin nombre'),
    codigo: getRemoteString(data.codigo, id),
    cuenta_contable: getRemoteString(data.cuenta_contable, getRemoteString(data.codigo, id)),
    activo: normalizeRemoteActivo(data.activo),
    ...normalizeRemoteTimestamps(data),
  };
}

function normalizeRemoteTipoRendicion(id: string, data: RemoteCatalogoData): TipoRendicion {
  return {
    id,
    nombre: getRemoteString(data.nombre, 'Sin nombre'),
    codigo: getRemoteString(data.codigo, id),
    cuenta_contable: getRemoteString(data.cuenta_contable, getRemoteString(data.codigo, id)),
    activo: normalizeRemoteActivo(data.activo),
    ...normalizeRemoteTimestamps(data),
  };
}

function normalizeRemoteTipoGasto(id: string, data: RemoteCatalogoData): TipoGasto {
  return {
    id,
    nombre: getRemoteString(data.nombre, 'Sin nombre'),
    codigo: getRemoteString(data.codigo, id),
    cuenta_contable: getRemoteString(data.cuenta_contable, getRemoteString(data.codigo, id)),
    activo: normalizeRemoteActivo(data.activo),
    ...normalizeRemoteTimestamps(data),
  };
}

async function refreshRemoteTable<T extends CatalogoBase>(
  collectionName: string,
  table: CatalogoTable<T>,
  normalizer: (id: string, data: RemoteCatalogoData) => T,
  includeInactive: boolean,
): Promise<void> {
  const collectionRef = collection(firestoreDb, collectionName);
  const snapshot = await getDocs(
    includeInactive ? collectionRef : query(collectionRef, where('activo', '==', true)),
  );

  if (snapshot.empty) {
    if (!includeInactive) {
      const existenceSnapshot = await getDocs(query(collectionRef, limit(1)));

      if (!existenceSnapshot.empty) {
        remoteCatalogosWithDocuments.add(collectionName);
      }
    }

    return;
  }

  remoteCatalogosWithDocuments.add(collectionName);
  await table.bulkPut(
    snapshot.docs.map((documentSnapshot) =>
      normalizer(documentSnapshot.id, documentSnapshot.data() as RemoteCatalogoData),
    ),
  );
}

export async function refreshCatalogosFromRemote(
  options: RefreshCatalogosOptions = {},
): Promise<void> {
  if (!navigator.onLine || !firebaseAuth.currentUser) {
    return;
  }

  const includeInactive = options.includeInactive === true;

  await Promise.all([
    refreshRemoteTable(
      'centros_negocio',
      centrosNegocioTable,
      normalizeRemoteCentroNegocio,
      includeInactive,
    ),
    refreshRemoteTable(
      'tipos_documento',
      tiposDocumentoTable,
      normalizeRemoteTipoDocumento,
      includeInactive,
    ),
    refreshRemoteTable(
      'tipos_rendicion',
      tiposRendicionTable,
      normalizeRemoteTipoRendicion,
      includeInactive,
    ),
    refreshRemoteTable(
      'tipos_gasto',
      tiposGastoTable,
      normalizeRemoteTipoGasto,
      includeInactive,
    ),
  ]);
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
  const hasManagedItems = storedItems.some((item) => item.createdAt || item.updatedAt);
  const hasRemoteDocuments = remoteCatalogosWithDocuments.has(catalogName);
  const shouldRepairActiveCatalog =
    activeLocal === 0 &&
    activeSeed > 0 &&
    !hasManagedItems &&
    !hasRemoteDocuments;

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

  if (missingSeedItems.length > 0 && !hasRemoteDocuments) {
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
  await refreshCatalogosFromRemote().catch((error) => {
    warnCatalogosDiagnostic('no se pudo refrescar catalogos desde Firestore', {
      error: error instanceof Error ? error.message : String(error),
    });
  });

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
