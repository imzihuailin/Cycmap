import type { IRoute } from '../services/IRouter';

interface RoutePanelProps {
  route: IRoute | null;
  loading: boolean;
  error: string | null;
  panelOpen: boolean;
}

export function RoutePanel({ route, loading, error, panelOpen }: RoutePanelProps) {
  const isOpen = panelOpen && (!!route || loading || !!error);

  return (
    <div className={`route-panel ${isOpen ? 'route-panel--open' : ''}`}>
      {!isOpen && (
        <div className="route-panel__empty">
          <div className="route-panel__empty-icon">🚴</div>
          <p>在地图上点击设置起点，<br />然后添加途经点和终点</p>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>
            支持拖拽途经点调整路线
          </p>
        </div>
      )}

      {loading && (
        <div className="route-panel__loading">
          <div className="spinner" />
          <p>正在计算路线...</p>
        </div>
      )}

      {error && (
        <div className="route-panel__error">
          <span>❌ {error}</span>
        </div>
      )}

      {route && !loading && (
        <div className="route-panel__content">
          <h3 className="route-panel__title">{route.name}</h3>

          {/* Summary cards */}
          <div className="route-panel__stats">
            <StatCard label="总距离" value={formatDistance(route.summary.totalDistance)} />
            <StatCard label="预计时间" value={formatTime(route.summary.totalTime)} />
            {route.summary.totalAscend > 0 && (
              <StatCard label="累计爬升" value={`${Math.round(route.summary.totalAscend)} m`} />
            )}
          </div>

          {/* Elevation profile */}
          {route.coordinates.some((c) => 'elev' in c && (c as { elev?: number }).elev !== undefined) && (
            <ElevationProfile coordinates={route.coordinates} />
          )}

          {/* Turn-by-turn instructions */}
          {route.instructions.length > 0 && (
            <div className="route-panel__instructions">
              <h4>分段指引</h4>
              <ol>
                {route.instructions.map((inst, i) => (
                  <li key={i} className="instruction-item">
                    <span className="instruction-item__icon">{getInstructionIcon(inst.type)}</span>
                    <span className="instruction-item__text">
                      {inst.text || inst.type}
                    </span>
                    <span className="instruction-item__distance">
                      {formatDistance(inst.distance)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Waypoints list */}
          <div className="route-panel__waypoints">
            <h4>途经点</h4>
            <ol>
              {route.inputWaypoints?.map((wp, i) => (
                <li key={i}>
                  {i === 0 ? '🚩 起点' : i === route.inputWaypoints!.length - 1 ? '🏁 终点' : `📍 途经点 ${i}`}
                  <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: '4px' }}>
                    ({wp.latLng.lat.toFixed(5)}, {wp.latLng.lng.toFixed(5)})
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <span className="stat-card__value">{value}</span>
      <span className="stat-card__label">{label}</span>
    </div>
  );
}

/** Elevation profile as a simple SVG line chart */
function ElevationProfile({ 
  coordinates 
}: { 
  coordinates: Array<{ lat: number; lng: number } & Record<string, unknown>> 
}) {
  // Extract elevation data
  const elevData = coordinates
    .map((c) => {
      const elev = (c as { elev?: number }).elev;
      return elev !== undefined ? elev : NaN;
    })
    .filter((e) => !isNaN(e));

  if (elevData.length < 2) return null;

  const width = 280;
  const height = 80;
  const padding = 4;
  const maxElev = Math.max(...elevData);
  const minElev = Math.min(...elevData);
  const range = maxElev - minElev || 1;

  const points = elevData.map((e, i) => {
    const x = padding + (i / (elevData.length - 1)) * (width - 2 * padding);
    const y = padding + ((maxElev - e) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  const totalDist = coordinates.length > 0 
    ? Math.round(coordinates.length * 0.01)
    : 0;

  return (
    <div className="elevation-profile">
      <h4>高程曲线</h4>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
        <polyline
          points={points}
          fill="none"
          stroke="#2563eb"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <div className="elevation-profile__labels">
        <span>{Math.round(maxElev)} m</span>
        <span>{Math.round(minElev)} m</span>
      </div>
    </div>
  );
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) {
    return `${h} 小时 ${m} 分钟`;
  }
  return `${m} 分钟`;
}

function getInstructionIcon(type: string): string {
  const icons: Record<string, string> = {
    Left: '⬅️',
    Right: '➡️',
    SharpLeft: '↖️',
    SharpRight: '↗️',
    SlightLeft: '↩️',
    SlightRight: '↪️',
    Straight: '⬆️',
    UTurn: '🔄',
    DestinationReached: '🏁',
    Roundabout: '🔃',
    EnterRoundabout: '🔃',
    LeaveRoundabout: '🔃',
    KeepLeft: '👈',
    KeepRight: '👉',
    arrive: '🏁',
    depart: '🚩',
    turn: '↗️',
    'new name': '↗️',
    roundabout: '🔃',
    'exit roundabout': '🔃',
    notification: '⬆️',
  };
  return icons[type] || '↗️';
}
