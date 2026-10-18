// Android shell integration. On the web these are no-ops or use browser APIs.
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Share } from "@capacitor/share";

export const isNativeApp = Capacitor.isNativePlatform();

// The WebView has no navigator.share, so the app uses Android's share sheet.
// The text already ends with the source link, so no separate url is passed.
export const shareText = async ({ title, text }) => {
  if (isNativeApp) {
    await Share.share({ title, text, dialogTitle: "Share story" });
    return true;
  }
  if (navigator.share) {
    await navigator.share({ title, text });
    return true;
  }
  return false;
};

// Without a handler Android's back button closes the app from any screen.
export const onBackButton = (handler) => {
  if (!isNativeApp) return () => {};
  const listener = App.addListener("backButton", handler);
  return () => { listener.then(handle => handle.remove()); };
};

export const minimizeApp = () => (isNativeApp ? App.minimizeApp() : undefined);
