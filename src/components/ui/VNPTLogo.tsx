import React from 'react';

interface VNPTLogoProps {
  className?: string;
}

export const VNPTLogo: React.FC<VNPTLogoProps> = ({ className }) => {
  return (
    <img 
      src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Vietnam_Posts_and_Telecommunications_Group_logo.svg/1024px-Vietnam_Posts_and_Telecommunications_Group_logo.svg.png" 
      alt="VNPT Vietnam Logo" 
      className={className} 
      referrerPolicy="no-referrer"
      style={{ objectFit: 'contain' }}
      onError={(e) => {
        // Fallback to the simplified VNPT logo if the full one fails
        e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/VNPT_Logo.svg/512px-VNPT_Logo.svg.png";
      }}
    />
  );
};
