import Script from 'next/script';
import { Noto_Sans_KR } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { StoreProvider } from '@/lib/store';

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata = {
  title: '커피 대장부',
  description: '사내 커피 비용 관리 서비스 - 멤버별 잔액 추적, 월별 리포트, 엑셀 내보내기',
  openGraph: {
    title: '커피 대장부',
    description: '사내 커피 비용 관리 서비스 - 멤버별 잔액 추적, 월별 리포트, 엑셀 내보내기',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '커피 대장부',
    description: '사내 커피 비용 관리 서비스',
    images: ['/og-image.png'],
  },
  verification: {
    google: 'qwScbmyNfsd16_eeSLZk8kePN1nnVFuuZtjXJQDTX80',
  },
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
        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1265314191139623"
          crossOrigin="anonymous"
        />
      </head>
      <body className={notoSansKR.className}>
        <AuthProvider>
          <StoreProvider>
            {children}
          </StoreProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
