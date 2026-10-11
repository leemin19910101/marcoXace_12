import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: '卡金王室機密檔案｜41', description: '兩位王子，一份機密紀錄。人物簡介、插圖、漫畫、小說與番外，支援繁中、日文與英文。', icons: { icon: '/favicon.svg' } };
export default function RootLayout({children}: {children: React.ReactNode}) { return <html lang="zh-Hant"><body>{children}</body></html>; }
