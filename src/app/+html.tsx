import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const BRAND_COLOR = '#208AEF';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* PWA: link the manifest so Android Chrome / iPhone Safari can install the app */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content={BRAND_COLOR} />

        {/* iOS "Add to Home Screen" specifics */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Interesting Facts" />
        <link rel="apple-touch-icon" href="/logo180.png" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}