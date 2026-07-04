import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  company_id: string | null;
  avatar_url: string | null;
  phone: string | null;
  department: string | null;
  is_active: boolean;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: string[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    companyName?: string,
    invitationToken?: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const inactiveSignOutOnce = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);
  const profileLoadIdRef = useRef(0);

  const fetchProfile = useCallback(async (userId: string) => {
    const [{ data: prof, error: profErr }, { data: userRoles, error: rolesErr }] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
    if (profErr) console.error("[Auth] Failed to load profile:", profErr);
    if (rolesErr) console.error("[Auth] Failed to load roles:", rolesErr);

    const nextProfile = (prof as Profile) || null;
    const nextRoles = (userRoles || []).map((r: any) => r.role) as string[];

    setProfile(nextProfile);
    setRoles(nextRoles);

    // Enforce deactivation at the auth layer (not only UI).
    if (nextProfile && nextProfile.is_active === false && !inactiveSignOutOnce.current) {
      inactiveSignOutOnce.current = true;
      await supabase.auth.signOut();
      currentUserIdRef.current = null;
      profileLoadIdRef.current += 1;
      setUser(null);
      setSession(null);
      setProfile(null);
      setRoles([]);
    }
  }, []);

  const loadProfile = useCallback(
    async (userId: string, options: { blockUi?: boolean } = {}) => {
      const loadId = ++profileLoadIdRef.current;

      if (options.blockUi) {
        setLoading(true);
      }

      try {
        await fetchProfile(userId);
      } finally {
        if (options.blockUi && profileLoadIdRef.current === loadId) {
          setLoading(false);
        }
      }
    },
    [fetchProfile],
  );

  const clearAuthState = useCallback(() => {
    currentUserIdRef.current = null;
    profileLoadIdRef.current += 1;
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    inactiveSignOutOnce.current = false;
    setLoading(false);
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const nextUser = session?.user ?? null;
      const previousUserId = currentUserIdRef.current;
      const isSameUser = Boolean(nextUser?.id && previousUserId === nextUser.id);
      const isTokenRefresh = event === "TOKEN_REFRESHED";

      setSession(session);
      setUser(nextUser);

      if (nextUser) {
        currentUserIdRef.current = nextUser.id;

        // Use setTimeout to avoid Supabase deadlock on initial auth,
        // but do not remount the whole CRM on token refresh events.
        setTimeout(() => {
          void loadProfile(nextUser.id, { blockUi: !isTokenRefresh && !isSameUser });
        }, 0);

        return;
      }

      clearAuthState();
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        currentUserIdRef.current = session.user.id;
        await loadProfile(session.user.id, { blockUi: true });
      } else {
        clearAuthState();
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [clearAuthState, loadProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    companyName?: string,
    invitationToken?: string,
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company_name: companyName || "My Company",
          invitation_token: invitationToken || undefined,
        },
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clearAuthState();
  };

  const hasRole = (role: string) => roles.includes(role);
  const hasAnyRole = (r: string[]) => r.some((role) => roles.includes(role));

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        loading,
        signIn,
        signUp,
        signOut,
        hasRole,
        hasAnyRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}