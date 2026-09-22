import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogTitle } from "../Dialog";
import { Button } from "./Button";
import styles from "./Modal.module.scss";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  actions?: ReactNode;
  size?: "md" | "lg";
  children: ReactNode;
};

export function Modal({
  open,
  onClose,
  title,
  actions,
  size = "md",
  children,
}: ModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={`${styles.content} ${styles[size]}`}
      >
        <div className={styles.header}>
          <DialogTitle className={styles.title}>{title}</DialogTitle>
          <div className={styles.actions}>
            {actions}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label={t("taskModal.close")}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}
