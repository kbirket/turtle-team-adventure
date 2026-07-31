import React, { useState } from 'react';

const MapIcon = ({ id, left, top }) => {
  const [isSelected, setIsSelected] = useState(false);

  return (
    <svg 
      className={`map-icon ${isSelected ? 'selected' : ''}`}
      style={{ left, top }}
      onClick={() => setIsSelected(!isSelected)}
    >
      <use href={`#${id}`} />
    </svg>
  );
};

export default MapIcon;