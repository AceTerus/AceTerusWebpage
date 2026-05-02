import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  isNewUser: boolean;
  setIsNewUser: React.Dispatch<React.SetStateAction<boolean>>;
  aceCoins: number;
  setAceCoins: React.Dispatch<React.SetStateAction<number>>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Cookie shared across all *.aceterus.com subdomains to signal a global sign-out.
// We don't clear it immediately so all subdomains get a chance to read it; it expires in 5 min.
const SIGNOUT_COOKIE = 'ace_signout';
const COOKIE_DOMAIN = '.aceterus.com';

function setSignOutCookie() {
  document.cookie = `${SIGNOUT_COOKIE}=1; domain=${COOKIE_DOMAIN}; path=/; max-age=300; SameSite=Lax; Secure`;
}

function clearSignOutCookie() {
  document.cookie = `${SIGNOUT_COOKIE}=; domain=${COOKIE_DOMAIN}; path=/; max-age=0; SameSite=Lax; Secure`;
}

function hasSignOutCookie() {
  return document.cookie.split(';').some(c => c.trim().startsWith(`${SIGNOUT_COOKIE}=1`));
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [aceCoins, setAceCoins] = useState<number>(0);

  useEffect(() => {
    const syncProfile = async (userId: string | undefined) => {
      if (!userId) { setIsAdmin(false); setAceCoins(0); return; }

      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin, ace_coins, username")
        .eq("user_id", userId)
        .single();

      if (error && error.code === 'PGRST116') {
        try {
          await (supabase as any).from('profiles').insert([{ user_id: userId, ace_coins: 1000 }]);
          setIsAdmin(false);
          setAceCoins(1000);
          setIsNewUser(true);
        } catch (e) {
          console.error("Failed to create default profile:", e);
        }
        return;
      }

      setIsAdmin((data as any)?.is_admin ?? false);
      setIsNewUser(!(data as any)?.username);

      let coins = (data as any)?.ace_coins ?? 0;
      if (coins < 1000) {
        try {
          await (supabase as any).from('profiles').update({ ace_coins: 1000 }).eq('user_id', userId);
          coins = 1000;
        } catch (e) {
          console.error("Failed to airdrop default coins:", e);
        }
      }
      setAceCoins(coins);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // A new sign-in cancels any pending global sign-out
        if (session) clearSignOutCookie();
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        syncProfile(session?.user?.id);
      }
    );

    // Check for a global sign-out signal; only act if this subdomain still has an active session.
    const checkAndSignOut = async () => {
      if (!hasSignOutCookie()) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.signOut();
        setIsAdmin(false);
      }
    };

    window.addEventListener('focus', checkAndSignOut);
    const pollInterval = setInterval(checkAndSignOut, 5000);

    const init = async () => {
      // Act on a pending global sign-out before anything else
      if (hasSignOutCookie()) {
        await checkAndSignOut();
        setIsLoading(false);
        return;
      }

      // Restore session from URL hash (cross-subdomain SSO)
      const hashStr = window.location.hash.slice(1);
      if (hashStr) {
        const params = new URLSearchParams(hashStr);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          return; // onAuthStateChange fires and handles the rest
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      syncProfile(session?.user?.id);
    };

    init();

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('focus', checkAndSignOut);
      clearInterval(pollInterval);
    };
  }, []);

  const signOut = async () => {
    setSignOutCookie(); // broadcast sign-out to all other subdomains
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      return;
    }
    setIsAdmin(false);
  };

  const value = {
    user,
    session,
    isLoading,
    isAdmin,
    isNewUser,
    setIsNewUser,
    aceCoins,
    setAceCoins,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
