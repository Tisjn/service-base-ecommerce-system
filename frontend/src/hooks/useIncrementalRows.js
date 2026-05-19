import { useCallback, useEffect, useMemo, useState } from "react";

export const TABLE_BATCH_SIZE = 10;

export function useIncrementalRows(items, batchSize = TABLE_BATCH_SIZE) {
  const safeItems = Array.isArray(items) ? items : [];
  const [visibleCount, setVisibleCount] = useState(batchSize);

  useEffect(() => {
    setVisibleCount(batchSize);
  }, [batchSize, safeItems]);

  const visibleItems = useMemo(
    () => safeItems.slice(0, visibleCount),
    [safeItems, visibleCount],
  );

  const hasMore = visibleCount < safeItems.length;

  const loadMore = useCallback(() => {
    setVisibleCount((current) =>
      Math.min(current + batchSize, safeItems.length),
    );
  }, [batchSize, safeItems.length]);

  const handleScroll = useCallback(
    (event) => {
      if (!hasMore) return;
      const element = event.currentTarget;
      const distanceToBottom =
        element.scrollHeight - element.scrollTop - element.clientHeight;
      if (distanceToBottom <= 80) {
        loadMore();
      }
    },
    [hasMore, loadMore],
  );

  return {
    visibleItems,
    visibleCount: visibleItems.length,
    totalCount: safeItems.length,
    hasMore,
    handleScroll,
  };
}
