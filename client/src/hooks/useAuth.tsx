import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest, setAuthToken } from "@/lib/queryClient";

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "owner" | "mechanic" | "client";
  phone?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setLoading(false); }, []);

  const login = async (email: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { email, password });
    const data = await res.json();
    setAuthToken(data.token);
    const u = { id: data.id, name: data.name, email: data.email, role: data.role, phone: data.phone };
    setUser(u);
  };

  const register = async (body: any): Promise<any> => {
    const res = await apiRequest("POST", "/api/auth/register", body);
    const data = await res.json();
    if (data.pendingApproval) return data; // konto czeka na zatwierdzenie
    setAuthToken(data.token);
    const u = { id: data.id, name: data.name, email: data.email, role: data.role, phone: data.phone };
    setUser(u);
    return data;
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
