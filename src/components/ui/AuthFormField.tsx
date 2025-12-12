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
          className="justify-center text-black text-base font-medium leading-5 font-poppins" 
        >
          {label}
        </label>
      </div>
      <div className={`
        self-stretch h-12 px-3 py-2 
        bg-background-field 
        rounded-xl 
        outline outline-1 outline-offset-[-1px] outline-[#e8e8e3]
        inline-flex justify-start items-center gap-2
        ${error ? 'outline-red-500' : ''}
        focus-within:ring-2 focus-within:ring-forest-f40 focus-within:outline-forest-f40
      `}>
        <input
          className={`
            flex-1 h-5
            bg-transparent
            text-sm 
            text-neutral-n1000
            placeholder:text-[#bfbfbf] 
            focus:outline-none 
            font-poppins
            font-normal
            ${className}
          `}
          {...props}
        />
      </div>
      {helperText && !error && (
        <div className="self-stretch">
          {helperText}
        </div>
      )}
      {error && (
        <p className="self-stretch text-h700 text-red-600 font-poppins">{error}</p>
      )}
    </div>
  );
};

