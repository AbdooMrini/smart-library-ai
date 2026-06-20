const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export const backendOrigin = apiBase.replace(/\/api\/?$/, "");
export const assetUrl = (path) => path ? (path.startsWith("http") ? path : `${backendOrigin}${path}`) : null;
