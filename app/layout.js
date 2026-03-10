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
