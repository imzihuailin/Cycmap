/**
 * IRouter interface — compatible with Leaflet Routing Machine's router expectations.
 * We define our own subset so we don't depend on lrm internals at the type level.
 */

export interface IInstruction {
  type: string;
  text: string;
  distance: number;
  time: number;
  index: number;
}

export interface IRouteSummary {
  totalDistance: number;   // metres
  totalTime: number;       // seconds
  totalAscend: number;     // metres (0 when unavailable)
  totalDescend: number;    // metres (0 when unavailable)
}

export interface IRoute {
  name: string;
  coordinates: Array<{ lat: number; lng: number }>;
  summary: IRouteSummary;
  instructions: IInstruction[];
  waypoints: Array<{ lat: number; lng: number }>;
  inputWaypoints: Array<{ latLng: { lat: number; lng: number }; name?: string }>;
}

export interface IRouter {
  route(
    waypoints: Array<{ latLng: { lat: number; lng: number }; name?: string }>,
    callback: (err: unknown, routes?: IRoute[]) => void,
  ): void;
}

export type EngineType = 'graphhopper' | 'osrm';
