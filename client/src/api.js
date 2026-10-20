import axios from "axios";
import Cookies from "js-cookie";
import { render } from "./host";

const api = axios.create({ baseURL: render });

// attach the JWT to every request
api.interceptors.request.use((config) => {
  const token = Cookies.get("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// if the token expired, clear it and go to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const hadToken = !!Cookies.get("token");
    const isLoginCall = err.config?.url?.includes("/login");
    if (err.response?.status === 401 && hadToken && !isLoginCall) {
      Cookies.remove("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;