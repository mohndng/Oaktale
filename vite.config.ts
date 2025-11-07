import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';


export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['icon.png'],
          manifest: {
            name: 'Oaktale',
            short_name: 'Oaktale',
            description: 'A web-based game.',
            theme_color: '#ffffff',
            icons: [
              {
                src: 'icon.png',
                sizes: '192x192',
                type: 'image/png'
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
