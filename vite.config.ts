import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import obfuscatorPlugin from "vite-plugin-javascript-obfuscator";

// https://vite.dev/config/
export default defineConfig({

    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src') // 路径别名
        }
    },
    plugins: [
        vue(),
        obfuscatorPlugin({
            options: {
                optionsPreset: 'high-obfuscation'
            },
            apply: 'build'
        }),
    ],
    base: '/three-demo-list/',
    server: {
        port: 3000
    }
})
