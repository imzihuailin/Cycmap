import type { IRoute, EngineType } from '../services/IRouter';

export interface RoutingState {
  /** Current route result */
  route: IRoute | null;
  /** Waypoints as simple lat/lng pairs */
  waypoints: Array<{ lat: number; lng: number }>;
  /** Selected routing engine */
  engine: EngineType;
  /** GraphHopper API key (from env or user input) */
  graphhopperApiKey: string;
  /** Whether the API key modal is open */
  apiKeyModalOpen: boolean;
  /** Whether route calculation is in progress */
  loading: boolean;
  /** Error message if route calculation failed */
  error: string | null;
  /** Whether the route panel is visible */
  panelOpen: boolean;
}

export type RoutingAction =
  | { type: 'SET_ROUTE'; route: IRoute }
  | { type: 'SET_ROUTE_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_WAYPOINTS'; waypoints: Array<{ lat: number; lng: number }> }
  | { type: 'SET_ENGINE'; engine: EngineType }
  | { type: 'SET_GH_API_KEY'; key: string }
  | { type: 'TOGGLE_API_KEY_MODAL'; open?: boolean }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'TOGGLE_PANEL'; open?: boolean };

export function getInitialState(): RoutingState {
  return {
    route: null,
    waypoints: [],
    engine: 'osrm',
    graphhopperApiKey: import.meta.env.VITE_GRAPHOPPER_API_KEY || '',
    apiKeyModalOpen: false,
    loading: false,
    error: null,
    panelOpen: true,
  };
}

export function routingReducer(state: RoutingState, action: RoutingAction): RoutingState {
  switch (action.type) {
    case 'SET_ROUTE':
      return { ...state, route: action.route, loading: false, error: null };
    case 'SET_ROUTE_ERROR':
      return { ...state, error: action.error, loading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_WAYPOINTS':
      return { ...state, waypoints: action.waypoints };
    case 'SET_ENGINE':
      return { ...state, engine: action.engine };
    case 'SET_GH_API_KEY':
      return { ...state, graphhopperApiKey: action.key };
    case 'TOGGLE_API_KEY_MODAL':
      return { ...state, apiKeyModalOpen: action.open ?? !state.apiKeyModalOpen };
    case 'SET_LOADING':
      return { ...state, loading: action.loading, error: null };
    case 'TOGGLE_PANEL':
      return { ...state, panelOpen: action.open ?? !state.panelOpen };
    default:
      return state;
  }
}

/** Persist GraphHopper API key to localStorage */
export function persistApiKey(key: string) {
  try {
    localStorage.setItem('cycmap_gh_key', key);
  } catch {
    // localStorage may be unavailable
  }
}

/** Restore GraphHopper API key from localStorage */
export function restoreApiKey(): string | null {
  try {
    return localStorage.getItem('cycmap_gh_key');
  } catch {
    return null;
  }
}
