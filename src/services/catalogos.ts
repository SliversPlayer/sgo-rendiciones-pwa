import centrosNegocioCsv from '../../docs/catalogos/centros_negocio.csv?raw';
import tiposDocumentoCsv from '../../docs/catalogos/tipos_documento.csv?raw';
import tiposGastoCsv from '../../docs/catalogos/tipos_gasto.csv?raw';
import tiposRendicionCsv from '../../docs/catalogos/tipos_rendicion.csv?raw';
import type {
  CentroNegocio,
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

let seedPromise: Promise<void> | null = null;

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
  return value.trim().toUpperCase() === 'TRUE';
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

async function seedTiposRendicionIfEmpty(): Promise<void> {
  if ((await tiposRendicionTable.count()) === 0) {
    await tiposRendicionTable.bulkPut(parseTiposRendicion());
  }
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
      if ((await centrosNegocioTable.count()) === 0) {
        await centrosNegocioTable.bulkPut(centrosNegocio);
      }

      if ((await tiposDocumentoTable.count()) === 0) {
        await tiposDocumentoTable.bulkPut(tiposDocumento);
      }

      if ((await tiposRendicionTable.count()) === 0) {
        await tiposRendicionTable.bulkPut(tiposRendicion);
      }

      if ((await tiposGastoTable.count()) === 0) {
        await tiposGastoTable.bulkPut(tiposGasto);
      }
    },
  );
}

export function seedCatalogosIfNeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = seedCatalogos().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }

  return seedPromise;
}

async function getActiveCatalogo<T extends { activo: boolean; nombre: string }>(
  loader: () => Promise<T[]>,
): Promise<T[]> {
  const items = await loader();
  return items
    .filter((item) => item.activo)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
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

  return {
    centrosNegocio,
    tiposDocumento,
    tiposGasto,
  };
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
