```
import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Clock, Music, Coffee, Trees, Activity } from 'lucide-react';
import L from 'leaflet';

// Fix for default marker icon in Leaflet with Webpack/Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Types
interface Place {
    id: number;
    name: string;
    type: string;
    lat: number;
    lng: number;
    address: string;
    rating: number;
    estimated_walk_time?: string; // Optional for now
}

interface Soundtrack {
    title: string;
    description: string;
}

interface RoutePoint {
    lat: number;
    lng: number;
}

interface WidgetData {
    places?: Place[];
    route?: RoutePoint[];
}

declare global {
    interface Window {
        __INITIAL_DATA__?: WidgetData | Place[]; // Handle legacy array or new object
    }
}

// Mock Data for initial state or fallback
const MOCK_PLACES: Place[] = [
    { id: 1, name: "Parque del Retiro", type: "park", lat: 40.4152606, lng: -3.6844995, address: "Plaza de la Independencia, 7", rating: 4.8, estimated_walk_time: "10 min" },
    { id: 2, name: "Café Murillo", type: "cafe", lat: 40.4143, lng: -3.6895, address: "Calle Ruiz de Alarcón, 27", rating: 4.5, estimated_walk_time: "5 min" },
    { id: 3, name: "Real Jardín Botánico", type: "park", lat: 40.4111, lng: -3.6898, address: "Plaza de Murillo, 2", rating: 4.7, estimated_walk_time: "12 min" }
];

const CENTER = { lat: 40.4152, lng: -3.6845 };

function App() {
    const [timeWindow, setTimeWindow] = useState(20);
    const [mood, setMood] = useState('calmado');

    // Initialize from injected data or mock
    const [places] = useState<Place[]>(() => {
        const data = window.__INITIAL_DATA__;
        if (Array.isArray(data)) return data; // Legacy support
        if (data && data.places) return data.places;
        return MOCK_PLACES;
    });

    const [route] = useState<RoutePoint[] | null>(() => {
        const data = window.__INITIAL_DATA__;
        if (!Array.isArray(data) && data && data.route) return data.route;
        return null;
    });

    const [loading, setLoading] = useState(false); // Added loading state
    const [coachMessage] = useState("Amaya, respira 2 min. Aquí tienes un paseíto rápido con árboles y luz cálida.");
    const [soundtracks] = useState<Soundtrack[]>([
        { title: "Nature Sounds", description: "Sonidos de bosque y lluvia" },
        { title: "Piano Chill", description: "Piano suave para desconectar" }
    ]);

    // Mock loading effect
    const handleSearch = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            // In real app, this would trigger a new MCP tool call via the ChatGPT context
            console.log("Searching with", { timeWindow, mood });
        }, 1000);
    };

    return (
        <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
            {/* Sidebar */}
            <div className="w-1/3 bg-white shadow-xl z-10 flex flex-col">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="bg-purple-600 p-2 rounded-lg">
                            <Activity className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
                            Micro Breaks Map
                        </h1>
                    </div>
                    <p className="text-sm text-gray-500 ml-11">Desconecta en 20 minutos</p>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Controls */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2 block">
                                Tiempo disponible
                            </label>
                            <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <Clock className="w-5 h-5 text-purple-500" />
                                <input
                                    type="range"
                                    min="10"
                                    max="60"
                                    value={timeWindow}
                                    onChange={(e) => setTimeWindow(parseInt(e.target.value))}
                                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                />
                                <span className="font-bold text-gray-700 w-12 text-right">{timeWindow} m</span>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2 block">
                                Mood actual
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {['calmado', 'creativo', 'energico'].map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setMood(m)}
                                        className={`p - 2 rounded - lg text - sm font - medium transition - all ${
    mood === m
    ? 'bg-purple-100 text-purple-700 border-2 border-purple-200'
    : 'bg-white border border-gray-200 text-gray-600 hover:border-purple-200'
} `}
                                    >
                                        {m.charAt(0).toUpperCase() + m.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Coach Message */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                        <div className="flex gap-3">
                            <div className="mt-1">✨</div>
                            <p className="text-sm text-indigo-900 leading-relaxed font-medium">
                                "{coachMessage}"
                            </p>
                        </div>
                    </div>

                    {/* Places List */}
                    <div>
                        <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-3">
                            Lugares sugeridos
                        </h3>
                        <div className="space-y-3">
                            {loading ? (
                                <div className="text-center py-8 text-gray-400">Buscando lugares zen...</div>
                            ) : (
                                places.map(place => (
                                    <div key={place.id} className="group bg-white p-3 rounded-xl border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all cursor-pointer">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-gray-800 group-hover:text-purple-700 transition-colors">{place.name}</h4>
                                            <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                                {place.rating} ★
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                            {place.type === 'park' ? <Trees className="w-3 h-3" /> : <Coffee className="w-3 h-3" />}
                                            <span>{place.type === 'park' ? 'Parque' : 'Café tranquilo'}</span>
                                            <span>•</span>
                                            <span>{place.estimated_walk_time || "5 min"}</span>
                                        </div>
                                        <p className="text-xs text-gray-400 truncate">{place.address}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Soundtrack */}
                    <div>
                        <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-3">
                            Soundtrack
                        </h3>
                        <div className="space-y-2">
                            {soundtracks.map((track, i) => (
                                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <div className="bg-white p-2 rounded-full shadow-sm">
                                        <Music className="w-4 h-4 text-pink-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-700">{track.title}</p>
                                        <p className="text-xs text-gray-500">{track.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Map */}
            <div className="flex-1 relative">
                <MapContainer
                    center={[CENTER.lat, CENTER.lng]}
                    zoom={15}
                    style={{ height: "100%", width: "100%" }}
                    zoomControl={false}
                >
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                    <Marker position={[CENTER.lat, CENTER.lng]}>
                        <Popup>
                            <div className="text-center">
                                <p className="font-bold">Tu estás aquí</p>
                                <p className="text-xs text-gray-500">Respira...</p>
                            </div>
                        </Popup>
                    </Marker>

                    {/* Render Places */}
                    {places.map(place => (
                        <Marker key={place.id} position={[place.lat, place.lng]}>
                            <Popup>
                                <div className="text-center">
                                    <p className="font-bold">{place.name}</p>
                                    <p className="text-xs text-gray-500">{place.type}</p>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {/* Render Route */}
                    {route && (
                        <Polyline
                            positions={route.map(p => [p.lat, p.lng])}
                            color="#9333ea"
                            weight={5}
                            opacity={0.7}
                            dashArray="10, 10"
                        />
                    )}

                </MapContainer>

                {/* Floating Action Button */}
                <button
                    onClick={handleSearch}
                    className="absolute bottom-8 right-8 bg-black text-white p-4 rounded-full shadow-2xl hover:scale-105 transition-transform z-[1000] flex items-center gap-2"
                >
                    <Activity className="w-5 h-5" />
                    <span className="font-bold">Actualizar Mapa</span>
                </button>
            </div>
        </div>
    );
}

export default App;
