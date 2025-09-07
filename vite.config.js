import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'vendor';
          }
          // Charts chunk
          if (id.includes('node_modules/recharts')) {
            return 'charts';
          }
          // Utils chunk
          if (id.includes('node_modules/dexie') || id.includes('node_modules/xlsx') || id.includes('node_modules/html2pdf')) {
            return 'utils';
          }
          // Firebase chunk
          if (id.includes('node_modules/firebase')) {
            return 'firebase';
          }
          // Large components chunk
          if (id.includes('src/pages/') && (id.includes('ProductionEntry') || id.includes('LabourManagement') || id.includes('DieselLedger'))) {
            return 'heavy-components';
          }
          // Accounting components
          if (id.includes('src/pages/accounting/')) {
            return 'accounting';
          }
          // Procurement components
          if (id.includes('src/pages/procurement/')) {
            return 'procurement';
          }
          // Vehicle operations
          if (id.includes('src/pages/vehicle operations/')) {
            return 'vehicle-ops';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    // Optimize assets
    assetsDir: 'assets',
    // Enable compression
    reportCompressedSize: true,
    // Optimize images
    assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg', '**/*.webp']
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'recharts',
      'dexie',
      'xlsx',
      'html2pdf.js',
      'react-hot-toast'
    ],
    exclude: ['firebase']
  },
  server: {
    hmr: {
      overlay: false
    }
  },
  // Enable pre-bundling for better performance
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
})
