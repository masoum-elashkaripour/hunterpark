// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // The toolbar sits over the hero's thumbnail row; keep the dev view true to production.
  devToolbar: { enabled: false },
  server: {
    // Allow the Levion workspace proxy (any port / branch subdomain) to reach the dev server.
    allowedHosts: ['.workspace.levion.io'],
  },
});
