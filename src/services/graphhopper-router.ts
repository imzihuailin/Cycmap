/**
 * Leaflet Routing Machine IRouter implementation for GraphHopper Directions API.
 * 
 * GraphHopper API reference:
 *   GET https://graphhopper.com/api/1/route
 *   ?point=lat,lng&point=lat,lng&...&vehicle=bike&locale=zh-CN&key=API_KEY
 *   &elevation=true&points_encoded=false&instructions=true
 */

import type { IRouter, IRoute, IInstruction } from './IRouter';

interface GraphHopperResponse {
  paths?: Array<{
    distance: number;
    time: number;
    ascend: number;
    descend: number;
    points: {
      type: string;
      coordinates: Array<[number, number, number?]>;
    };
    instructions?: Array<{
      distance: number;
      time: number;
      text: string;
      sign: number;
      interval: [number, number];
    }>;
    bbox: [number, number, number, number];
  }>;
}

export class GraphHopperRouter implements IRouter {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  route(
    waypoints: Array<{ latLng: { lat: number; lng: number }; name?: string }>,
    callback: (err: unknown, routes?: IRoute[]) => void,
  ): void {
    if (!this.apiKey) {
      callback(new Error('GraphHopper API Key 未设置。请在设置中配置 API Key，或切换到 OSRM 引擎。'));
      return;
    }

    if (waypoints.length < 2) {
      callback(new Error('请至少设置起点和终点。'));
      return;
    }

    // Build GraphHopper API URL
    const points = waypoints
      .map((wp) => `point=${wp.latLng.lat},${wp.latLng.lng}`)
      .join('&');

    const url = `https://graphhopper.com/api/1/route?${points}&vehicle=bike&locale=zh-CN&key=${this.apiKey}&elevation=true&points_encoded=false&instructions=true&type=json`;

    fetch(url)
      .then((res) => {
        if (!res.ok) {
          // Capture rate limit headers
          const remaining = res.headers.get('X-RateLimit-Remaining');
          const credits = res.headers.get('X-RateLimit-Credits');
          return res.json().then((body) => {
            const msg = body?.message || res.statusText;
            const suffix = remaining !== null ? ` (剩余额度: ${remaining})` : '';
            throw new Error(`GraphHopper API 错误 (${res.status}): ${msg}${suffix}`);
          });
        }
        return res.json() as Promise<GraphHopperResponse>;
      })
      .then((data) => {
        if (!data.paths || data.paths.length === 0) {
          callback(new Error('未找到骑行路线，请检查起终点是否可达。'));
          return;
        }

        const path = data.paths[0];
        const coordinates = path.points.coordinates.map(
          ([lng, lat]: [number, number, number?]) => ({ lat, lng }),
        );

        const instructions: IInstruction[] = (path.instructions || []).map((inst, i) => ({
          type: getInstructionType(inst.sign),
          text: inst.text,
          distance: inst.distance,
          time: inst.time,
          index: inst.interval[0],
        }));

        const route: IRoute = {
          name: '骑行路线',
          coordinates,
          summary: {
            totalDistance: path.distance,
            totalTime: path.time / 1000, // ms → seconds
            totalAscend: path.ascend,
            totalDescend: path.descend,
          },
          instructions,
          waypoints: waypoints.map((wp) => wp.latLng),
          inputWaypoints: waypoints,
        };

        callback(null, [route]);
      })
      .catch((err) => {
        callback(err);
      });
  }
}

function getInstructionType(sign: number): string {
  // GraphHopper instruction signs mapping
  // https://docs.graphhopper.com/#tag/Routing-API
  const types: Record<number, string> = {
    [-98]: 'U-Turn',
    [-8]: 'U-Turn',
    [-7]: 'KeepLeft',
    [-6]: 'LeaveRoundabout',
    [-3]: 'SharpLeft',
    [-2]: 'Left',
    [-1]: 'SlightLeft',
    0: 'Straight',
    1: 'SlightRight',
    2: 'Right',
    3: 'SharpRight',
    4: 'DestinationReached',
    5: 'Roundabout',
    6: 'EnterRoundabout',
    7: 'KeepRight',
  };
  return types[sign] || 'Straight';
}
