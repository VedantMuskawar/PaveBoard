import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    // Enable tree shaking
    treeshake: true,
    // Optimize bundle size
    commonjsOptions: {
      include: [/node_modules/]
    },
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // React ecosystem - separate chunk
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'react-vendor';
            }
            // Router - separate chunk
            if (id.includes('node_modules/react-router')) {
              return 'router';
            }
            // Firebase - separate chunk (already large)
            if (id.includes('node_modules/firebase')) {
              return 'firebase';
            }
            // Large utility libraries - split further
            if (id.includes('node_modules/xlsx')) {
              return 'xlsx';
            }
            if (id.includes('node_modules/html2pdf')) {
              return 'html2pdf';
            }
            if (id.includes('node_modules/dexie')) {
              return 'dexie';
            }
            // React window components
            if (id.includes('node_modules/react-window')) {
              return 'react-window';
            }
            // Toast notifications
            if (id.includes('node_modules/react-hot-toast')) {
              return 'toast';
            }
            // Heavy production & labour components - split further
            if (id.includes('src/pages/production & labour/ProductionEntriesPage')) {
              return 'production-entries';
            }
            if (id.includes('src/pages/production & labour/VehicleLabourEntry')) {
              return 'vehicle-labour-entry';
            }
            if (id.includes('src/pages/production & labour/LabourManagement')) {
              return 'labour-management';
            }
            if (id.includes('src/pages/production & labour/VehicleLabourWeeklyLedger')) {
              return 'vehicle-labour-ledger';
            }
            if (id.includes('src/pages/production & labour/LedgerPage')) {
              return 'ledger-page';
            }
            // Large order components
            if (id.includes('src/pages/order/DieselLedger')) {
              return 'diesel-ledger';
            }
            if (id.includes('src/pages/order/OrdersDashboard')) {
              return 'orders-dashboard';
            }
            // Accounting components - split further
            if (id.includes('src/pages/accounting/ClientLedger')) {
              return 'client-ledger';
            }
            if (id.includes('src/pages/accounting/IncomeLedger')) {
              return 'income-ledger';
            }
            if (id.includes('src/pages/accounting/ExpenseManagement')) {
              return 'expense-management';
            }
            if (id.includes('src/pages/accounting/CashLedger')) {
              return 'cash-ledger';
            }
            // Procurement components
            if (id.includes('src/pages/procurement/')) {
              return 'procurement';
            }
            // Vehicle operations
            if (id.includes('src/pages/vehicle operations/')) {
              return 'vehicle-ops';
            }
            // Scheduled orders
            if (id.includes('src/pages/ScheduledOrdersDashboard')) {
              return 'scheduled-orders';
            }
            // Print DM page
            if (id.includes('src/pages/PrintDMPage')) {
              return 'print-dm';
            }
            // Services - split by domain
            if (id.includes('src/services/ledgerService')) {
              return 'ledger-service';
            }
            if (id.includes('src/services/productionService')) {
              return 'production-service';
            }
            if (id.includes('src/services/labourService')) {
              return 'labour-service';
            }
            if (id.includes('src/services/wageService')) {
              return 'wage-service';
            }
            if (id.includes('src/services/employeeService')) {
              return 'employee-service';
            }
            // Utils - split by functionality
            if (id.includes('src/utils/labourUtils')) {
              return 'labour-utils';
            }
            if (id.includes('src/utils/wageUtils')) {
              return 'wage-utils';
            }
            if (id.includes('src/utils/ledgerSeedData')) {
              return 'ledger-seed';
            }
            if (id.includes('src/utils/productionSeedData')) {
              return 'production-seed';
            }
          }
        }
      },
    chunkSizeWarningLimit: 500,
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
      'react-hot-toast'
    ],
    exclude: [
      'firebase',
      'xlsx',
      'html2pdf.js',
      'dexie',
      'react-window',
      'react-window-infinite-loader'
    ]
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
