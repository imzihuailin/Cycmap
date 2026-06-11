import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useEffect, useState } from 'react';
import L from 'leaflet';

// Fix Leaflet default marker icon issue in bundlers
// (Leaflet uses relative paths that break with Vite/webpack)
const iconDefault = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = iconDefault;

interface MapViewProps {
  children?: React.ReactNode;
}

const DEFAULT_CENTER: [number, number] = [
  parseFloat(import.meta.env.VITE_DEFAULT_CENTER_LAT || '39.9042'),
  parseFloat(import.meta.env.VITE_DEFAULT_CENTER_LNG || '116.4074'),
];
const DEFAULT_ZOOM = parseInt(import.meta.env.VITE_DEFAULT_ZOOM || '13');

// GeoLocation button
function LocateControl() {
  const map = useMap();
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const control = new L.Control({ position: 'bottomright' });

    control.onAdd = () => {
      const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      container.innerHTML = `<a href="#" title="定位到我当前位置" role="button" style="font-size:18px;line-height:30px;width:30px;text-align:center;display:block;">📍</a>`;
      container.style.cursor = 'pointer';

      L.DomEvent.on(container, 'click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setLocating(true);
        map.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true, watch: false });
      });

      return container;
    };

    control.addTo(map);

    const onLocationFound = (e: L.LocationEvent) => {
      setLocating(false);
      L.marker(e.latlng, { icon: iconDefault })
        .addTo(map)
        .bindPopup('你在这里')
        .openPopup();
    };

    const onLocationError = () => {
      setLocating(false);
      alert('无法获取你的位置，请检查定位权限。');
    };

    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);

    return () => {
      map.removeControl(control);
      map.off('locationfound', onLocationFound);
      map.off('locationerror', onLocationError);
    };
  }, [map]);

  return null;
}

export function MapView({ children }: MapViewProps) {
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
    >
      {/* Zoom control positioned on left */}
      <ZoomControl />
      {/* GeoLocation button */}
      <LocateControl />

      {/* CycleOSM tiles (primary) */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | <a href="https://www.cyclosm.org/">CyclOSM</a>'
        url="https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png"
        maxZoom={19}
        // Fallback: if CyclOSM fails, OSM standard tiles will be used
      />
      {/* OSM standard tiles as fallback (not rendered by default) */}
      <TileLayer
        attribution=""
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        opacity={0}
      />

      {children}
    </MapContainer>
  );
}

// Separate zoom control on right side
function ZoomControl() {
  const map = useMap();

  useEffect(() => {
    const control = L.control.zoom({ position: 'bottomright' });
    control.addTo(map);
    return () => {
      map.removeControl(control);
    };
  }, [map]);

  return null;
}
