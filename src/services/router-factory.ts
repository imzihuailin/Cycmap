import { GraphHopperRouter } from './graphhopper-router';
import { OSRMRouter } from './osrm-router';
import type { IRouter, EngineType } from './IRouter';

/**
 * Factory that returns the appropriate router based on engine selection.
 * OSRM router is a singleton (no API key needed).
 * GraphHopper router is recreated when the API key changes.
 */
let osrmInstance: OSRMRouter | null = null;

function getOSRM(): OSRMRouter {
  if (!osrmInstance) {
    osrmInstance = new OSRMRouter();
  }
  return osrmInstance;
}

export function createRouter(engine: EngineType, graphhopperApiKey?: string): IRouter {
  switch (engine) {
    case 'graphhopper':
      return new GraphHopperRouter(graphhopperApiKey || '');
    case 'osrm':
      return getOSRM();
    default:
      return getOSRM();
  }
}
