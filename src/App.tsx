import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L, { type LatLngExpression, type LeafletMouseEvent } from 'leaflet';

type ServiceType = 'water' | 'meal' | 'lodging' | null;

interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  name: string;
  serviceType: ServiceType;
}

interface RouteResult {
  coordinates: Array<[number, number]>;
  distance: number;
  duration: number;
}

const DEFAULT_CENTER: LatLngExpression = [39.9042, 116.4074];
const DEFAULT_ZOOM = 13;

const serviceOptions: Array<{ type: Exclude<ServiceType, null>; label: string; icon: string }> = [
  { type: 'water', label: '水', icon: '💧' },
  { type: 'meal', label: '饭', icon: '🍚' },
  { type: 'lodging', label: '住宿', icon: '🛏' },
];

const serviceIcons: Record<Exclude<ServiceType, null>, string> = {
  water: '💧',
  meal: '🍚',
  lodging: '🛏',
};

function getWaypointIcon(serviceType: ServiceType) {
  if (serviceType) {
    return L.divIcon({
      className: `waypoint-marker waypoint-marker--${serviceType}`,
      html: `<span>${serviceIcons[serviceType]}</span>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }
  return L.divIcon({
    className: 'waypoint-marker',
    html: '<span></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function makeWaypoint(lat: number, lng: number): Waypoint {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    lat,
    lng,
    name: '',
    serviceType: null,
  };
}

function getWaypointRole(index: number, total: number) {
  if (index === 0) return '起';
  if (index === total - 1) return '终';
  return `途 ${index}`;
}

function getDefaultWaypointName(index: number, total: number) {
  if (index === 0) return '起点';
  if (index === total - 1) return '终点';
  return `途经点 ${index}`;
}

function formatDistance(meters: number) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours > 0) return `${hours} 小时 ${minutes} 分`;
  return `${minutes} 分`;
}

function distanceToSegmentSquared(
  point: Pick<Waypoint, 'lat' | 'lng'>,
  start: Pick<Waypoint, 'lat' | 'lng'>,
  end: Pick<Waypoint, 'lat' | 'lng'>,
) {
  const x = point.lng;
  const y = point.lat;
  const x1 = start.lng;
  const y1 = start.lat;
  const x2 = end.lng;
  const y2 = end.lat;
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return (x - x1) ** 2 + (y - y1) ** 2;
  }

  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  const projectedX = x1 + t * dx;
  const projectedY = y1 + t * dy;
  return (x - projectedX) ** 2 + (y - projectedY) ** 2;
}

function findInsertionIndex(waypoints: Waypoint[], point: Pick<Waypoint, 'lat' | 'lng'>) {
  let bestIndex = waypoints.length - 1;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < waypoints.length - 1; index += 1) {
    const distance = distanceToSegmentSquared(point, waypoints[index], waypoints[index + 1]);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index + 1;
    }
  }

  return bestIndex;
}

async function fetchOsrmRoute(waypoints: Waypoint[]): Promise<RouteResult> {
  const coords = waypoints.map((point) => `${point.lng},${point.lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/bike/${coords}?overview=full&geometries=geojson&steps=false&alternatives=false`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`OSRM 请求失败：${response.status}`);
  }

  const data = await response.json() as {
    code?: string;
    message?: string;
    routes?: Array<{
      distance: number;
      duration: number;
      geometry: { coordinates: Array<[number, number]> };
    }>;
  };

  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error(data.message || '没有找到可用路线');
  }

  const route = data.routes[0];
  return {
    coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distance: route.distance,
    duration: route.duration,
  };
}

function MapClickHandler({
  adding,
  onAdd,
}: {
  adding: boolean;
  onAdd: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      if (!adding) return;
      onAdd(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function AddWaypointButton({
  adding,
  onToggle,
}: {
  adding: boolean;
  onToggle: () => void;
}) {
  const guardRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const onToggleRef = useRef(onToggle);

  // 保持回调引用最新
  useEffect(() => {
    onToggleRef.current = onToggle;
  });

  useEffect(() => {
    const guard = guardRef.current;
    const btn = buttonRef.current;
    if (!guard) return;

    // 冒泡阶段拦截 guard 上的事件，阻止继续冒泡到 Leaflet
    // 使用冒泡阶段确保按钮的 click 处理器先执行完
    const block = (e: Event) => {
      e.stopPropagation();
    };

    guard.addEventListener('click', block);
    guard.addEventListener('dblclick', block);
    guard.addEventListener('mousedown', block);

    // 按钮原生 click 处理切换
    const handleButtonClick = () => {
      onToggleRef.current();
    };

    if (btn) {
      btn.addEventListener('click', handleButtonClick);
    }

    return () => {
      guard.removeEventListener('click', block);
      guard.removeEventListener('dblclick', block);
      guard.removeEventListener('mousedown', block);
      if (btn) {
        btn.removeEventListener('click', handleButtonClick);
      }
    };
  }, []);

  return (
    <div
      ref={guardRef}
      className={`map-click-guard map-click-guard--add${adding ? ' map-click-guard--active' : ''}`}
    >
      <button
        ref={buttonRef}
        className={`map-control map-control--add ${adding ? 'is-active' : ''}`}
        title={adding ? '取消添加途经点' : '添加途经点'}
        aria-pressed={adding}
      >
        🚩
      </button>
    </div>
  );
}

function ZoomButtons() {
  const map = useMap();
  const stopMapClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      className="map-control map-control--zoom"
      aria-label="地图缩放"
      onClick={stopMapClick}
      onDoubleClick={stopMapClick}
      onMouseDown={stopMapClick}
    >
      <button onClick={() => map.zoomIn()} title="放大">+</button>
      <button onClick={() => map.zoomOut()} title="缩小">-</button>
    </div>
  );
}

function App() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingWaypoint, setAddingWaypoint] = useState(false);
  const [editingWaypointId, setEditingWaypointId] = useState<string | null>(null);

  const routeLine = useMemo(() => route?.coordinates || [], [route]);

  const addWaypoint = useCallback((lat: number, lng: number) => {
    setWaypoints((current) => [...current, makeWaypoint(lat, lng)]);
  }, []);

  const insertWaypointOnRoute = useCallback((event: LeafletMouseEvent) => {
    L.DomEvent.stopPropagation(event.originalEvent);
    setWaypoints((current) => {
      if (current.length < 2) return current;
      const next = [...current];
      const insertAt = findInsertionIndex(current, event.latlng);
      next.splice(insertAt, 0, makeWaypoint(event.latlng.lat, event.latlng.lng));
      return next;
    });
  }, []);

  const updateWaypointPosition = useCallback((id: string, lat: number, lng: number) => {
    setWaypoints((current) =>
      current.map((point) => point.id === id ? { ...point, lat, lng } : point),
    );
  }, []);

  const updateServiceType = useCallback((id: string, serviceType: ServiceType) => {
    setWaypoints((current) =>
      current.map((point) =>
        point.id === id
          ? { ...point, serviceType: point.serviceType === serviceType ? null : serviceType }
          : point,
      ),
    );
  }, []);

  const updateWaypointName = useCallback((id: string, name: string) => {
    setWaypoints((current) =>
      current.map((point) => point.id === id ? { ...point, name: name.trim() } : point),
    );
  }, []);

  const clearRoute = () => {
    setWaypoints([]);
    setRoute(null);
    setError(null);
    setAddingWaypoint(false);
    setEditingWaypointId(null);
  };

  useEffect(() => {
    let cancelled = false;

    if (waypoints.length < 2) {
      setRoute(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    fetchOsrmRoute(waypoints)
      .then((result) => {
        if (!cancelled) setRoute(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setRoute(null);
          setError(err instanceof Error ? err.message : '路线计算失败');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [waypoints]);

  return (
    <div className="app">
      <main className="map-pane" aria-label="地图">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          zoomControl={false}
          wheelPxPerZoomLevel={140}
          className={`map ${addingWaypoint ? 'map--adding' : ''}`}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | <a href="https://www.cyclosm.org/">CyclOSM</a>'
            url="https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <MapClickHandler adding={addingWaypoint} onAdd={addWaypoint} />
          {waypoints.map((point) => (
            <Marker
              key={point.id}
              position={[point.lat, point.lng]}
              icon={getWaypointIcon(point.serviceType)}
              draggable
              eventHandlers={{
                dragend(event) {
                  const marker = event.target as L.Marker;
                  const next = marker.getLatLng();
                  updateWaypointPosition(point.id, next.lat, next.lng);
                },
              }}
            />
          ))}
          {routeLine.length > 0 && (
            <Polyline
              positions={routeLine}
              pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.9 }}
              eventHandlers={{ click: insertWaypointOnRoute }}
            />
          )}
          <AddWaypointButton
            adding={addingWaypoint}
            onToggle={() => setAddingWaypoint((current) => !current)}
          />
          <ZoomButtons />
        </MapContainer>
      </main>

      <aside className="sidebar">
        <div className="sidebar-header">
          <div>
            <h1>Cycmap</h1>
            <p>点击地图右上角小旗后，再在地图上添加起点、途经点和终点。</p>
          </div>
          <button className="plain-button" onClick={clearRoute} disabled={waypoints.length === 0}>
            清空
          </button>
        </div>

        <section className="summary">
          <div>
            <span>距离</span>
            <strong>{route ? formatDistance(route.distance) : '--'}</strong>
          </div>
          <div>
            <span>时间</span>
            <strong>{route ? formatDuration(route.duration) : '--'}</strong>
          </div>
        </section>

        {loading && <p className="status">正在计算路线...</p>}
        {error && <p className="status status--error">{error}</p>}

        <section className="waypoint-list">
          {waypoints.length === 0 && (
            <div className="empty-state">
              点击地图右上角小旗进入添加模式，再点击地图添加起点。
            </div>
          )}
          {waypoints.map((point, index) => {
            const fallbackName = getDefaultWaypointName(index, waypoints.length);
            const displayName = point.name || fallbackName;
            const editing = editingWaypointId === point.id;

            return (
            <div className="waypoint-row" key={point.id}>
              <span className="role-badge">{getWaypointRole(index, waypoints.length)}</span>
              <div className="waypoint-main">
                {editing ? (
                  <input
                    className="rename-input"
                    defaultValue={displayName}
                    autoFocus
                    onBlur={(event) => {
                      updateWaypointName(point.id, event.target.value);
                      setEditingWaypointId(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        updateWaypointName(point.id, event.currentTarget.value);
                        setEditingWaypointId(null);
                      }
                      if (event.key === 'Escape') {
                        setEditingWaypointId(null);
                      }
                    }}
                  />
                ) : (
                  <div className="waypoint-title">
                    <strong>{displayName}</strong>
                    <button
                      className="rename-button"
                      onClick={() => setEditingWaypointId(point.id)}
                      title="重命名"
                      aria-label="重命名"
                    >
                      ✎
                    </button>
                  </div>
                )}
                <span>{point.lat.toFixed(5)}, {point.lng.toFixed(5)}</span>
              </div>
              <div className="service-buttons">
                {serviceOptions.map((option) => (
                  <button
                    key={option.type}
                    className={point.serviceType === option.type ? 'active' : ''}
                    onClick={() => updateServiceType(point.id, option.type)}
                    title={option.label}
                    aria-label={option.label}
                  >
                    {option.icon}
                  </button>
                ))}
              </div>
            </div>
            );
          })}
        </section>

        <button className="print-button" onClick={() => window.print()} disabled={waypoints.length === 0}>
          导出手卡
        </button>

        <section className="print-card" aria-label="骑行手卡">
          <h2>骑行手卡</h2>
          <div className="print-summary">
            <span>距离：{route ? formatDistance(route.distance) : '--'}</span>
            <span>时间：{route ? formatDuration(route.duration) : '--'}</span>
          </div>
          {waypoints.map((point, index) => {
            const service = serviceOptions.find((option) => option.type === point.serviceType);
            return (
              <div className="print-row" key={point.id}>
                <strong>{getWaypointRole(index, waypoints.length)}</strong>
                <span>{point.name || getDefaultWaypointName(index, waypoints.length)}</span>
                <em>{service ? `${service.icon} ${service.label}` : ''}</em>
              </div>
            );
          })}
        </section>
      </aside>
    </div>
  );
}

export default App;
