import Script from 'next/script';
import { Noto_Sans_KR } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { StoreProvider } from '@/lib/store';

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata = {
  title: '커피 대장부',
  description: '사내 커피 대장부 관리 시스템',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-P8G9T0XJS3"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-P8G9T0XJS3');
          `}
        </Script>
        {/* Contentsquare */}
        <Script
          src="https://t.contentsquare.net/uxa/3a37d5ce9ed64.js"
          strategy="afterInteractive"
        />
      </head>
      <body className={notoSansKR.className}>
        <AuthProvider>
          <StoreProvider>
            {children}
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
