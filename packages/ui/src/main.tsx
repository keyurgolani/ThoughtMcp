import { MantineProvider, createTheme } from "@mantine/core";
import "@mantine/core/styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeTheme } from "./stores/themeStore";

// Initialize theme CSS variables before rendering
initializeTheme();

// Mantine theme with dark mode defaults
const mantineTheme = createTheme({
  primaryColor: "cyan",
  defaultRadius: "md",
});

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <MantineProvider theme={mantineTheme} defaultColorScheme="dark" forceColorScheme="dark">
      <App />
    </MantineProvider>
  </StrictMode>
);
