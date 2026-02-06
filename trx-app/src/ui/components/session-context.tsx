"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface Session {
  wallet_address: string;
  did: string;
  role: "SHIPPER" | "CARRIER";
  company_name?: string;
  city?: string;
  country?: string;
  load_id_standard?: string | null;
}

interface SessionContextType {
  session: Session | null;
  setSession: (s: Session | null) => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextType>({
  session: null,
  setSession: () => {},
  clearSession: () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = sessionStorage.getItem("trx_session");
    return stored ? JSON.parse(stored) : null;
  });

  const setSession = useCallback((s: Session | null) => {
    setSessionState(s);
    if (s) {
      sessionStorage.setItem("trx_session", JSON.stringify(s));
    } else {
      sessionStorage.removeItem("trx_session");
    }
  }, []);

  const clearSession = useCallback(() => {
    setSessionState(null);
    sessionStorage.removeItem("trx_session");
  }, []);

  return (
    <SessionContext.Provider value={{ session, setSession, clearSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
