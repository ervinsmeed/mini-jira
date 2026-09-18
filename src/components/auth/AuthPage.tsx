import { useTranslation } from "react-i18next";
import { SignIn } from "@clerk/clerk-react";

export default function AuthPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-foreground">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-3 mb-6">
          <div className="flex items-center justify-center size-12 bg-primary rounded text-primary-foreground font-bold text-lg">
            !!!
          </div>
          <h1 className="text-3xl font-bold text-foreground">Kanban</h1>
        </div>
        <h2 className="text-3xl font-semibold text-foreground mb-2">
          {t("auth.welcome")}
        </h2>
        <p className="text-muted-foreground">
          {t("auth.description")}
        </p>
      </div>
      <div className="p-4 border border-border rounded-xl">
        <SignIn />
      </div>
    </div>
  );
}
