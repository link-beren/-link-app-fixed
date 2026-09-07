import { useState } from 'react';

const DISMISS_KEY = 'install-prompt-dismissed';

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// iOS Safari has no beforeinstallprompt event, so this shows manual
// "Share -> Add to Home Screen" instructions instead (spec section 3.1).
export function InstallPrompt() {
  const [visible, setVisible] = useState(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY) === '1';
    return isIos() && !isStandalone() && !dismissed;
  });

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  return (
    <div className="safe-x mx-4 mb-2 flex items-start gap-3 rounded-xl border border-teal-500/40 bg-teal-500/10 p-3 text-sm">
      <p className="flex-1">
        להתקנה על מסך הבית: הקישו על כפתור השיתוף ⬆️ בסרגל הכתובת של Safari, ואז „הוספה למסך הבית”.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="סגירת הודעת התקנה"
        className="min-h-11 min-w-11 shrink-0 text-slate-500 dark:text-slate-400"
      >
        ✕
      </button>
    </div>
  );
}
