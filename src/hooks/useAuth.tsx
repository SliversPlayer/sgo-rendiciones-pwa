import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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

interface AuthContextValue {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getDefaultName(email: string): string {
  return email.split('@')[0] || email;
}

function buildLocalProfile(user: User): UserProfile {
  const email = user.email ?? '';

  return {
    uid: user.uid,
    email,
    nombre: getDefaultName(email),
    rol: 'USER',
    activo: true,
    created_at: new Date().toISOString(),
  };
}

async function getOrCreateUserProfile(user: User): Promise<UserProfile> {
  const userRef = doc(firestoreDb, 'usuarios', user.uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    return snapshot.data() as UserProfile;
  }

  const profile = buildLocalProfile(user);
  await setDoc(userRef, profile);
  return profile;
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
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      setLoading(true);

      if (!user) {
        setCurrentUser(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      setAuthError(null);

      try {
        const profile = await getOrCreateUserProfile(user);

        if (profile.activo === false) {
          setAuthError('Tu usuario esta desactivado. Contacta al administrador.');
          setCurrentUser(null);
          setUserProfile(null);
          await signOut(firebaseAuth);
          return;
        }

        setCurrentUser(user);
        setUserProfile(profile);
      } catch (error) {
        if (!navigator.onLine) {
          setCurrentUser(user);
          setUserProfile(buildLocalProfile(user));
          setAuthError(null);
          return;
        }

        setCurrentUser(null);
        setUserProfile(null);
        setAuthError('No se pudo cargar tu perfil de usuario.');
        await signOut(firebaseAuth);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
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
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      userProfile,
      loading,
      authError,
      login,
      logout,
    }),
    [authError, currentUser, loading, login, logout, userProfile],
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
