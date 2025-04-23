import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./lib/auth";
import { I18nProvider } from "./lib/i18n";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <I18nProvider>
      <App />
    </I18nProvider>
  </AuthProvider>
);
