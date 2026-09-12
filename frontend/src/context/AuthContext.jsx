import { useState, useEffect } from "react";
import { AuthContext } from "./authContextDefinition";
import { authApi } from "../services/api";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  // Check token on initial load
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem("token");
      if (savedToken) {
        try {
          const res = await authApi.getMe();
          if (res.success && res.user) {
            setUser(res.user);
          } else {
            localStorage.removeItem("token");
            setToken(null);
            setUser(null);
          }
        } catch {
          localStorage.removeItem("token");
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    if (res.success && res.token) {
      localStorage.setItem("token", res.token);
      setToken(res.token);
      setUser(res.user);
      return res;
    }
    throw new Error(res.message || "Failed to login");
  };

  const register = async (name, email, password, confirmPassword) => {
    const res = await authApi.register({ name, email, password, confirmPassword });
    return res;
  };

  const verifyOtp = async (email, otp) => {
    const res = await authApi.verifyOtp({ email, otp });
    if (res.success && res.token) {
      localStorage.setItem("token", res.token);
      setToken(res.token);
      setUser(res.user);
      return res;
    }
    throw new Error(res.message || "Failed to verify code");
  };

  const setInitialBalance = async (initialBalance) => {
    const res = await authApi.setInitialBalance(initialBalance);
    if (res.success && res.user) {
      setUser((prev) => ({
        ...prev,
        ...res.user,
        hasCompletedBalanceSetup: true,
        currentBankBalance: res.user.currentBankBalance,
        initialBankBalance: res.user.initialBankBalance,
      }));
      return res.user;
    }
    throw new Error(res.message || "Failed to save initial balance");
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const updateSalary = async (newSalary) => {
    const res = await authApi.updateSalary(newSalary);
    if (res.success && res.user) {
      setUser(res.user);
      return res.user;
    }
    throw new Error(res.message || "Failed to update salary");
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        verifyOtp,
        setInitialBalance,
        logout,
        updateSalary,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
