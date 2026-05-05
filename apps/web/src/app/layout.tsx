import type { Metadata } from 'next';
import './globals.css';
import { ApolloProvider } from '@/components/providers/ApolloProvider';

export const metadata: Metadata = {
  title: { default: 'UDB — Unified Developmental Backbone', template: '%s | UDB' },
  description: 'The all-in-one platform for holistic youth development — Ages 6-23. Academic excellence, healthy habits, entrepreneurship, and more.',
  keywords: ['education', 'child development', 'gamification', 'AI tutor', 'parenting'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <ApolloProvider>
          {children}
        </ApolloProvider>
      </body>
    </html>
  );
}
