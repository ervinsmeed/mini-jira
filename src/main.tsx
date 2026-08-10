import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

// 1. Создаем клиент Convex (он будет слушать изменения в базе через WebSocket)
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key. Проверь файл .env.local!");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* 2. Сначала оборачиваем в Clerk, чтобы приложение знало пользователя */}
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      {/* 3. Внутрь передаем клиент Convex и хук useAuth от Clerk */}
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <App />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </StrictMode>,
);
