import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const BRAND_COLOR = '#208AEF';

// Anti-flash: set documentElement.dataset.theme synchronously in <head> before
// React hydrates, reading the saved preference (localStorage) and defaulting to
// the device color scheme. Runs on every web load to prevent a light/dark flash.
const THEME_INIT_SCRIPT = `(function(){try{
  var t=localStorage.getItem('theme-preference');
  var dark;
  if(t==='dark') dark=true;
  else if(t==='light') dark=false;
  else dark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme=dark?'dark':'light';
}catch(e){document.documentElement.dataset.theme='light';}})();`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Anti-flash: set the theme before any paint / React hydration */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />

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