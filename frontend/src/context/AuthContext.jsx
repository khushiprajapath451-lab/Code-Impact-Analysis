import { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, fetchCurrentUser } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('impactiq_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('impactiq_token');
      if (!token) return;

      try {
        const data = await fetchCurrentUser();
        if (data?.user) {
          setUser(data.user);
          localStorage.setItem('impactiq_user', JSON.stringify(data.user));
        }
      } catch (err) {
        console.warn('Session restore failed:', err.message);
        localStorage.removeItem('impactiq_user');
        localStorage.removeItem('impactiq_token');
        setUser(null);
      }
    };

    restoreSession();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const data = await loginUser(email, password);
      setUser(data.user);
      localStorage.setItem('impactiq_user', JSON.stringify(data.user));
      localStorage.setItem('impactiq_token', data.token);
      return data.user;
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, role) => {
    setLoading(true);
    setAuthError(null);
    try {
      const data = await registerUser(name, email, password, role);
      setUser(data.user);
      localStorage.setItem('impactiq_user', JSON.stringify(data.user));
      localStorage.setItem('impactiq_token', data.token);
      return data.user;
    } catch (err) {
      setAuthError(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('impactiq_user');
    localStorage.removeItem('impactiq_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        authError,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
