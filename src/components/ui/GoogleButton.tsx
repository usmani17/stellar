import React from 'react';

interface GoogleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
}

export const GoogleButton: React.FC<GoogleButtonProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <button
      type="button"
      className={`
        self-stretch h-14 
        rounded-2xl 
        outline outline-1 outline-offset-[-1px] outline-[#e8e8e3]
        inline-flex justify-center items-center gap-2.5
        bg-white
        hover:bg-sandstorm-s5 
        transition-colors
        ${className}
      `}
      style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
      {...props}
    >
      <div className="w-8 h-8 relative shrink-0">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M30.0014 16.3109C30.0014 15.1598 29.9061 14.3198 29.6998 13.4487H16.2871V18.6442H24.1601C24.0014 19.9354 23.1442 21.8798 21.2394 23.1866L21.2127 23.3604L25.4536 26.58L25.7474 26.6087C28.4458 24.1666 30.0014 20.5732 30.0014 16.3109Z" fill="#4285F4"/>
          <path d="M16.2863 30C20.1434 30 23.3814 28.7555 25.7466 26.6089L21.2386 23.1866C19.8889 24.011 18.0134 24.5866 16.2863 24.5866C12.5089 24.5866 9.30225 22.1444 8.15928 18.7688L7.99176 18.7822L3.58208 22.1272L3.52441 22.2843C5.87359 26.8577 10.699 30 16.2863 30Z" fill="#34A853"/>
          <path d="M8.16007 18.7688C7.85807 17.8977 7.68401 16.9643 7.68401 16C7.68401 15.0359 7.85807 14.1025 8.14425 13.2314L8.13623 13.0454L3.67119 9.64739L3.52518 9.71548C2.55696 11.6133 2.00098 13.7445 2.00098 16C2.00098 18.2555 2.55696 20.3867 3.52518 22.2845L8.16007 18.7688Z" fill="#FBBC05"/>
          <path d="M16.2864 7.41333C18.9689 7.41333 20.7784 8.54885 21.8102 9.49778L25.8239 5.54C23.3658 3.17777 20.1435 2 16.2864 2C10.699 2 5.87359 5.14222 3.52441 9.71556L8.14352 13.2311C9.30252 9.85555 12.5091 7.41333 16.2864 7.41333Z" fill="#EB4335"/>
        </svg>
      </div>
      <span className="justify-center text-black text-base font-normal" style={{ fontFamily: 'Poppins, sans-serif' }}>
        {children || 'Continue with Google'}
      </span>
    </button>
  );
};

