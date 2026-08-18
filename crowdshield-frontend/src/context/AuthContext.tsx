import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
interface UserPayload {
  sub: string;
  role: 'ADMIN' | 'CITIZEN' | 'VOLUNTEER';
  exp: number;
}
interface AuthContextType {
  isAuthenticated: boolean;
  role: 'ADMIN' | 'CITIZEN' | 'VOLUNTEER' | null;
  userId: string | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [role, setRole] = useState<'ADMIN' | 'CITIZEN' | 'VOLUNTEER' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, []);
  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode<UserPayload>(token);
        if (decoded.exp * 1000 < Date.now()) {
          logout();
        } else {
          setRole(decoded.role);
          setUserId(decoded.sub);
          setIsAuthenticated(true);
        }
      } catch (err) {
        logout();
      }
    } else {
      setIsAuthenticated(false);
      setRole(null);
      setUserId(null);
    }
  }, [token]);
  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };
  return (
    <AuthContext.Provider value={{ isAuthenticated, role, userId, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
