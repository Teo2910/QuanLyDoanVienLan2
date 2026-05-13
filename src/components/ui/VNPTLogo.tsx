import React from 'react';

interface VNPTLogoProps {
  className?: string;
}

export const VNPTLogo: React.FC<VNPTLogoProps> = ({ className }) => {
  return (
    <img 
      src="/vnptlogo.svg.png" 
      alt="VNPT Logo" 
      className={className} 
      referrerPolicy="no-referrer"
      style={{ objectFit: 'contain' }}
      onError={(e) => {
        // Fallback to official Wikimedia mirror if the local file is missing
        e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Vietnam_Posts_and_Telecommunications_Group_logo.svg/1024px-Vietnam_Posts_and_Telecommunications_Group_logo.svg.png";
      }}
    />
  );
};
