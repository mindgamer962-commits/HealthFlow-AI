import React from 'react';

interface ApexLogoProps {
  className?: string;
  variant?: 'large' | 'compact';
}

export const ApexLogo: React.FC<ApexLogoProps> = ({ className = '', variant = 'large' }) => {
  if (variant === 'compact') {
    // Compact: Just the custom intersecting orange and blue "X" icon of APEX
    return (
      <svg
        viewBox="0 0 100 100"
        className={`h-9 w-9 ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Blue diagonal line: top-left to bottom-right */}
        <line
          x1="20"
          y1="20"
          x2="80"
          y2="80"
          stroke="#0B4E9A"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Orange diagonal line: bottom-left to top-right */}
        <line
          x1="20"
          y1="80"
          x2="80"
          y2="20"
          stroke="#EA6C13"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Center overlay circle to look extremely sleek */}
        <circle cx="50" cy="50" r="6" fill="#FAF9F6" />
      </svg>
    );
  }

  // Large: Complete Team APEX logomark exactly as uploaded
  return (
    <svg
      viewBox="0 0 600 240"
      className={`w-full max-w-[400px] h-auto ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Definitions for Gradients */}
      <defs>
        <linearGradient id="orange-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#EA6C13" stopOpacity="0" />
          <stop offset="100%" stopColor="#EA6C13" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="blue-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0B4E9A" stopOpacity="1" />
          <stop offset="100%" stopColor="#0B4E9A" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* 1. TOP LINE: "T E A M" with gradient side lines */}
      {/* Left Orange Line */}
      <path
        d="M 130 50 L 210 50"
        stroke="url(#orange-grad)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Spaced "T E A M" lettering */}
      <g style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: '15px', letterSpacing: '8px' }}>
        <text x="235" y="55" fill="#EA6C13">T</text>
        <text x="272" y="55" fill="#EA6C13">E</text>
        <text x="310" y="55" fill="#B3A58B">A</text>
        <text x="349" y="55" fill="#0B4E9A">M</text>
      </g>

      {/* Right Blue Line */}
      <path
        d="M 395 50 L 475 50"
        stroke="url(#blue-grad)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* 2. CENTER PIECE: "A P E X" letters (custom vectors for geometric thin lines) */}
      
      {/* Letter 'A' (Orange: #EA6C13) */}
      <g stroke="#EA6C13" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 85 170 L 140 85 L 195 170" />
        <path d="M 105 150 L 175 150" />
      </g>

      {/* Letter 'P' (Taupe: #B3A58B) */}
      <g stroke="#B3A58B" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 235 85 L 235 170" />
        {/* Draw loop for P */}
        <path d="M 235 85 C 295 85, 295 127.5, 235 127.5" />
      </g>

      {/* Letter 'E' (Blue: #0B4E9A) */}
      <g stroke="#0B4E9A" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 395 85 L 345 85 L 345 170 L 395 170" />
        <path d="M 345 127.5 L 385 127.5" />
      </g>

      {/* Letter 'X' (Intersecting Orange and Blue) */}
      {/* Blue Diagonal: Top-Left to Bottom-Right */}
      <line
        x1="445"
        y1="85"
        x2="505"
        y2="170"
        stroke="#0B4E9A"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      {/* Orange Diagonal: Bottom-Left to Top-Right */}
      <line
        x1="445"
        y1="170"
        x2="505"
        y2="85"
        stroke="#EA6C13"
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* 3. BOTTOM SEGMENTED RULE */}
      {/* Left Orange Accent bar */}
      <path
        d="M 85 200 L 260 200"
        stroke="#EA6C13"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Small Separator blocks */}
      <line x1="272" y1="200" x2="292" y2="200" stroke="#EA6C13" strokeWidth="3" />
      <line x1="304" y1="200" x2="324" y2="200" stroke="#B3A58B" strokeWidth="3" />
      <line x1="336" y1="200" x2="356" y2="200" stroke="#0B4E9A" strokeWidth="3" />
      {/* Right Blue Accent bar */}
      <path
        d="M 368 200 L 505 200"
        stroke="#0B4E9A"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};
