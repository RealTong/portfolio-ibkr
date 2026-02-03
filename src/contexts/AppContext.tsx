import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { IBKRAccountInfo, IPositionItem, ILedgerItem } from '@/types/ibkr';

// 状态接口定义
interface AppState {
  accountInfo: IBKRAccountInfo | null;
  positions: IPositionItem[];
  ledger: ILedgerItem | null;
  loading: {
    accountInfo: boolean;
    positions: boolean;
    ledger: boolean;
  };
  error: {
    accountInfo: string | null;
    positions: string | null;
    ledger: string | null;
  };
  lastFetch: {
    accountInfo: number | null;
    positions: number | null;
    ledger: number | null;
  };
}

// Action类型定义
type AppAction =
  | { type: 'SET_ACCOUNT_INFO_LOADING'; payload: boolean }
  | { type: 'SET_POSITIONS_LOADING'; payload: boolean }
  | { type: 'SET_LEDGER_LOADING'; payload: boolean }
  | { type: 'SET_ACCOUNT_INFO'; payload: IBKRAccountInfo }
  | { type: 'SET_POSITIONS'; payload: IPositionItem[] }
  | { type: 'SET_LEDGER'; payload: ILedgerItem }
  | { type: 'SET_ACCOUNT_INFO_ERROR'; payload: string | null }
  | { type: 'SET_POSITIONS_ERROR'; payload: string | null }
  | { type: 'SET_LEDGER_ERROR'; payload: string | null }
  | { type: 'UPDATE_LAST_FETCH'; payload: { key: keyof AppState['lastFetch']; timestamp: number } };

// 初始状态
const initialState: AppState = {
  accountInfo: null,
  positions: [],
  ledger: null,
  loading: {
    accountInfo: false,
    positions: false,
    ledger: false,
  },
  error: {
    accountInfo: null,
    positions: null,
    ledger: null,
  },
  lastFetch: {
    accountInfo: null,
    positions: null,
    ledger: null,
  },
};

// Reducer函数
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ACCOUNT_INFO_LOADING':
      return {
        ...state,
        loading: { ...state.loading, accountInfo: action.payload },
        error: { ...state.error, accountInfo: null },
      };
    case 'SET_POSITIONS_LOADING':
      return {
        ...state,
        loading: { ...state.loading, positions: action.payload },
        error: { ...state.error, positions: null },
      };
    case 'SET_LEDGER_LOADING':
      return {
        ...state,
        loading: { ...state.loading, ledger: action.payload },
        error: { ...state.error, ledger: null },
      };
    case 'SET_ACCOUNT_INFO':
      return {
        ...state,
        accountInfo: action.payload,
        loading: { ...state.loading, accountInfo: false },
        error: { ...state.error, accountInfo: null },
      };
    case 'SET_POSITIONS':
      return {
        ...state,
        positions: action.payload,
        loading: { ...state.loading, positions: false },
        error: { ...state.error, positions: null },
      };
    case 'SET_LEDGER':
      return {
        ...state,
        ledger: action.payload,
        loading: { ...state.loading, ledger: false },
        error: { ...state.error, ledger: null },
      };
    case 'SET_ACCOUNT_INFO_ERROR':
      return {
        ...state,
        loading: { ...state.loading, accountInfo: false },
        error: { ...state.error, accountInfo: action.payload },
      };
    case 'SET_POSITIONS_ERROR':
      return {
        ...state,
        loading: { ...state.loading, positions: false },
        error: { ...state.error, positions: action.payload },
      };
    case 'SET_LEDGER_ERROR':
      return {
        ...state,
        loading: { ...state.loading, ledger: false },
        error: { ...state.error, ledger: action.payload },
      };
    case 'UPDATE_LAST_FETCH':
      return {
        ...state,
        lastFetch: { ...state.lastFetch, [action.payload.key]: action.payload.timestamp },
      };
    default:
      return state;
  }
}

