import axios from "axios";
import { notify } from "./notify";
import { normalizeApiError } from "./apiError";

export const api = axios.create({
  baseURL: "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isSessionExpiredNotified = false;
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized / Token Expiry
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refreshToken");

      if (refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;

          try {
            const res = await axios.post("/api/v1/auth/refresh", { refreshToken });
            const newToken = res.data?.token || res.data?.data?.token;

            if (newToken) {
              localStorage.setItem("accessToken", newToken);
              if (res.data?.refreshToken || res.data?.data?.refreshToken) {
                localStorage.setItem(
                  "refreshToken",
                  res.data?.refreshToken || res.data?.data?.refreshToken
                );
              }
              isRefreshing = false;
              onRefreshed(newToken);
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return api(originalRequest);
            }
          } catch (refreshErr) {
            isRefreshing = false;
            refreshSubscribers = [];

            if (!isSessionExpiredNotified) {
              isSessionExpiredNotified = true;
              localStorage.removeItem("accessToken");
              localStorage.removeItem("refreshToken");
              localStorage.removeItem("user");

              notify.error("Session Expired", "Your session has expired. Please sign in again.");

              setTimeout(() => {
                if (window.location.pathname !== "/login") {
                  window.location.href = "/login";
                }
                isSessionExpiredNotified = false;
              }, 1200);
            }
            return Promise.reject(normalizeApiError(refreshErr));
          }
        } else {
          // If a refresh is already in flight, queue this request
          return new Promise((resolve) => {
            subscribeTokenRefresh((token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            });
          });
        }
      } else {
        // No refresh token present
        if (!isSessionExpiredNotified && window.location.pathname !== "/login") {
          isSessionExpiredNotified = true;
          localStorage.removeItem("accessToken");
          localStorage.removeItem("user");

          notify.error("Session Expired", "Your session has expired. Please sign in again.");

          setTimeout(() => {
            if (window.location.pathname !== "/login") {
              window.location.href = "/login";
            }
            isSessionExpiredNotified = false;
          }, 1200);
        }
      }
    }

    return Promise.reject(error);
  }
);

