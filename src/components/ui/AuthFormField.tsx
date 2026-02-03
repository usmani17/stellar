import React, { useState } from "react";

interface AuthFormFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: React.ReactNode;
  containerClassName?: string;
}

const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

export const AuthFormField: React.FC<AuthFormFieldProps> = ({
  label,
  error,
  helperText,
  containerClassName = "",
  className = "",
  type = "text",
  ...props
}) => {
  const isPassword = type === "password";
  const [showPassword, setShowPassword] = useState(false);
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <div
      className={`flex-1 inline-flex flex-col justify-start items-start gap-1 ${containerClassName}`}
    >
      <div className="self-stretch pb-1 inline-flex justify-start items-start">
        <label className="justify-center text-black text-base font-medium leading-5 font-poppins">
          {label}
        </label>
      </div>
      <div
        className={`
        self-stretch h-12 px-3 py-2 
        bg-[#FEFEFB] 
        rounded-xl 
        border border-sandstorm-s40
        inline-flex justify-start items-center gap-2
        transition-all duration-200
        ${error ? "border-red-r30" : ""}
        focus-within:border-forest-f40
      `}
      >
        <input
          className={`
            flex-1 min-w-0 h-5
            bg-transparent
            text-sm sm:text-sm
            text-neutral-n1000
            placeholder:text-[#bfbfbf] 
            focus:outline-none 
            font-poppins
            font-normal
            ${className}
          `}
          type={inputType}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="shrink-0 p-1 rounded text-neutral-n500 hover:text-neutral-n700 focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:ring-offset-0"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOffIcon className="w-5 h-5" />
            ) : (
              <EyeIcon className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      {helperText && !error && (
        <div className="self-stretch mt-1">{helperText}</div>
      )}
      {error && (
        <p className="self-stretch text-h700 text-red-600 font-poppins">
          {error}
        </p>
      )}
    </div>
  );
};
