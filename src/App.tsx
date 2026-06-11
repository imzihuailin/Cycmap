import { useReducer, useEffect, useMemo } from 'react';
import { MapView } from './components/MapView';
import { RoutingControl } from './components/RoutingControl';
import { RoutePanel } from './components/RoutePanel';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { createRouter } from './services/router-factory';
import type { EngineType } from './services/IRouter';
import {
  routingReducer,
  getInitialState,
  persistApiKey,
  restoreApiKey,
} from './store/routingState';
import './App.css';

function App() {
  const [state, dispatch] = useReducer(routingReducer, null, () => {
    const initial = getInitialState();
    // Restore saved API key from localStorage
    const savedKey = restoreApiKey();
    if (savedKey) {
      initial.graphhopperApiKey = savedKey;
    }
    return initial;
  });

  // Create router based on current engine and API key
  const router = useMemo(
    () => createRouter(state.engine, state.graphhopperApiKey),
    [state.engine, state.graphhopperApiKey],
  );

  // Initialize GH API key from env or localStorage
  useEffect(() => {
    const envKey = import.meta.env.VITE_GRAPHOPPER_API_KEY;
    if (envKey && !state.graphhopperApiKey) {
      dispatch({ type: 'SET_GH_API_KEY', key: envKey });
      persistApiKey(envKey);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleWaypointsChanged = (
    waypoints: Array<{ lat: number; lng: number }>,
  ) => {
    dispatch({ type: 'SET_WAYPOINTS', waypoints });
  };

  const handleEngineChange = (engine: EngineType) => {
    dispatch({ type: 'SET_ENGINE', engine });
    // Auto-open API key modal when switching to GraphHopper without a key
    if (engine === 'graphhopper' && !state.graphhopperApiKey) {
      dispatch({ type: 'TOGGLE_API_KEY_MODAL', open: true });
    }
  };

  const handleSaveApiKey = (key: string) => {
    dispatch({ type: 'SET_GH_API_KEY', key });
    persistApiKey(key);
  };

  return (
    <div className="app-layout">
      {/* Top toolbar */}
      <div className="toolbar">
        <div className="toolbar__brand">
          <span className="toolbar__logo">🚴</span>
          <span className="toolbar__title">Cycmap</span>
          <span className="toolbar__subtitle">骑行路线规划</span>
        </div>

        <div className="toolbar__center">
          <span style={{ color: '#64748b', fontSize: '12px' }}>提示：点击地图添加途经点，拖拽调整路线</span>
        </div>

        <div className="toolbar__actions">
          {/* Engine selector */}
          <select
            className="toolbar__select"
            value={state.engine}
            onChange={(e) => handleEngineChange(e.target.value as EngineType)}
          >
            <option value="osrm">OSRM (免费)</option>
            <option value="graphhopper">GraphHopper</option>
          </select>

          {/* API Key button (only for GraphHopper) */}
          {state.engine === 'graphhopper' && (
            <button
              className="toolbar__key-btn"
              onClick={() => dispatch({ type: 'TOGGLE_API_KEY_MODAL' })}
              title="设置 API Key"
            >
              🔑 {state.graphhopperApiKey ? '已设置' : '设置 Key'}
            </button>
          )}

          {/* Panel toggle */}
          <button
            className="toolbar__panel-btn"
            onClick={() => dispatch({ type: 'TOGGLE_PANEL' })}
            title={state.panelOpen ? '收起面板' : '展开面板'}
          >
            {state.panelOpen ? '◀' : '▶'}
          </button>
        </div>
      </div>

      {/* Main content: map (left) + panel (right) */}
      <div className={`main-content ${state.panelOpen ? 'main-content--panel-open' : ''}`}>
        <div className="map-wrapper">
          <MapView>
            <RoutingControl
              key={state.engine}
              router={router}
              language="en"
              onWaypointsChanged={handleWaypointsChanged}
              onRouteFound={(route) =>
                dispatch({ type: 'SET_ROUTE', route })
              }
              onRouteError={(error) =>
                dispatch({ type: 'SET_ROUTE_ERROR', error })
              }
              onRoutingStart={() =>
                dispatch({ type: 'SET_LOADING', loading: true })
              }
            />
          </MapView>
        </div>

        {state.panelOpen && (
          <div className="panel-wrapper">
            <RoutePanel
              route={state.route}
              loading={state.loading}
              error={state.error}
              panelOpen={state.panelOpen}
            />
          </div>
        )}
      </div>

      {/* API Key Modal */}
      <ApiKeyModal
        open={state.apiKeyModalOpen}
        apiKey={state.graphhopperApiKey}
        onSave={handleSaveApiKey}
        onClose={() => dispatch({ type: 'TOGGLE_API_KEY_MODAL', open: false })}
      />
    </div>
  );
}

export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
