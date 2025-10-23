import { useEffect } from 'react';

const usePageMeta = (title: string, faviconPath: string = '/favicon.ico') => {
  useEffect(() => {
    // Update the page title
    document.title = title;

    // Update the favicon if provided
    const favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (favicon && favicon.href !== window.location.origin + faviconPath) {
      favicon.href = faviconPath;
    }
  }, [title, faviconPath]);
};

export default usePageMeta;
