import React, { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  children: ReactNode;
  showGetStarted?: boolean;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, showGetStarted = false }) => {
  return (
    <div className="min-h-screen flex">
      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center bg-white px-4 py-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>

      {/* Sidebar with Gradient */}
      <div className="hidden lg:flex w-96 flex-col justify-between bg-gradient-to-br from-forest-f40 via-forest-f30 to-forest-f50 p-8 text-white">
        <div>
          {showGetStarted && (
            <Link
              to="/signup"
              className="inline-block mb-8 px-6 py-2.5 bg-white text-forest-f60 rounded-lg font-semibold text-h800 hover:bg-sandstorm-s5 transition-colors"
            >
              GET STARTED
            </Link>
          )}
          
          {showGetStarted ? (
            <div className="space-y-4">
              <h2 className="text-h1200 font-bold">Set up your account in minutes.</h2>
              <p className="text-h800 text-white/90">
                We keep things simple so you can focus on running and growing your business.
              </p>
            </div>
          ) : (
            <div>
              <h2 className="text-h1200 font-bold mb-2">know your numbers.</h2>
              <h2 className="text-h1200 font-bold">Grow with clarity</h2>
            </div>
          )}
        </div>

        {/* Platform Icons */}
        <div className="flex flex-wrap gap-4 mt-8">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-2">
              <span className="text-h800 font-semibold">G</span>
            </div>
            <span className="text-h600 text-white/80">Google</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-2">
              <span className="text-h800 font-semibold">W</span>
            </div>
            <span className="text-h600 text-white/80">Walmart</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-2">
              <span className="text-h800 font-semibold">A</span>
            </div>
            <span className="text-h600 text-white/80">Amazon</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-2">
              <span className="text-h800 font-semibold">C</span>
            </div>
            <span className="text-h600 text-white/80">Costco</span>
          </div>
        </div>
      </div>
    </div>
  );
};

