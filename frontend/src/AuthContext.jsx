import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import api from "./api";
import { connectSocket, disconnectSocket } from "./socket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);

  const startSession = useCallback((token, u) => {
    localStorage.setItem("cps_token", token);
    setUser(u);
    setSocket(connectSocket(token));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("cps_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then(({ data }) => startSession(token, data.user))
      .catch(() => localStorage.removeItem("cps_token"))
      .finally(() => setLoading(false));
  }, [startSession]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    startSession(data.token, data.user);
  };

  const register = async (form) => {
    const { data } = await api.post("/auth/register", form);
    startSession(data.token, data.user);
  };

  const logout = () => {
    localStorage.removeItem("cps_token");
    disconnectSocket();
    setSocket(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, socket, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// Subscribe to a live event for as long as the component is mounted
export function useSocketEvent(event, handler) {
  const { socket } = useAuth();
  const saved = useRef(handler);
  saved.current = handler;
  useEffect(() => {
    if (!socket) return undefined;
    const fn = (...args) => saved.current(...args);
    socket.on(event, fn);
    return () => socket.off(event, fn);
  }, [socket, event]);
}
