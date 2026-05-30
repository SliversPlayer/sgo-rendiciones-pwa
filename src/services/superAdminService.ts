import { FirebaseError, deleteApp, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import type { Table } from 'dexie';
import { refreshCatalogosFromRemote, seedCatalogosIfNeeded } from './catalogos';
import {
  centrosNegocioTable,
  tiposDocumentoTable,
  tiposGastoTable,
  tiposRendicionTable,
} from './db';
import { firebaseConfig, firestoreDb } from './firebase/firebase';
import type {
  CatalogoKey,
  CreateManagedUserInput,
  ManagedCatalogInput,
  ManagedCatalogItem,
  ManagedUser,
  UpdateManagedUserInput,
} from '../types/superadmin';
import type {
  CatalogoBase,
  CentroNegocio,
  TipoDocumento,
  TipoGasto,
  TipoRendicion,
} from '../types/catalogo';
import type { UserRole } from '../types/user';
import { nowIso } from '../utils/date';
import { createId } from '../utils/id';
import { normalizeUserRole, isSuperAdminRole } from '../utils/roles';
import { normalizeRut, validateRut } from '../utils/rut';

type CatalogoTableItem = CentroNegocio | TipoDocumento | TipoGasto | TipoRendicion;
type CatalogoTable = Table<CatalogoTableItem, string>;
type RemoteCatalogoData = Partial<CatalogoBase> & {
  cuenta_contable?: string;
};

const MIN_TEMPORARY_PASSWORD_LENGTH = 8;
const CATALOG_KEYS: CatalogoKey[] = [
  'centros_negocio',
  'tipos_documento',
  'tipos_gasto',
  'tipos_rendicion',
];

let catalogPersistencePromise: Promise<void> | null = null;

function getFirebaseErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    if (error.code === 'auth/email-already-in-use') {
      return 'Ya existe una cuenta en Firebase Auth con ese email.';
    }

    if (error.code === 'auth/invalid-email') {
      return 'El email no es valido.';
    }

    if (error.code === 'auth/weak-password') {
      return `La contrasena temporal debe tener al menos ${MIN_TEMPORARY_PASSWORD_LENGTH} caracteres.`;
    }

    if (error.code === 'permission-denied') {
      return 'Firebase rechazo la operacion por permisos.';
    }
  }

  return error instanceof Error ? error.message : 'No se pudo completar la operacion.';
}

function getOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function getRequiredString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function isFirestoreTrue(value: unknown): boolean {
  return value === true || (typeof value === 'string' && value.trim().toLowerCase() === 'true');
}

function normalizeManagedUser(uid: string, data: Partial<ManagedUser>): ManagedUser {
  const email = getRequiredString(data.email);
  const createdAt = getOptionalString(data.createdAt);

  return {
    uid: data.uid ?? uid,
    nombre: getRequiredString(data.nombre, email.split('@')[0] || 'Usuario'),
    email,
    rut: getOptionalString(data.rut),
    rol: normalizeUserRole(data.rol),
    activo: data.activo !== false,
    mustChangePassword: isFirestoreTrue(data.mustChangePassword),
    passwordChangedAt: getOptionalString(data.passwordChangedAt),
    createdAt,
    updatedAt: getOptionalString(data.updatedAt) ?? createdAt,
  };
}

function isActiveSuperAdmin(user: Pick<ManagedUser, 'rol' | 'activo'>): boolean {
  return user.activo !== false && isSuperAdminRole(user.rol);
}

function assertKeepsActiveSuperAdmin(
  users: ManagedUser[],
  uid: string,
  patch: Partial<Pick<ManagedUser, 'rol' | 'activo'>>,
): void {
  const targetUser = users.find((user) => user.uid === uid);

  if (!targetUser) {
    return;
  }

  const projectedTarget = {
    ...targetUser,
    ...patch,
  };

  if (!isActiveSuperAdmin(targetUser) || isActiveSuperAdmin(projectedTarget)) {
    return;
  }

  if (!users.some((user) => user.uid !== uid && isActiveSuperAdmin(user))) {
    throw new Error('Debe existir al menos un SUPERADMIN activo.');
  }
}

