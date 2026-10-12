// Point this at your running backend. On a device, use your machine IP instead of localhost.
export const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000",
};
