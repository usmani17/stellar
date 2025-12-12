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
    <div className="h-screen bg-white flex flex-col lg:flex-row overflow-hidden">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col relative px-4 sm:px-6 md:px-8 lg:px-12 overflow-y-auto">
        <div className="flex-1 flex items-center justify-center py-6 sm:py-8 md:py-12 lg:py-16">
          <div className="w-full max-w-[576px] inline-flex flex-col justify-start items-start gap-6 sm:gap-8 md:gap-10">
            {showLogo && (
              <div className="w-32 h-8 sm:w-36 sm:h-9 md:w-40 md:h-9 relative flex-shrink-0">
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

