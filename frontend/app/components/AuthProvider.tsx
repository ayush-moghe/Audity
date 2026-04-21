"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { validatePassword, validateUsername } from "@/lib/auth/validation";

type SignUpInput = {
  email: string;
  password: string;
  username: string;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function ensureUsersTableRow(
  supabase: ReturnType<typeof getSupabaseBrowserClient>,
  username: string,
  password: string,
): Promise<void> {
  const normalizedUsername = username.trim();

  const { data: existingUser, error: selectError } = await supabase
    .from("Users")
    .select("id")
    .eq("username", normalizedUsername)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Could not read users table: ${selectError.message}`);
  }

  if (existingUser) {
    return;
  }

  const passwordHash = await hashPassword(password);
  const { error: insertUserError } = await supabase.from("Users").insert({
    username: normalizedUsername,
    password: passwordHash,
  });

  if (insertUserError) {
    throw new Error(`Could not create users table row: ${insertUserError.message}`);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabaseBrowserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }
      setSession(data.session);
      setLoading(false);
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      signIn: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          throw new Error(error.message);
        }

        const usernameFromMetadata = data.user.user_metadata?.username;
        if (typeof usernameFromMetadata === "string" && usernameFromMetadata.trim()) {
          await ensureUsersTableRow(supabase, usernameFromMetadata, password);
        }
      },
      signUp: async ({ email, password, username }) => {
        const usernameValidation = validateUsername(username);
        if (!usernameValidation.valid) {
          throw new Error(usernameValidation.message);
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
          throw new Error(passwordValidation.message);
        }

        const normalizedUsername = username.trim();

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: normalizedUsername },
          },
        });
        if (error) {
          throw new Error(error.message);
        }
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
          throw new Error(error.message);
        }
      },
    }),
    [loading, session, supabase],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