function validateCreateManagedUserInput(input: CreateManagedUserInput): void {
  if (!input.nombre.trim()) {
    throw new Error('Ingresa el nombre del usuario.');
  }

  if (!input.email.trim()) {
    throw new Error('Ingresa el email del usuario.');
  }

  validateManagedUserRut(input.rut);

  if (input.temporaryPassword.length < MIN_TEMPORARY_PASSWORD_LENGTH) {
    throw new Error(
      `La contrasena temporal debe tener al menos ${MIN_TEMPORARY_PASSWORD_LENGTH} caracteres.`,
    );
  }
}

function validateManagedUserRut(rut: string): string {
  if (!rut.trim()) {
    throw new Error('Ingresa el RUT del usuario.');
  }

  if (!validateRut(rut)) {
    throw new Error('El RUT ingresado no es valido.');
  }

  return normalizeRut(rut);
}

function validateUpdateManagedUserInput(input: UpdateManagedUserInput): string {
  if (!input.nombre.trim()) {
    throw new Error('Ingresa el nombre del usuario.');
  }

  return validateManagedUserRut(input.rut);
}

function assertRutIsAvailable(
  users: ManagedUser[],
  normalizedRut: string,
  currentUid?: string,
): void {
  const duplicatedRut = users.some(
    (user) => user.uid !== currentUid && user.rut && normalizeRut(user.rut) === normalizedRut,
  );

  if (duplicatedRut) {
    throw new Error('Ya existe un usuario registrado con este RUT.');
  }
}

export async function getManagedUsers(): Promise<ManagedUser[]> {
  const snapshot = await getDocs(collection(firestoreDb, 'usuarios'));

  return snapshot.docs
    .map((documentSnapshot) =>
      normalizeManagedUser(documentSnapshot.id, documentSnapshot.data() as Partial<ManagedUser>),
    )
    .sort((first, second) => first.nombre.localeCompare(second.nombre, 'es'));
}

export async function createManagedUser(input: CreateManagedUserInput): Promise<void> {
  validateCreateManagedUserInput(input);

  const normalizedRut = normalizeRut(input.rut);
  assertRutIsAvailable(await getManagedUsers(), normalizedRut);

  const secondaryApp = initializeApp(firebaseConfig, `sgo-user-create-${createId()}`);
  const secondaryAuth = getAuth(secondaryApp);
  let createdAuthUser: User | null = null;
  let profileWasSaved = false;

  try {
    const normalizedRole = normalizeUserRole(input.rol);
    const email = input.email.trim().toLowerCase();
    const nombre = input.nombre.trim();
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      input.temporaryPassword,
    );
    const timestamp = nowIso();

    createdAuthUser = credential.user;
    await updateProfile(credential.user, { displayName: nombre });
    await setDoc(
      doc(firestoreDb, 'usuarios', credential.user.uid),
      {
        uid: credential.user.uid,
        nombre,
        email,
        rut: normalizedRut,
        rol: normalizedRole,
        activo: input.activo,
        mustChangePassword: true,
        createdAt: timestamp,
        updatedAt: timestamp,
        created_at: timestamp,
      },
      { merge: true },
    );
    profileWasSaved = true;
  } catch (error) {
    if (createdAuthUser && !profileWasSaved) {
      await deleteUser(createdAuthUser).catch(() => undefined);
    }

    throw new Error(getFirebaseErrorMessage(error));
  } finally {
    await signOut(secondaryAuth).catch(() => undefined);
    await deleteApp(secondaryApp).catch(() => undefined);
  }
}

export async function updateManagedUserRole(
  uid: string,
  nextRole: UserRole,
): Promise<void> {
  const users = await getManagedUsers();
  const target = users.find((user) => user.uid === uid);

  if (!target) {
    throw new Error('Usuario no encontrado.');
  }

  const normalizedRole = normalizeUserRole(nextRole);
  assertKeepsActiveSuperAdmin(users, uid, { rol: normalizedRole });

  await updateDoc(doc(firestoreDb, 'usuarios', uid), {
    rol: normalizedRole,
    updatedAt: nowIso(),
  });
}

