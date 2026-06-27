import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  nombres: string;
  apellidos: string;
  rol: 'admin' | 'estudiante' | 'docente';
  correo: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Recuperar sesión persistente
    const savedUser = localStorage.getItem('uso_user');
    const savedToken = localStorage.getItem('uso_token');

    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
    setLoading(false);
  }, []);

  const login = (userData: User, newToken: string) => {
    setUser(userData);
    setToken(newToken);
    localStorage.setItem('uso_user', JSON.stringify(userData));
    localStorage.setItem('uso_token', newToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('uso_user');
    localStorage.removeItem('uso_token');
  };

  if (loading) {
    return <div>Cargando...</div>; // O un spinner elegante
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
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