// Context创建
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  fetchAccountInfo: (force?: boolean) => Promise<void>;
  fetchPositions: (accountId: string, force?: boolean) => Promise<void>;
  fetchLedger: (accountId: string, force?: boolean) => Promise<void>;
  refreshAll: () => Promise<void>;
} | null>(null);

// Provider组件
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // 缓存时间配置（毫秒）
  const CACHE_DURATION = {
    accountInfo: 5 * 60 * 1000, // 5分钟
    positions: 30 * 1000, // 30秒
    ledger: 30 * 1000, // 30秒
  };

  // 检查是否需要刷新数据
  const shouldRefresh = (key: keyof AppState['lastFetch']): boolean => {
    const lastFetch = state.lastFetch[key];
    if (!lastFetch) return true;
    const now = Date.now();
    const cacheDuration = CACHE_DURATION[key];
    return now - lastFetch > cacheDuration;
  };

  // 获取账户信息
  const fetchAccountInfo = async (force: boolean = false) => {
    if (state.loading.accountInfo) return;
    if (!force && state.accountInfo && !shouldRefresh('accountInfo')) return;
    
    dispatch({ type: 'SET_ACCOUNT_INFO_LOADING', payload: true });
    try {
      const response = await fetch('/api/accountInfo');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      dispatch({ type: 'SET_ACCOUNT_INFO', payload: data });
      dispatch({ type: 'UPDATE_LAST_FETCH', payload: { key: 'accountInfo', timestamp: Date.now() } });
    } catch (error) {
      dispatch({ 
        type: 'SET_ACCOUNT_INFO_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to fetch account info' 
      });
    }
  };

  // 获取持仓信息
  const fetchPositions = async (accountId: string, force: boolean = false) => {
    if (state.loading.positions) return;
    if (!force && state.positions.length > 0 && !shouldRefresh('positions')) return;
    
    dispatch({ type: 'SET_POSITIONS_LOADING', payload: true });
    try {
      const response = await fetch(`/api/positions?accountId=${accountId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      dispatch({ type: 'SET_POSITIONS', payload: Array.isArray(data) ? data : [] });
      dispatch({ type: 'UPDATE_LAST_FETCH', payload: { key: 'positions', timestamp: Date.now() } });
    } catch (error) {
      dispatch({ 
        type: 'SET_POSITIONS_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to fetch positions' 
      });
    }
  };

  // 获取账本信息
  const fetchLedger = async (accountId: string, force: boolean = false) => {
    if (state.loading.ledger) return;
    if (!force && state.ledger && !shouldRefresh('ledger')) return;
    
    dispatch({ type: 'SET_LEDGER_LOADING', payload: true });
    try {
      const response = await fetch(`/api/ledger?accountId=${accountId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      dispatch({ type: 'SET_LEDGER', payload: data });
      dispatch({ type: 'UPDATE_LAST_FETCH', payload: { key: 'ledger', timestamp: Date.now() } });
    } catch (error) {
      dispatch({ 
        type: 'SET_LEDGER_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to fetch ledger' 
      });
    }
  };

  // 初始化时获取账户信息
  useEffect(() => {
    fetchAccountInfo();
  }, []);

  // 当账户信息获取成功后，获取其他数据
  useEffect(() => {
    if (state.accountInfo?.accountId) {
      fetchPositions(state.accountInfo.accountId);
      fetchLedger(state.accountInfo.accountId);
    }
  }, [state.accountInfo?.accountId]);

  // 手动刷新所有数据
  const refreshAll = async () => {
    if (state.accountInfo?.accountId) {
      await Promise.all([
        fetchAccountInfo(true),
        fetchPositions(state.accountInfo.accountId, true),
        fetchLedger(state.accountInfo.accountId, true),
      ]);
    }
  };

  return (
    <AppContext.Provider value={{ state, dispatch, fetchAccountInfo, fetchPositions, fetchLedger, refreshAll }}>
      {children}
    </AppContext.Provider>
  );
}

// Hook用于使用context
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
