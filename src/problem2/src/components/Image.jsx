import React, { useState } from "react";

export const Image = ({ src, alt, fallbackSrc, ...props }) => {
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
    }
  };

  return (
    <img
      src={hasError ? fallbackSrc : src}
      alt={alt}
      onError={handleError}
      {...props}
    />
  );
};
