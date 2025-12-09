import React, { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AuthSidebarProps {
  children?: ReactNode;
  showGetStarted?: boolean;
}

export const AuthSidebar: React.FC<AuthSidebarProps> = ({ 
  children,
  showGetStarted = false 
}) => {
  return (
    <div className="hidden lg:flex w-full lg:w-[720px] h-screen relative overflow-hidden">
      {/* Background layers matching Figma exactly */}
      <div className="absolute left-0 top-0 w-full h-full">
        {/* Base background layer */}
        <div className="absolute inset-0 w-full h-full bg-emerald-950 rounded-tl-[40px] rounded-bl-[40px]">
          {/* Radial gradient overlay */}
          <div 
            className="absolute w-[956px] h-[956px] rounded-full blur-[78px]"
            style={{
              background: 'radial-gradient(ellipse 76.05% 76.05% at 50.00% 23.95%, #25D3D3 0%, #136D6D 50%, #0B4141 77%, #0B4141 100%)',
              left: '-118px',
              top: '-139px'
            }}
          />
        </div>
        
        {/* Backdrop blur layer with opacity */}
        <div className="absolute inset-0 w-full h-full bg-emerald-950/20 rounded-tl-[40px] rounded-bl-[40px] backdrop-blur">
          <div 
            className="absolute w-[956px] h-[956px] rounded-full blur-[78px]"
            style={{
              background: 'radial-gradient(ellipse 76.05% 76.05% at 50.00% 23.95%, #25D3D3 0%, #136D6D 50%, #0B4141 77%, #0B4141 100%)',
              left: '-118px',
              top: '-139px'
            }}
          />
        </div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col gap-28 px-16 py-28 w-full">
        <div className="w-full max-w-[590px] flex flex-col gap-10">
          {showGetStarted && (
            <Link
              to="/signup"
              className="px-6 py-3 bg-black/20 rounded-[40px] backdrop-blur inline-flex justify-center items-center gap-2.5 self-start transition-opacity hover:opacity-90"
            >
              <span className="text-white text-2xl font-normal uppercase leading-8 tracking-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Let's go
              </span>
            </Link>
          )}
          
          {children || (
            <div className="flex flex-col gap-10">
              <h2 className="text-4xl font-semibold text-white leading-10 tracking-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
                know your numbers. Grow with<br/>clarity
              </h2>
              <p className="text-2xl text-white font-normal leading-8 tracking-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
                A simple dashboard to keep an eye on your sales, customers, and growth in one place.
              </p>
              
              {/* Platform badges - matching Figma layout exactly */}
              <div className="flex flex-col gap-5">
                <div className="inline-flex gap-5">
                  <div className="px-5 py-3 bg-white/20 rounded-3xl backdrop-blur flex justify-center items-center gap-2.5">
                    <div className="w-5 h-5 relative rounded-[3px]">
                      <div className="w-3.5 h-3.5 left-[2.33px] top-[2.50px] absolute bg-white" />
                    </div>
                    <span className="text-white text-base font-normal leading-5 tracking-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>Google</span>
                  </div>
                  <div className="px-5 py-3 bg-white/20 rounded-3xl backdrop-blur flex justify-center items-center gap-2.5">
                    <div className="w-5 h-5 relative rounded-[3px]">
                      <div className="w-3.5 h-3.5 left-[3.29px] top-[2.50px] absolute bg-white" />
                    </div>
                    <span className="text-white text-base font-normal leading-5 tracking-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>Walmart</span>
                  </div>
                  <div className="px-5 py-3 bg-white/20 rounded-3xl backdrop-blur flex justify-center items-center gap-2.5">
                    <div className="w-5 h-5 relative rounded-[3px]">
                      <div className="w-3.5 h-3.5 left-[3.28px] top-[2.50px] absolute bg-white" />
                    </div>
                    <span className="text-white text-base font-normal leading-5 tracking-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>Instacart</span>
                  </div>
                </div>
                <div className="inline-flex gap-5">
                  <div className="px-5 py-3 bg-white/20 rounded-3xl backdrop-blur flex justify-center items-center gap-2.5">
                    <div className="w-5 h-5 relative rounded-[3px] overflow-hidden">
                      <div className="w-1.5 h-2 left-[10.81px] top-[5.73px] absolute bg-white" />
                      <div className="w-2 h-2 left-[2.56px] top-[5.61px] absolute bg-white" />
                    </div>
                    <span className="text-white text-base font-normal leading-5 tracking-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>Criteo</span>
                  </div>
                  <div className="px-5 py-3 bg-white/20 rounded-3xl backdrop-blur flex justify-center items-center gap-2.5">
                    <div className="w-5 h-5 relative">
                      <div className="w-4 h-4 left-[1.67px] top-[2.50px] absolute bg-white" />
                    </div>
                    <span className="text-white text-base font-normal leading-5 tracking-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>Amazon</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
