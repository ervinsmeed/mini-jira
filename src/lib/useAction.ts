import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { actionError } from "./actionError";

export function useAction() {
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const { t } = useTranslation();
  const run = async (action: () => Promise<unknown>) => {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    try {
      await action();
    } catch (error) {
      toast.error(actionError(error, t));
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  return { pending, run };
}
