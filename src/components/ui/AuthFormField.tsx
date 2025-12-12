import React from 'react';

interface AuthFormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: React.ReactNode;
  containerClassName?: string;
}

export const AuthFormField: React.FC<AuthFormFieldProps> = ({
  label,
  error,
  helperText,
  containerClassName = '',
  className = '',
  ...props
}) => {
  return (
    <div className={`flex-1 inline-flex flex-col justify-start items-start gap-1 ${containerClassName}`}>
      <div className="self-stretch pb-1 inline-flex justify-start items-start">
        <label 
          className="justify-center text-black text-sm sm:text-base font-medium leading-5" 
          style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500 }}
        >
          {label}
        </label>
      </div>
      <div className={`
        self-stretch h-12 sm:h-12 px-3 py-2 
        bg-sandstorm-s5
        rounded-xl 
        border border-sandstorm-s40
        inline-flex justify-start items-center gap-2
        transition-all duration-200
        ${error ? 'border-red-r30' : ''}
        focus-within:border-forest-f40
      `}>
        <input
          className={`
            flex-1 h-5
            bg-transparent
            text-sm sm:text-sm
            text-neutral-n1000
            placeholder:text-[#bfbfbf] 
            focus:outline-none 
            ${className}
          `}
          style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
          {...props}
        />
      </div>
      {helperText && !error && (
        <div className="self-stretch mt-1">
          {helperText}
        </div>
      )}
      {error && (
        <p className="self-stretch text-xs sm:text-sm text-red-r30 mt-1" style={{ fontFamily: 'Poppins, sans-serif' }}>{error}</p>
      )}
    </div>
  );
};

