import React from 'react';
import { PasswordUpdateBanner } from '../auth/PasswordUpdateBanner';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-white">
      <PasswordUpdateBanner />
      <main>{children}</main>
    </div>
  );
};

