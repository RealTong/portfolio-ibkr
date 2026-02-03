import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { RefreshCw } from 'lucide-react';

export function RefreshButton() {
  const { refreshAll, state } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAll();
    } finally {
      setIsRefreshing(false);
    }
  };

  const isLoading = state.loading.accountInfo || state.loading.positions || state.loading.ledger;

  return (
    <button
      onClick={handleRefresh}
      disabled={isLoading || isRefreshing}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium
        transition-colors duration-200
        ${isLoading || isRefreshing
          ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
          : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
        }
      `}
      title="刷新数据"
    >
      <RefreshCw 
        className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
      />
      {isRefreshing ? '刷新中...' : '刷新'}
    </button>
  );
}
