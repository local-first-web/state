import React from 'react';

export const useNetworkStatus = () => {
  const [status, setStatus] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleChange = () => {
      setStatus(navigator.onLine);
    };

    window.addEventListener('online', handleChange);
    window.addEventListener('offline', handleChange);
    return () => {
      window.removeEventListener('online', handleChange);
      window.removeEventListener('offline', handleChange);
    };
  }, []);

  return status;
};