export async function updateManagedUserActive(uid: string, activo: boolean): Promise<void> {
  const users = await getManagedUsers();
  const target = users.find((user) => user.uid === uid);

  if (!target) {
    throw new Error('Usuario no encontrado.');
  }

  assertKeepsActiveSuperAdmin(users, uid, { activo });

  await updateDoc(doc(firestoreDb, 'usuarios', uid), {
    activo,
    updatedAt: nowIso(),
  });
}

export async function updateManagedUser(uid: string, input: UpdateManagedUserInput): Promise<void> {
  const normalizedRut = validateUpdateManagedUserInput(input);
  const users = await getManagedUsers();
  const target = users.find((user) => user.uid === uid);

  if (!target) {
    throw new Error('Usuario no encontrado.');
  }

  const normalizedRole = normalizeUserRole(input.rol);
  assertKeepsActiveSuperAdmin(users, uid, {
    rol: normalizedRole,
    activo: input.activo,
  });
  assertRutIsAvailable(users, normalizedRut, uid);

  await updateDoc(doc(firestoreDb, 'usuarios', uid), {
    nombre: input.nombre.trim(),
    rut: normalizedRut,
    rol: normalizedRole,
    activo: input.activo,
    updatedAt: nowIso(),
  });
}

function getCatalogoTable(catalogo: CatalogoKey): CatalogoTable {
  if (catalogo === 'centros_negocio') {
    return centrosNegocioTable as CatalogoTable;
  }

  if (catalogo === 'tipos_documento') {
    return tiposDocumentoTable as CatalogoTable;
  }

  if (catalogo === 'tipos_gasto') {
    return tiposGastoTable as CatalogoTable;
  }

  return tiposRendicionTable as CatalogoTable;
}

function getCatalogoCodigo(item: CatalogoTableItem): string {
  return item.codigo ?? item.id;
}

function getCatalogoCuentaContable(item?: CatalogoTableItem): string | undefined {
  return item && 'cuenta_contable' in item ? item.cuenta_contable : undefined;
}

function buildRemoteCatalogItem(item: CatalogoTableItem, timestamp: string): CatalogoTableItem {
  const remoteItem = {
    id: item.id,
    nombre: item.nombre,
    codigo: getCatalogoCodigo(item),
    activo: item.activo,
    createdAt: item.createdAt ?? timestamp,
    updatedAt: item.updatedAt ?? timestamp,
  };
  const cuentaContable = getCatalogoCuentaContable(item);

  return cuentaContable
    ? {
        ...remoteItem,
        cuenta_contable: cuentaContable,
      } as CatalogoTableItem
    : remoteItem as CatalogoTableItem;
}

function shouldPersistCatalogItem(
  item: CatalogoTableItem,
  remoteData: RemoteCatalogoData | undefined,
): boolean {
  if (!remoteData) {
    return true;
  }

  return (
    remoteData.id !== item.id ||
    remoteData.nombre !== item.nombre ||
    remoteData.codigo !== getCatalogoCodigo(item) ||
    remoteData.activo !== item.activo ||
    !remoteData.createdAt ||
    !remoteData.updatedAt ||
    ('cuenta_contable' in item && remoteData.cuenta_contable !== item.cuenta_contable)
  );
}

async function persistCatalogoToRemoteIfNeeded(catalogo: CatalogoKey): Promise<void> {
  const table = getCatalogoTable(catalogo);
  const [localItems, remoteSnapshot] = await Promise.all([
    table.toArray(),
    getDocs(collection(firestoreDb, catalogo)),
  ]);
  const remoteItems = new Map(
    remoteSnapshot.docs.map((documentSnapshot) => [
      documentSnapshot.id,
      documentSnapshot.data() as RemoteCatalogoData,
    ]),
  );
  const itemsToPersist = localItems.filter((item) =>
    shouldPersistCatalogItem(item, remoteItems.get(item.id)),
  );

  if (itemsToPersist.length === 0) {
    return;
  }

  const batch = writeBatch(firestoreDb);
  const timestamp = nowIso();

  itemsToPersist.forEach((item) => {
    batch.set(
      doc(firestoreDb, catalogo, item.id),
      buildRemoteCatalogItem(item, timestamp),
      { merge: true },
    );
  });

  await batch.commit();
}

