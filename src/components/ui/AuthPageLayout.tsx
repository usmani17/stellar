import React, { type ReactNode } from 'react';
import { Logo } from './Logo';
import { AuthSidebar } from './AuthSidebar';

interface AuthPageLayoutProps {
  children: ReactNode;
  showLogo?: boolean;
  sidebarContent?: ReactNode;
  showGetStarted?: boolean;
}

export const AuthPageLayout: React.FC<AuthPageLayoutProps> = ({ 
  children, 
  showLogo = true,
  sidebarContent,
  showGetStarted = false
}) => {
  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col relative px-4 sm:px-8 lg:px-0">
        <div className="flex-1 flex items-center justify-center py-8 sm:py-12 lg:py-0">
          <div className="w-full max-w-[576px] inline-flex flex-col justify-start items-start gap-16">
            {showLogo && (
              <div className="w-40 h-9 relative">
                <Logo />
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
      
      {/* Right side - Sidebar */}
      <AuthSidebar showGetStarted={showGetStarted}>
        {sidebarContent}
      </AuthSidebar>
    </div>
  );
};

