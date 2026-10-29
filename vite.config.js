import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three/examples/")) return "three-tools";
          if (id.includes("node_modules/three/")) return "three";
          if (id.includes("node_modules/three-mesh-bvh/")) return "spatial";
        },
      },
    },
  },
});
