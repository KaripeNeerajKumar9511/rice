import type { Config } from 'tailwindcss';
const config: Config = { content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'], theme: { extend: { colors: { rice: { 50:'#f5f8ee',100:'#e8efd9',200:'#d3e2b6',300:'#b4ce89',400:'#91b65e',500:'#6f9942',600:'#557b32',700:'#42602a',800:'#374e26',900:'#304323' } } } }, plugins: [] };
export default config;
