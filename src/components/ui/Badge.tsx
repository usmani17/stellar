import React from 'react';

export type BadgeVariant = 'success' | 'important' | 'lowPriority' | 'primary' | 'failed';

interface BadgeProps {
  /** The text content to display in the badge */
  children?: React.ReactNode;
  /** The text value (alternative to children) */
  text?: string | number;
  /** Variant type: 'success' | 'important' | 'lowPriority' | 'primary' | 'failed' */
  variant?: BadgeVariant;
  /** Custom background color (hex code, e.g., '#136d6d') */
  bgColor?: string;
  /** Custom text color (hex code, e.g., '#f9f9f6') */
  textColor?: string;
  /** Prefix symbol (e.g., '+', '-') */
  prefix?: string;
  /** Padding classes (default based on variant) */
  padding?: string;
  /** Gap between prefix and text (default based on variant) */
  gap?: string;
  /** Text alignment */
  textAlign?: 'left' | 'center' | 'right';
  /** Fixed width (e.g., 'w-[27px]') */
  width?: string;
  /** Fixed height (e.g., 'h-[18px]') */
  height?: string;
  /** Additional CSS classes */
  className?: string;
}

const variantStyles: Record<BadgeVariant, {
  bg: string;
  text: string;
  padding: string;
  gap: string;
  prefix?: string;
  textAlign?: 'left' | 'center' | 'right';
  width?: string;
  height?: string;
}> = {
  success: {
    bg: '#136d6d',
    text: '#f9f9f6',
    padding: 'pr-1.5 pl-1.5',
    gap: 'gap-0',
    prefix: '+',
    textAlign: 'left',
  },
  important: {
    bg: '#b51111',
    text: '#f9f9f6',
    padding: 'pr-1.5 pl-1.5',
    gap: 'gap-2.5',
    textAlign: 'left',
  },
  lowPriority: {
    bg: '#e4e4d7',
    text: '#072929',
    padding: 'pt-0.5 pr-2 pb-0.5 pl-2',
    gap: 'gap-2.5',
    textAlign: 'center',
    width: 'w-[27px]',
    height: 'h-[18px]',
  },
  primary: {
    bg: '#072929',
    text: '#ffffff',
    padding: 'pr-1.5 pl-1.5',
    gap: 'gap-2.5',
    textAlign: 'left',
  },
  failed: {
    bg: '#b51111',
    text: '#f9f9f6',
    padding: 'pr-1.5 pl-1.5',
    gap: 'gap-0',
    prefix: '-',
    textAlign: 'left',
  },
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  text,
  variant,
  bgColor,
  textColor,
  prefix,
  padding,
  gap,
  textAlign,
  width,
  height,
  className = '',
}) => {
  // Get variant styles if variant is provided
  const variantStyle = variant ? variantStyles[variant] : null;

  // Determine final styles - custom props override variant styles
  const finalBg = bgColor || variantStyle?.bg || '#072929';
  const finalText = textColor || variantStyle?.text || '#ffffff';
  const finalPadding = padding || variantStyle?.padding || 'pr-1.5 pl-1.5';
  const finalGap = gap || variantStyle?.gap || 'gap-2.5';
  const finalPrefix = prefix !== undefined ? prefix : variantStyle?.prefix;
  const finalTextAlign = textAlign || variantStyle?.textAlign || 'left';
  const finalWidth = width || variantStyle?.width || '';
  const finalHeight = height || variantStyle?.height || '';

  // Get display content
  const displayContent = children || text || '';

  // Determine justify class based on text alignment
  const justifyClass = finalTextAlign === 'center' ? 'justify-center' : 'justify-start';

  // Determine text alignment class
  const textAlignClass = finalTextAlign === 'center' ? 'text-center' : finalTextAlign === 'right' ? 'text-right' : 'text-left';

  return (
    <div
      className={`
        relative
        flex
        shrink-0
        flex-row
        items-center
        ${justifyClass}
        ${finalGap}
        rounded-lg
        ${finalPadding}
        ${finalWidth}
        ${finalHeight}
        ${className}
      `}
      style={{
        backgroundColor: finalBg,
      }}
    >
      {finalPrefix && (
        <div
          className={`
            relative
            ${textAlignClass}
            text-xs
            leading-[18px]
            font-normal
          `}
          style={{
            color: finalText,
          }}
        >
          {finalPrefix}
        </div>
      )}
      <div
        className={`
          relative
          ${textAlignClass}
          text-xs
          leading-[18px]
          font-normal
        `}
        style={{
          fontFamily: "GT America Trial, sans-serif",
          color: finalText,
        }}
      >
        {displayContent}
      </div>
    </div>
  );
};
