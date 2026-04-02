import React from 'react';
import { PasswordUpdateBanner } from '../auth/PasswordUpdateBanner';
import { VerifyEmailBanner } from '../auth/VerifyEmailBanner';
import { ImpersonationBanner } from '../auth/ImpersonationBanner';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-white">
      <ImpersonationBanner />
      <PasswordUpdateBanner />
      <VerifyEmailBanner />
      <main>{children}</main>
    </div>
  );
};

