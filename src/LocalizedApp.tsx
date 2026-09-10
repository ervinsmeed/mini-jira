import { ruRU, enUS } from "@clerk/localizations";
import { useTranslation } from "react-i18next";

import App from "./App.tsx";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import "./i18n";
// 1. Создаем клиент Convex (он будет слушать изменения в базе через WebSocket)
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key. Проверь файл .env.local!");
}

export default function LocalizedApp() {
  const { i18n } = useTranslation();
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      localization={i18n.resolvedLanguage?.startsWith("ru") ? ruRU : enUS}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <App />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
