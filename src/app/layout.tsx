import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Chat Copilot — Every question deserves a moment', description: 'Turn the rush of Twitch chat into meaningful conversations with your community.', robots: { index: false, follow: false } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
