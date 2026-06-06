import type { Table } from 'dexie';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import type {
  CatalogoBase,
  CatalogoId,
  CatalogoLocalMeta,
  CentroNegocio,
  GastoCatalogos,
  TipoDocumento,
  TipoGasto,
  TipoRendicion,
} from '../types/catalogo';
import {
  catalogMetaTable,
  centrosNegocioTable,
  db,
  tiposDocumentoTable,
  tiposGastoTable,
  tiposRendicionTable,
} from './db';
import { firebaseAuth, firestoreDb } from './firebase/firebase';
import { nowIso } from '../utils/date';

export type CatalogoKey = CatalogoId;
export type CatalogoTableItem = CentroNegocio | TipoDocumento | TipoGasto | TipoRendicion;
export type CatalogoTable = Table<CatalogoTableItem, string>;

interface EnsureCatalogosOptions {
  catalogos?: CatalogoKey[];
  includeInactive?: boolean;
  force?: boolean;
}

interface RemoteCatalogoData {
  [key: string]: unknown;
  nombre?: unknown;
  codigo?: unknown;
  cuenta_contable?: unknown;
  activo?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
}

interface RemoteCatalogoMeta {
  version: number;
  updatedAt?: string;
}

interface CatalogSessionState {
  version: number;
  includeInactive: boolean;
}

export const CATALOG_KEYS: CatalogoKey[] = [
  'centros_negocio',
  'tipos_documento',
  'tipos_gasto',
  'tipos_rendicion',
];

const catalogItemsCache = new Map<CatalogoKey, CatalogoTableItem[]>();
const catalogLoadPromises = new Map<string, Promise<void>>();
const sessionCatalogs = new Map<CatalogoKey, CatalogSessionState>();
let catalogBootstrapCompleted = false;
let lastCatalogosWarning: string | null = null;

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

function isActivo(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return ['TRUE', '1', 'SI', 'S', 'ACTIVO'].includes(value.trim().toUpperCase());
  }

  return false;
}

function normalizeRemoteActivo(value: unknown): boolean {
  return value === undefined ? true : isActivo(value);
}

function getRemoteString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function toIsoString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate().toISOString();
  }

  return undefined;
}

