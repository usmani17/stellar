import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-h800 text-forest-f60 mb-1.5 font-medium">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-4 py-2.5
          bg-sandstorm-s5
          border border-sandstorm-s50
          rounded-lg
          text-h800 text-forest-f60
          placeholder:text-forest-f30
          focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500 focus:ring-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-h700 text-red-600">{error}</p>
      )}
    </div>
  );
};

