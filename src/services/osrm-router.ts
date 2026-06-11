/**
 * Leaflet Routing Machine IRouter implementation for OSRM demo server.
 * Free, no API key required.
 * 
 * OSRM API reference:
 *   GET https://router.project-osrm.org/route/v1/bike/lng1,lat1;lng2,lat2;...
 *   ?overview=full&geometries=geojson&steps=true&alternatives=false
 */

import type { IRouter, IRoute, IInstruction } from './IRouter';

interface OSRMResponse {
  code: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: {
      type: string;
      coordinates: Array<[number, number]>;
    };
    legs?: Array<{
      distance: number;
      duration: number;
      steps: Array<{
        distance: number;
        duration: number;
        name: string;
        maneuver: {
          type: string;
          modifier?: string;
          location: [number, number];
        };
      }>;
    }>;
  }>;
  message?: string;
}

export class OSRMRouter implements IRouter {
  route(
    waypoints: Array<{ latLng: { lat: number; lng: number }; name?: string }>,
    callback: (err: unknown, routes?: IRoute[]) => void,
  ): void {
    if (waypoints.length < 2) {
      callback(new Error('请至少设置起点和终点。'));
      return;
    }

    // OSRM expects lng,lat order
    const coords = waypoints
      .map((wp) => `${wp.latLng.lng},${wp.latLng.lat}`)
      .join(';');

    const url = `https://router.project-osrm.org/route/v1/bike/${coords}?overview=full&geometries=geojson&steps=true&alternatives=false`;

    fetch(url)
      .then((res) => {
        if (!res.ok) {
          return res.text().then((body) => {
            throw new Error(`OSRM API 错误 (${res.status}): ${body}`);
          });
        }
        return res.json() as Promise<OSRMResponse>;
      })
      .then((data) => {
        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
          const msg = data.message || '未找到骑行路线';
          callback(new Error(`OSRM 路线计算失败: ${msg}`));
          return;
        }

        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map(
          ([lng, lat]: [number, number]) => ({ lat, lng }),
        );

        let instructions: IInstruction[] = [];
        if (route.legs) {
          let stepIndex = 0;
          for (const leg of route.legs) {
            for (const step of leg.steps) {
              instructions.push({
                type: step.maneuver.type,
                text: step.name || getOSRMDirectionText(step.maneuver),
                distance: step.distance,
                time: step.duration,
                index: stepIndex++,
              });
            }
          }
        }

        const result: IRoute = {
          name: '骑行路线 (OSRM)',
          coordinates,
          summary: {
            totalDistance: route.distance,
            totalTime: route.duration,
            totalAscend: 0,
            totalDescend: 0,
          },
          instructions,
          waypoints: waypoints.map((wp) => wp.latLng),
          inputWaypoints: waypoints,
        };

        callback(null, [result]);
      })
      .catch((err) => {
        callback(err);
      });
  }
}

function getOSRMDirectionText(maneuver: {
  type: string;
  modifier?: string;
}): string {
  const modifiers: Record<string, string> = {
    'uturn': '掉头',
    'sharp right': '急右转',
    'right': '右转',
    'slight right': '稍向右转',
    'straight': '直行',
    'slight left': '稍向左转',
    'left': '左转',
    'sharp left': '急左转',
  };

  const typeMap: Record<string, string> = {
    'arrive': '到达目的地',
    'depart': '出发',
    'roundabout': '进入环岛',
    'exit roundabout': '离开环岛',
    'notification': '继续',
    'new name': '道路名称变更',
  };

  if (maneuver.type === 'turn' && maneuver.modifier) {
    return modifiers[maneuver.modifier] || maneuver.modifier;
  }
  return typeMap[maneuver.type] || maneuver.type;
}
