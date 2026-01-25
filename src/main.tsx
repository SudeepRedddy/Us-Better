import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register service worker for push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // Unregister any VitePWA service workers first to avoid conflicts
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        // Keep our custom sw.js, unregister others
        if (reg.active?.scriptURL && !reg.active.scriptURL.endsWith('/sw.js')) {
          await reg.unregister();
        }
      }
      
      // Register the custom push notification service worker
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('Push notification service worker registered:', registration.scope);
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        console.log('Service worker update found');
      });
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  });
}
createRoot(document.getElementById("root")!).render(<App />);
