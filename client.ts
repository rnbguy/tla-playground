import { h } from "preact";
import "./assets/styles.css";
import "@fontsource/fira-code/latin-400.css";

// Make h available globally for JSX compilation
(globalThis as Record<string, unknown>).h = h;
