/**
 * pages/MapView/index.jsx
 * Leaflet map showing nearby open requests.
 * User clicks the map or enters lat/lng to search a location.
 */
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { requestService } from '../../api/services';
import Spinner from '../../components/common/Spinner';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

// Fix Leaflet's default icon paths in Vite
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

const urgencyColor = { low: '#71717a', medium: '#0ea5e9', high: '#f59e0b' };

const LocationPicker = ({ onPick }) => {
  useMapEvents({ click(e) { onPick(e.latlng); } });
  return null;
};

const MapView = () => {
  const [center, setCenter] = useState({ lat: 12.9716, lng: 77.5946 });
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [distance, setDistance] = useState(10);

  const search = useCallback(async (coords) => {
    setLoading(true);
    try {
      const res = await requestService.nearby({
        lat: coords.lat,
        lng: coords.lng,
        distance,
      });
      setRequests(res.data.data.data);
      if (res.data.data.data.length === 0) toast('No open requests in this area.', { icon: '📍' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [distance]);

  // Locate the user on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCenter(coords);
          search(coords);
        },
        () => search(center) // fallback to Bangalore
      );
    } else {
      search(center);
    }
  }, []);

  const handlePick = (latlng) => {
    setCenter({ lat: latlng.lat, lng: latlng.lng });
    search({ lat: latlng.lat, lng: latlng.lng });
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Heading — slate-800 in light, white in dark */}
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Map</h1>
        <div className="flex items-center gap-2">
          {/* Radius label — slate-500 in light, zinc-400 in dark */}
          <label className="text-sm text-slate-500 dark:text-zinc-400">Radius:</label>
          {/* Select — white bg with slate border in light; surface-raised in dark */}
          <select
            value={distance}
            onChange={(e) => setDistance(Number(e.target.value))}
            className="rounded-lg px-2 py-1.5 text-sm bg-white text-slate-800 border border-slate-200 dark:bg-surface-raised dark:border-white/[0.08] dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
          >
            {[5, 10, 25, 50].map((d) => (
              <option key={d} value={d}>{d} km</option>
            ))}
          </select>
          <Button size="sm" loading={loading} onClick={() => search(center)}>Search here</Button>
        </div>
      </div>

      {/* Helper text — slate-500 in light, zinc-500 in dark */}
      <p className="text-xs text-slate-500 dark:text-zinc-500">Click anywhere on the map to search nearby requests at that location.</p>

      {/* Map container */}
      <div className="flex-1 rounded-lg overflow-hidden border border-slate-200 dark:border-white/[0.08]" style={{ minHeight: '400px' }}>
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={13}
          className="h-full w-full"
          style={{ height: '500px' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationPicker onPick={handlePick} />

          {requests.map((r) => {
            // GeoJSON stores coordinates as [lng, lat] — swap to [lat, lng] for Leaflet
            const [lng, lat] = r.location.coordinates;
            return (
              <Marker key={r._id} position={[lat, lng]}>
                <Popup>
                  <div className="space-y-1 min-w-[160px]">
                    <p className="font-semibold text-sm">{r.title}</p>
                    <p className="text-xs text-gray-500 capitalize">{r.category.replace('_', ' ')} · {r.urgency}</p>
                    <Link
                      to={`/requests/${r._id}`}
                      className="inline-block mt-2 text-xs bg-blue-500 text-white rounded px-2 py-1"
                    >
                      View request →
                    </Link>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Results list below map */}
      {requests.length > 0 && (
        <div>
          {/* Count label — slate-500 in light, zinc-400 in dark */}
          <p className="text-sm text-slate-500 dark:text-zinc-400 mb-2">{requests.length} request(s) found</p>
          <ul className="space-y-2">
            {requests.map((r) => (
              <li key={r._id}>
                <Link
                  to={`/requests/${r._id}`}
                  className="card p-3 flex items-center justify-between hover:border-brand-500/50 transition-colors block"
                >
                  <div>
                    {/* Request title — slate-800 in light, white in dark */}
                    <p className="font-medium text-sm text-slate-800 dark:text-white">{r.title}</p>
                    {/* Address — slate-500 in light, zinc-400 in dark */}
                    <p className="text-xs text-slate-500 dark:text-zinc-400">{r.location?.address || 'No address'}</p>
                  </div>
                  <span
                    className="badge text-white"
                    style={{ background: urgencyColor[r.urgency] }}
                  >
                    {r.urgency}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MapView;
