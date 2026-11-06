import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

/** Online status, Android install prompt, iOS hint flag, and SW update ("Update available – Reload"). */
export function usePwa() {
  const [online, setOnline] = useState(navigator.onLine);
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    const bip = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallPromptEvent);
    };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("beforeinstallprompt", bip);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("beforeinstallprompt", bip);
    };
  }, []);

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true;

  return {
    online,
    canInstall: !!installEvent,
    install: async () => {
      await installEvent?.prompt();
      setInstallEvent(null);
    },
    showIosHint: isIos && !standalone,
    needRefresh,
    reloadForUpdate: () => updateServiceWorker(true),
  };
}
