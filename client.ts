import { h } from "preact";
import "./assets/styles.css";
import "@fontsource/fira-code/latin-400.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/iosevka/latin-400.css";
import "@fontsource/inconsolata/latin-400.css";

// Make h available globally for JSX compilation
(globalThis as Record<string, unknown>).h = h;
