import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import type { IRouter } from '../services/IRouter';
import type { IRoute } from '../services/IRouter';

interface RoutingControlProps {
  router: IRouter;
  language?: string;
  lineOptions?: L.Routing.LineOptions;
  onWaypointsChanged?: (waypoints: Array<{ lat: number; lng: number }>) => void;
  onRouteFound?: (route: IRoute) => void;
  onRouteError?: (error: string) => void;
  onRoutingStart?: () => void;
}

const DEFAULT_LINE_OPTIONS: L.Routing.LineOptions = {
  styles: [{ color: '#2563eb', weight: 5 }],
  extendToWaypoints: true,
  missingRouteTolerance: 10,
  missingRouteStyles: [{ color: '#ef4444', weight: 3 }],
};

function createPlanOptions() {
  return {
    addWaypoints: true,
    draggableWaypoints: true,
    routeWhileDragging: true,
    language: 'zh-CN',
    createMarker: (i: number, wp: L.Routing.Waypoint) => {
      const icon = i === 0 ? '🚩' : '📍';
      return L.marker(wp.latLng, {
        icon: L.divIcon({
          html: `<div style="font-size:22px;line-height:1;">${icon}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28],
          className: '',
        }),
        draggable: true,
      });
    },
  };
}

export function RoutingControl({
  router,
  language = 'zh-CN',
  lineOptions,
  onWaypointsChanged,
  onRouteFound,
  onRouteError,
  onRoutingStart,
}: RoutingControlProps) {
  const map = useMap();
  const controlRef = useRef<L.Routing.Control | null>(null);
  const mountedRef = useRef(false);

  // Helper to create and add a control with event handlers
  function createAndAddControl() {
    const controlOpts = {
      router: router as unknown as L.Routing.IRouter,
      routeWhileDragging: true,
      showAlternatives: false,
      fitSelectedRoutes: true,
      language,
      lineOptions: lineOptions || DEFAULT_LINE_OPTIONS,
      plan: L.Routing.plan([], createPlanOptions()),
    } as L.Routing.RoutingControlOptions;

    const ctrl = L.Routing.control(controlOpts);
    ctrl.addTo(map);

    // Waypoints changed
    if (onWaypointsChanged) {
      ctrl.on('waypointschanged', (e: unknown) => {
        const evt = e as { waypoints?: Array<{ latLng: L.LatLng }> };
        if (evt.waypoints) {
          onWaypointsChanged(evt.waypoints.map((wp) => ({ lat: wp.latLng.lat, lng: wp.latLng.lng })));
        }
      });
    }

    // Route found
    if (onRouteFound) {
      ctrl.on('routesfound', (e: unknown) => {
        const evt = e as { routes?: Array<{
          name?: string;
          coordinates?: Array<{ lat: number; lng: number }>;
          summary?: { totalDistance: number; totalTime: number };
          instructions?: Array<{
            type: string; text: string; distance: number; time: number; index: number;
          }>;
          waypoints?: Array<{ lat: number; lng: number }>;
          inputWaypoints?: Array<{ latLng: { lat: number; lng: number }; name?: string }>;
        }> };

        if (evt.routes && evt.routes.length > 0) {
          const r = evt.routes[0];
          // LRM provides routes in its internal format — extract what we need
          const route: IRoute = {
            name: r.name || '骑行路线',
            coordinates: r.coordinates || [],
            summary: {
              totalDistance: r.summary?.totalDistance || 0,
              totalTime: r.summary?.totalTime || 0,
              totalAscend: (r.summary as Record<string, unknown>)?.totalAscend as number || 0,
              totalDescend: (r.summary as Record<string, unknown>)?.totalDescend as number || 0,
            },
            instructions: (r.instructions || []).map((inst, idx) => ({
              type: inst.type || 'Straight',
              text: inst.text || '',
              distance: inst.distance || 0,
              time: inst.time || 0,
              index: inst.index || idx,
            })),
            waypoints: r.waypoints || [],
            inputWaypoints: (r.inputWaypoints || (r.waypoints || []).map((wp) => ({
              latLng: { lat: wp.lat, lng: wp.lng },
            }))),
          };
          onRouteFound(route);
        }
      });
    }

    // Route error
    if (onRouteError) {
      ctrl.on('routingerror', (e: unknown) => {
        const evt = e as { error?: { message?: string } };
        onRouteError(evt.error?.message || '路线计算失败');
      });
    }

    // Routing start
    if (onRoutingStart) {
      ctrl.on('routingstart', () => {
        onRoutingStart();
      });
    }

    return ctrl;
  }

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    // Load LRM CSS
    const linkEl = document.createElement('link');
    linkEl.rel = 'stylesheet';
    linkEl.href = 'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css';
    document.head.appendChild(linkEl);

    controlRef.current = createAndAddControl();

    return () => {
      /* keep mounted — StrictMode */
    };
  }, []); // eslint-disable-line

  // Recreate on engine/router change
  useEffect(() => {
    if (!controlRef.current) return;
    const old = controlRef.current;
    try { map.removeControl(old); } catch { /* */ }
    controlRef.current = createAndAddControl();
  }, [router]); // eslint-disable-line

  return null;
}