function normalizeRemoteTimestamps(data: RemoteCatalogoData) {
  const createdAt = toIsoString(data.createdAt ?? data.created_at);
  const updatedAt = toIsoString(data.updatedAt ?? data.updated_at) ?? createdAt;

  return {
    createdAt,
    updatedAt,
  };
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

function normalizeRemoteCatalogoItem(
  catalogo: CatalogoKey,
  id: string,
  data: RemoteCatalogoData,
): CatalogoTableItem {
  if (catalogo === 'centros_negocio') {
    return normalizeRemoteCentroNegocio(id, data);
  }

  if (catalogo === 'tipos_documento') {
    return normalizeRemoteTipoDocumento(id, data);
  }

  if (catalogo === 'tipos_gasto') {
    return normalizeRemoteTipoGasto(id, data);
  }

  return normalizeRemoteTipoRendicion(id, data);
}

export function getCatalogoLocalTable(catalogo: CatalogoKey): CatalogoTable {
  if (catalogo === 'centros_negocio') {
    return centrosNegocioTable as unknown as CatalogoTable;
  }

  if (catalogo === 'tipos_documento') {
    return tiposDocumentoTable as unknown as CatalogoTable;
  }

  if (catalogo === 'tipos_gasto') {
    return tiposGastoTable as unknown as CatalogoTable;
  }

  return tiposRendicionTable as unknown as CatalogoTable;
}

function sortCatalogoItems<T extends { nombre: string }>(items: T[]): T[] {
  return [...items].sort((first, second) => first.nombre.localeCompare(second.nombre, 'es'));
}

function getRemoteMetaVersion(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

function normalizeRemoteCatalogoMeta(data: Record<string, unknown>): RemoteCatalogoMeta {
  return {
    version: getRemoteMetaVersion(data.version),
    updatedAt: toIsoString(data.updatedAt),
  };
}

async function createMissingRemoteCatalogoMeta(
  catalogo: CatalogoKey,
): Promise<RemoteCatalogoMeta | null> {
  const currentUser = firebaseAuth.currentUser;

  if (!currentUser) {
    return null;
  }

  try {
    await setDoc(doc(firestoreDb, 'catalogos_meta', catalogo), {
      version: 1,
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.uid,
    });

    return {
      version: 1,
      updatedAt: nowIso(),
    };
  } catch (error) {
    const snapshot = await getDoc(doc(firestoreDb, 'catalogos_meta', catalogo)).catch(
      () => null,
    );

    if (snapshot?.exists()) {
      return normalizeRemoteCatalogoMeta(snapshot.data());
    }

    warnCatalogosDiagnostic('no se pudo crear metadata remota de catalogo', {
      catalogo,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function getRemoteCatalogoMeta(catalogo: CatalogoKey): Promise<RemoteCatalogoMeta> {
  const snapshot = await getDoc(doc(firestoreDb, 'catalogos_meta', catalogo));

  if (snapshot.exists()) {
    return normalizeRemoteCatalogoMeta(snapshot.data());
  }

  return (await createMissingRemoteCatalogoMeta(catalogo)) ?? {
    version: 0,
  };
}

async function fetchRemoteCatalogoItems(
  catalogo: CatalogoKey,
  includeInactive: boolean,
): Promise<CatalogoTableItem[]> {
  const collectionRef = collection(firestoreDb, catalogo);
  const snapshot = await getDocs(
    includeInactive ? collectionRef : query(collectionRef, where('activo', '==', true)),
  );

  return snapshot.docs.map((documentSnapshot) =>
    normalizeRemoteCatalogoItem(
      catalogo,
      documentSnapshot.id,
      documentSnapshot.data() as RemoteCatalogoData,
    ),
  );
}

async function hydrateCatalogoMemory(catalogo: CatalogoKey): Promise<CatalogoTableItem[]> {
  const items = await getCatalogoLocalTable(catalogo).toArray();
  catalogItemsCache.set(catalogo, items);
  return items;
}

function rememberSessionCatalogo(
  catalogo: CatalogoKey,
  version: number,
  includeInactive: boolean,
): void {
  const current = sessionCatalogs.get(catalogo);
  sessionCatalogs.set(catalogo, {
    version,
    includeInactive: includeInactive || current?.includeInactive === true,
  });
}

function hasSessionCatalogo(catalogo: CatalogoKey, includeInactive: boolean): boolean {
  const session = sessionCatalogs.get(catalogo);
  return Boolean(session && (session.includeInactive || !includeInactive));
}

function hasRequiredScope(
  localMeta: CatalogoLocalMeta | undefined,
  includeInactive: boolean,
): boolean {
  return Boolean(localMeta && (localMeta.includeInactive || !includeInactive));
}

function setCatalogosFallbackWarning(error: unknown): void {
  lastCatalogosWarning =
    'No se pudo validar catalogos en Firestore. Se usaran los datos locales disponibles.';
  warnCatalogosDiagnostic('fallback a cache local de catalogos', {
    error: error instanceof Error ? error.message : String(error),
  });
}

async function useLocalCatalogoFallback(
  catalogo: CatalogoKey,
  includeInactive: boolean,
  error: unknown,
): Promise<void> {
  const table = getCatalogoLocalTable(catalogo);
  const localCount = await table.count();
  const localMeta = await catalogMetaTable.get(catalogo);

  if (localCount > 0) {
    setCatalogosFallbackWarning(error);
    await hydrateCatalogoMemory(catalogo);
    rememberSessionCatalogo(catalogo, localMeta?.version ?? 0, localMeta?.includeInactive === true);
    return;
  }

  throw new Error(
    'No se pudieron cargar los catalogos desde Firestore y no hay cache local disponible.',
  );
}

async function storeRemoteCatalogoItems(
  catalogo: CatalogoKey,
  remoteItems: CatalogoTableItem[],
  remoteMeta: RemoteCatalogoMeta,
  includeInactive: boolean,
  previousMeta: CatalogoLocalMeta | undefined,
): Promise<void> {
  const table = getCatalogoLocalTable(catalogo);
  const remoteIds = new Set(remoteItems.map((item) => item.id));
  const lastFetchedAt = nowIso();

  await db.transaction('rw', table, catalogMetaTable, async () => {
    if (remoteItems.length > 0) {
      await table.bulkPut(remoteItems);
    }

    if (includeInactive) {
      const localKeys = (await table.toCollection().primaryKeys()).map(String);
      const staleIds = localKeys.filter((itemId) => !remoteIds.has(itemId));

      if (staleIds.length > 0) {
        await table.bulkDelete(staleIds);
      }
    } else {
      const activeLocalItems = await table
        .filter((item) => isActivo(item.activo))
        .toArray();
      const staleActiveIds = activeLocalItems
        .filter((item) => !remoteIds.has(item.id))
        .map((item) => item.id);

      if (staleActiveIds.length > 0) {
        await table.bulkDelete(staleActiveIds);
      }
    }

    await catalogMetaTable.put({
      catalogoId: catalogo,
      version: remoteMeta.version,
      updatedAt: remoteMeta.updatedAt,
      lastFetchedAt,
      includeInactive: includeInactive || previousMeta?.includeInactive === true,
    });
  });

  await hydrateCatalogoMemory(catalogo);
  rememberSessionCatalogo(catalogo, remoteMeta.version, includeInactive);
  logCatalogosDiagnostic('catalogo sincronizado desde Firestore', {
    catalogo,
    version: remoteMeta.version,
    includeInactive,
    total: remoteItems.length,
  });
}

async function loadCatalogoNow(
  catalogo: CatalogoKey,
  includeInactive: boolean,
  force: boolean,
): Promise<void> {
  if (!navigator.onLine || !firebaseAuth.currentUser) {
    await useLocalCatalogoFallback(catalogo, includeInactive, 'sin conexion o sesion');
    return;
  }

  const localMeta = await catalogMetaTable.get(catalogo);
  let remoteMeta: RemoteCatalogoMeta;

  try {
    remoteMeta = await getRemoteCatalogoMeta(catalogo);
  } catch (error) {
    await useLocalCatalogoFallback(catalogo, includeInactive, error);
    return;
  }

  const localCount = await getCatalogoLocalTable(catalogo).count();
  const canUseLocalVersion =
    !force &&
    localMeta &&
    localCount > 0 &&
    localMeta.version === remoteMeta.version &&
    hasRequiredScope(localMeta, includeInactive);

  if (canUseLocalVersion) {
    await hydrateCatalogoMemory(catalogo);
    rememberSessionCatalogo(catalogo, localMeta.version, localMeta.includeInactive === true);
    return;
  }

  try {
    const remoteItems = await fetchRemoteCatalogoItems(catalogo, includeInactive);
    await storeRemoteCatalogoItems(catalogo, remoteItems, remoteMeta, includeInactive, localMeta);
  } catch (error) {
    await useLocalCatalogoFallback(catalogo, includeInactive, error);
  }
}

async function loadCatalogo(
  catalogo: CatalogoKey,
  includeInactive: boolean,
  force: boolean,
): Promise<void> {
  if (!force && hasSessionCatalogo(catalogo, includeInactive)) {
    return;
  }

  const promiseKey = `${catalogo}:${includeInactive ? 'all' : 'active'}:${force ? 'force' : 'normal'}`;
  const currentPromise = catalogLoadPromises.get(promiseKey);

  if (currentPromise) {
    return currentPromise;
  }

  const promise = loadCatalogoNow(catalogo, includeInactive, force).finally(() => {
    catalogLoadPromises.delete(promiseKey);
  });
  catalogLoadPromises.set(promiseKey, promise);
  return promise;
}

export async function ensureCatalogosLoaded(
  options: EnsureCatalogosOptions = {},
): Promise<void> {
  const includeInactive = options.includeInactive === true;
  const force = options.force === true;
  const catalogos = options.catalogos ?? CATALOG_KEYS;

  if (!force && !includeInactive && !options.catalogos && catalogBootstrapCompleted) {
    return;
  }

  if (force) {
    lastCatalogosWarning = null;
  }

  await Promise.all(
    catalogos.map((catalogo) => loadCatalogo(catalogo, includeInactive, force)),
  );

  if (!includeInactive && !options.catalogos) {
    catalogBootstrapCompleted = true;
  }
}

export async function refreshCatalogosFromRemote(
  options: Omit<EnsureCatalogosOptions, 'force'> = {},
): Promise<void> {
  await ensureCatalogosLoaded({
    ...options,
    force: true,
  });
}

export function getCatalogosLoadWarning(): string | null {
  return lastCatalogosWarning;
}

async function getCatalogoItemsFromCache(catalogo: CatalogoKey): Promise<CatalogoTableItem[]> {
  const cachedItems = catalogItemsCache.get(catalogo);

  if (cachedItems) {
    return [...cachedItems];
  }

  return hydrateCatalogoMemory(catalogo);
}

export async function getCatalogoLocalItems(
  catalogo: CatalogoKey,
  options: { includeInactive?: boolean; force?: boolean } = {},
): Promise<CatalogoTableItem[]> {
  const includeInactive = options.includeInactive === true;

  await ensureCatalogosLoaded({
    catalogos: [catalogo],
    includeInactive,
    force: options.force === true,
  });

  const items = await getCatalogoItemsFromCache(catalogo);
  return sortCatalogoItems(includeInactive ? items : items.filter((item) => isActivo(item.activo)));
}

export async function recordCatalogoLocalWrite(
  catalogo: CatalogoKey,
  item: CatalogoTableItem,
): Promise<void> {
  const table = getCatalogoLocalTable(catalogo);
  const currentMeta = await catalogMetaTable.get(catalogo);
  const nextVersion = Math.max(1, (currentMeta?.version ?? 0) + 1);
  const updatedAt = item.updatedAt ?? nowIso();

  await db.transaction('rw', table, catalogMetaTable, async () => {
    await table.put(item);
    await catalogMetaTable.put({
      catalogoId: catalogo,
      version: nextVersion,
      updatedAt,
      lastFetchedAt: nowIso(),
      includeInactive: true,
    });
  });

  await hydrateCatalogoMemory(catalogo);
  rememberSessionCatalogo(catalogo, nextVersion, true);
}

async function getActiveCatalogo<T extends CatalogoTableItem>(
  catalogo: CatalogoKey,
): Promise<T[]> {
  return getCatalogoLocalItems(catalogo) as Promise<T[]>;
}

export async function getCentrosNegocio(): Promise<CentroNegocio[]> {
  return getActiveCatalogo<CentroNegocio>('centros_negocio');
}

export async function getTiposDocumento(): Promise<TipoDocumento[]> {
  return getActiveCatalogo<TipoDocumento>('tipos_documento');
}

export async function getTiposRendicion(): Promise<TipoRendicion[]> {
  return getActiveCatalogo<TipoRendicion>('tipos_rendicion');
}

export async function getTiposGasto(): Promise<TipoGasto[]> {
  return getActiveCatalogo<TipoGasto>('tipos_gasto');
}

export async function getGastoCatalogos(): Promise<GastoCatalogos> {
  await ensureCatalogosLoaded({
    catalogos: ['centros_negocio', 'tipos_documento', 'tipos_gasto'],
  });

  const [centrosNegocio, tiposDocumento, tiposGasto] = await Promise.all([
    getCentrosNegocio(),
    getTiposDocumento(),
    getTiposGasto(),
  ]);

  return {
    centrosNegocio,
    tiposDocumento,
    tiposGasto,
  };
}

async function getCatalogoItemById<T extends CatalogoTableItem>(
  catalogo: CatalogoKey,
  id: string,
): Promise<T | undefined> {
  await ensureCatalogosLoaded({ catalogos: [catalogo] });

  const cachedItems = await getCatalogoItemsFromCache(catalogo);
  const cachedItem = cachedItems.find((item) => item.id === id);

  if (cachedItem) {
    return cachedItem as T;
  }

  return getCatalogoLocalTable(catalogo).get(id) as Promise<T | undefined>;
}

export async function getCentroNegocioById(id: string): Promise<CentroNegocio | undefined> {
  return getCatalogoItemById<CentroNegocio>('centros_negocio', id);
}

export async function getTipoDocumentoById(id: string): Promise<TipoDocumento | undefined> {
  return getCatalogoItemById<TipoDocumento>('tipos_documento', id);
}

export async function getTipoRendicionById(id: string): Promise<TipoRendicion | undefined> {
  return getCatalogoItemById<TipoRendicion>('tipos_rendicion', id);
}

export async function getTipoGastoById(id: string): Promise<TipoGasto | undefined> {
  return getCatalogoItemById<TipoGasto>('tipos_gasto', id);
}