async function persistManagedCatalogsToRemoteIfNeeded(): Promise<void> {
  if (!navigator.onLine) {
    return;
  }

  if (!catalogPersistencePromise) {
    catalogPersistencePromise = Promise.all(
      CATALOG_KEYS.map((catalogo) => persistCatalogoToRemoteIfNeeded(catalogo)),
    ).then(() => undefined)
      .finally(() => {
        catalogPersistencePromise = null;
      });
  }

  await catalogPersistencePromise;
}

function normalizeManagedCatalogItem(item: CatalogoTableItem): ManagedCatalogItem {
  return {
    id: item.id,
    nombre: item.nombre,
    codigo: getCatalogoCodigo(item),
    activo: item.activo,
    cuenta_contable: getCatalogoCuentaContable(item),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function validateCatalogInput(input: ManagedCatalogInput): void {
  if (!input.nombre.trim()) {
    throw new Error('Ingresa el nombre visible.');
  }

  if (!input.codigo.trim()) {
    throw new Error('Ingresa el codigo interno.');
  }
}

function buildCatalogItem(
  catalogo: CatalogoKey,
  id: string,
  input: ManagedCatalogInput,
  current?: CatalogoTableItem,
): CatalogoTableItem {
  const timestamp = nowIso();
  const base: CatalogoBase = {
    id,
    nombre: input.nombre.trim(),
    codigo: input.codigo.trim(),
    activo: input.activo,
    createdAt: current?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  const cuentaContable =
    input.cuenta_contable?.trim() || getCatalogoCuentaContable(current) || base.codigo;

  if (catalogo === 'centros_negocio') {
    return {
      ...base,
      codigo: base.codigo ?? id,
    } as CentroNegocio;
  }

  if (catalogo === 'tipos_documento') {
    return {
      ...base,
      codigo: base.codigo ?? id,
      cuenta_contable: cuentaContable,
    } as TipoDocumento;
  }

  if (catalogo === 'tipos_gasto') {
    return {
      ...base,
      cuenta_contable: cuentaContable,
    } as TipoGasto;
  }

  return {
    ...base,
    cuenta_contable: cuentaContable,
  } as TipoRendicion;
}

async function getCatalogItem(catalogo: CatalogoKey, itemId: string) {
  return getCatalogoTable(catalogo).get(itemId);
}

export async function getManagedCatalogItems(
  catalogo: CatalogoKey,
): Promise<ManagedCatalogItem[]> {
  await refreshCatalogosFromRemote({ includeInactive: true }).catch(() => undefined);
  await seedCatalogosIfNeeded();
  await persistManagedCatalogsToRemoteIfNeeded();

  const table = getCatalogoTable(catalogo);
  const items = await table.toArray();

  return items
    .map(normalizeManagedCatalogItem)
    .sort((first, second) => first.nombre.localeCompare(second.nombre, 'es'));
}

export async function saveManagedCatalogItem(
  catalogo: CatalogoKey,
  input: ManagedCatalogInput,
  itemId?: string,
): Promise<void> {
  if (!navigator.onLine) {
    throw new Error('Debes estar online para administrar catalogos.');
  }

  validateCatalogInput(input);

  const table = getCatalogoTable(catalogo);
  const id = itemId ?? createId();
  const current = itemId ? await getCatalogItem(catalogo, itemId) : undefined;
  const item = buildCatalogItem(catalogo, id, input, current);

  await setDoc(doc(firestoreDb, catalogo, id), item, { merge: true });
  await table.put(item);
}

export async function updateManagedCatalogItemActive(
  catalogo: CatalogoKey,
  itemId: string,
  activo: boolean,
): Promise<void> {
  if (!navigator.onLine) {
    throw new Error('Debes estar online para administrar catalogos.');
  }

  const table = getCatalogoTable(catalogo);
  const current = await table.get(itemId);

  if (!current) {
    const remoteSnapshot = await getDoc(doc(firestoreDb, catalogo, itemId));

    if (!remoteSnapshot.exists()) {
      throw new Error('Item de catalogo no encontrado.');
    }
  }

  const timestamp = nowIso();
  await updateDoc(doc(firestoreDb, catalogo, itemId), {
    activo,
    updatedAt: timestamp,
  });

  if (current) {
    await table.update(itemId, {
      activo,
      updatedAt: timestamp,
    });
  }
}
