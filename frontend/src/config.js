const explicitBackendUrl = import.meta.env.VITE_BACKEND_URL?.trim();

export const BACKEND_URL =
  explicitBackendUrl ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081');
