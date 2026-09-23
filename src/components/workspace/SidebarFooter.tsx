import { SignOutButton } from "@clerk/clerk-react";
import { EyeOff, LogOut, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUiStore } from "../../store/uiStore";

export default function SidebarFooter() {
  const { t, i18n } = useTranslation();
  const theme = useUiStore((state) => state.theme);
  const onThemeToggle = useUiStore((state) => state.toggleTheme);
  const onToggleCollapsed = useUiStore((state) => state.toggleSidebar);

  const languageButtonClass = (language: string) =>
    `px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
      i18n.resolvedLanguage?.startsWith(language)
        ? "bg-sidebar-accent text-sidebar-accent-foreground"
        : "bg-sidebar hover:bg-sidebar-hover"
    }`;

  return (
    <>
      <div className="flex items-center justify-center space-x-2 rounded-lg p-2 transition-colors bg-sidebar-hover">
        <Sun className="size-4 text-sidebar-foreground" />
        <button
          onClick={onThemeToggle}
          role="switch"
          aria-checked={theme === "dark"}
          aria-label={t(theme === "dark" ? "sidebar.light" : "sidebar.dark")}
          title={t(theme === "dark" ? "sidebar.light" : "sidebar.dark")}
          className="relative w-12 h-6 bg-sidebar-primary rounded-full transition-colors"
        >
          <div
            className={`absolute size-5 bg-sidebar-primary-foreground rounded-full top-0.5 transition-transform ${
              theme === "dark"
                ? "transform translate-x-6"
                : "transform translate-x-0.5"
            }`}
          />
        </button>
        <Moon className="size-4 text-sidebar-foreground" />
      </div>

      <div className="flex items-center justify-center gap-2 px-2 py-2 text-sidebar-foreground">
        <button
          onClick={() => i18n.changeLanguage("en")}
          className={languageButtonClass("en")}
        >
          English
        </button>
        <button
          onClick={() => i18n.changeLanguage("ru")}
          className={languageButtonClass("ru")}
        >
          Русский
        </button>
      </div>

      <button
        onClick={onToggleCollapsed}
        className="flex items-center space-x-3 px-2 py-1 transition-colors text-sidebar-foreground hover:text-sidebar-accent-foreground"
      >
        <EyeOff className="size-4" />
        <span className="text-sm font-medium">{t("hideSidebar")}</span>
      </button>

      <SignOutButton>
        <button
          type="button"
          className="flex items-center space-x-3 px-3 py-2 rounded-md transition-colors bg-sidebar text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-4" />
          <span className="text-sm font-medium">{t("logout")}</span>
        </button>
      </SignOutButton>
    </>
  );
}
