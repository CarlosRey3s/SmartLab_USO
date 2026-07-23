import type { Configuration } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: "9df8da80-7254-4065-9cc7-81e6aa8859ae",
    authority: "https://login.microsoftonline.com/058cc003-e5de-4ecb-a024-99bd0d50bbdd",
    redirectUri: "http://localhost:5173/login", 
  },
  cache: {
    cacheLocation: "sessionStorage"
  }
};

export const loginRequest = {
  scopes: ["User.Read", "profile", "email"]
};
