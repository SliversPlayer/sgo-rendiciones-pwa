import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  type User,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { firebaseAuth, firestoreDb } from '../services/firebase/firebase';
import type { UserProfile } from '../types/user';
import { nowIso } from '../utils/date';
import { normalizeUserRole } from '../utils/roles';

interface AuthContextValue {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changeTemporaryPassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getDefaultName(email: string): string {
  return email.split('@')[0] || email;
}

function isFirestoreTrue(value: unknown): boolean {
  return value === true || (typeof value === 'string' && value.trim().toLowerCase() === 'true');
}

function buildLocalProfile(user: User): UserProfile {
  const email = user.email ?? '';
  const timestamp = nowIso();

  return {
    uid: user.uid,
    email,
    nombre: getDefaultName(email),
    rol: 'USER',
    activo: true,
    mustChangePassword: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    created_at: timestamp,
  };
}

function normalizeUserProfile(user: User, data: Partial<UserProfile>): UserProfile {
  const fallback = buildLocalProfile(user);
  const createdAt = data.createdAt ?? data.created_at ?? fallback.createdAt;

  return {
    uid: data.uid ?? user.uid,
    email: data.email ?? user.email ?? fallback.email,
    nombre: data.nombre?.trim() || fallback.nombre,
    rol: normalizeUserRole(data.rol),
    activo: data.activo !== false,
    mustChangePassword: isFirestoreTrue(data.mustChangePassword),
    passwordChangedAt: data.passwordChangedAt,
    createdAt,
    updatedAt: data.updatedAt ?? createdAt,
    created_at: data.created_at ?? createdAt,
  };
}

async function getUserProfile(user: User): Promise<UserProfile> {
  const userRef = doc(firestoreDb, 'usuarios', user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    throw new Error('No existe perfil de usuario asociado. Contacte al administrador.');
  }

  return normalizeUserProfile(user, snapshot.data() as Partial<UserProfile>);
}

function getAuthMessage(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';

  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return 'Email o password incorrectos.';
  }

  if (code === 'auth/user-not-found') {
    return 'No existe un usuario con ese email.';
  }

  if (code === 'auth/too-many-requests') {
    return 'Demasiados intentos. Espera unos minutos e intenta nuevamente.';
  }

  if (code === 'auth/network-request-failed') {
    return 'No se pudo conectar con Firebase. Revisa tu conexion.';
  }

  return 'No se pudo iniciar sesion. Intenta nuevamente.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const clearProfileSubscription = () => {
      unsubscribeProfile?.();
      unsubscribeProfile = null;
    };

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      clearProfileSubscription();
      setLoading(true);

      if (!user) {
        setCurrentUser(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      setAuthError(null);

      try {
        const userRef = doc(firestoreDb, 'usuarios', user.uid);
        const profile = await getUserProfile(user);

        if (profile.activo === false) {
          setAuthError('Su cuenta esta desactivada. Contacte al administrador.');
          setCurrentUser(null);
          setUserProfile(null);
          await signOut(firebaseAuth);
          return;
        }

        setCurrentUser(user);
        setUserProfile(profile);
        unsubscribeProfile = onSnapshot(
          userRef,
          (snapshot) => {
            if (!snapshot.exists()) {
              setAuthError('No existe perfil de usuario asociado. Contacte al administrador.');
              setCurrentUser(null);
              setUserProfile(null);
              clearProfileSubscription();
              void signOut(firebaseAuth);
              return;
            }

            const nextProfile = normalizeUserProfile(
              user,
              snapshot.data() as Partial<UserProfile>,
            );

            if (nextProfile.activo === false) {
              setAuthError('Su cuenta esta desactivada. Contacte al administrador.');
              setCurrentUser(null);
              setUserProfile(null);
              clearProfileSubscription();
              void signOut(firebaseAuth);
              return;
            }

            setAuthError(null);
            setCurrentUser(user);
            setUserProfile(nextProfile);
          },
          () => {
            if (!navigator.onLine) {
              return;
            }

            setAuthError('No se pudo cargar tu perfil de usuario.');
            setCurrentUser(null);
            setUserProfile(null);
            clearProfileSubscription();
            void signOut(firebaseAuth);
          },
        );
      } catch (error) {
        if (!navigator.onLine) {
          setCurrentUser(null);
          setUserProfile(null);
          setAuthError('No se pudo cargar tu perfil de usuario.');
          await signOut(firebaseAuth);
          return;
        }

        setCurrentUser(null);
        setUserProfile(null);
        setAuthError(error instanceof Error ? error.message : 'No se pudo cargar tu perfil de usuario.');
        await signOut(firebaseAuth);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      clearProfileSubscription();
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setAuthError(null);
      await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
    } catch (error) {
      const message = getAuthMessage(error);
      setAuthError(message);
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthError(null);
    await signOut(firebaseAuth);
    setCurrentUser(null);
    setUserProfile(null);
  }, []);

  const changeTemporaryPassword = useCallback(
    async (newPassword: string) => {
      if (!currentUser) {
        throw new Error('Debes iniciar sesion para cambiar tu password.');
      }

      if (newPassword.length < 8) {
        throw new Error('El nuevo password debe tener al menos 8 caracteres.');
      }

      try {
        setAuthError(null);
        await updatePassword(currentUser, newPassword);

        const timestamp = nowIso();
        await updateDoc(doc(firestoreDb, 'usuarios', currentUser.uid), {
          mustChangePassword: false,
          passwordChangedAt: timestamp,
          updatedAt: timestamp,
        });

        setUserProfile((currentProfile) =>
          currentProfile
            ? {
                ...currentProfile,
                mustChangePassword: false,
                passwordChangedAt: timestamp,
                updatedAt: timestamp,
              }
            : currentProfile,
        );
      } catch (error) {
        const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';

        if (code === 'auth/requires-recent-login') {
          throw new Error('Vuelve a iniciar sesion con tu password temporal e intenta nuevamente.');
        }

        if (code === 'auth/weak-password') {
          throw new Error('El nuevo password debe tener al menos 8 caracteres.');
        }

        throw new Error('No se pudo cambiar el password. Intenta nuevamente.');
      }
    },
    [currentUser],
  );

  const value = useMemo(
    () => ({
      currentUser,
      userProfile,
      loading,
      authError,
      login,
      logout,
      changeTemporaryPassword,
    }),
    [authError, changeTemporaryPassword, currentUser, loading, login, logout, userProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.');
  }

  return context;
}
