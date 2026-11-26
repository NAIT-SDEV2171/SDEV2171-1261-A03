import { useEffect, useState } from 'react';

// Fetches JSON from url. Refetches when url or token changes, or retry() is called.
// Cancels the previous request whenever a new one starts.
// Pass { token } to send it as a bearer token.
export function useFetch(url, { token } = {}) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [data, setData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setStatus('loading');

      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await fetch(url, { headers, signal: controller.signal });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? `Server returned ${response.status}`);
        }

        setData(await response.json());
        setStatus('success');
      } catch (error) {
        if (controller.signal.aborted) return;
        setErrorMessage(error.message);
        setStatus('error');
      }
    }

    load();
    return () => controller.abort();
  }, [url, token, reloadKey]);

  function retry() {
    setReloadKey((key) => key + 1);
  }

  return { status, data, errorMessage, retry };
}
