import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api";
import { getErrorMessage } from "../utils/helpers";

// const { resData, loading, error, refetch } = useFetch("/api/movie")
// refetch(true) reloads quietly without showing the loader (used for live seats)
export default function useFetch(url) {
  const [resData, setResData] = useState(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState(null);
  const counter = useRef(0);

  const load = useCallback(
    async (silent = false) => {
      if (!url) return;
      const id = ++counter.current;
      if (!silent) setLoading(true);
      try {
        const { data } = await api.get(url);
        if (id !== counter.current) return; // an older request, ignore it
        setResData(data);
        setError(null);
      } catch (err) {
        if (id !== counter.current) return;
        setError(getErrorMessage(err));
      } finally {
        if (id === counter.current && !silent) setLoading(false);
      }
    },
    [url]
  );

  useEffect(() => {
    load();
  }, [load]);

  return { resData, loading, error, refetch: load };
}