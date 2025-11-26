import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Clock, MapPin, Music, Coffee, Trees, Activity } from 'lucide-react';
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
    name: string;
    type: 'park' | 'quiet_cafe' | 'free_activity';
    rating: number;
    address: string;
    estimated_walk_time: string;
    location: { lat: number; lng: number };
}

interface Soundtrack {
    title: string;
    description: string;
    type: string;
    query: string;
}

// Mock Data for initial state or fallback
const MOCK_PLACES: Place[] = [
    { name: "Parque del Retiro", type: "park", rating: 4.8, address: "Plaza de la Independencia", estimated_walk_time: "10 min", location: { lat: 40.4152, lng: -3.6845 } },
    { name: "Café Murillo", type: "quiet_cafe", rating: 4.5, address: "C. Ruiz de Alarcón", estimated_walk_time: "5 min", location: { lat: 40.4143, lng: -3.6901 } }
];

const center = {
    lat: 40.4152,
    lng: -3.6845
};

function App() {
    const [timeWindow, setTimeWindow] = useState(30);
    const [mood, setMood] = useState('calmado');
    const [places, setPlaces] = useState<Place[]>(MOCK_PLACES);
    const [loading, setLoading] = useState(false);
    const [coachMessage, setCoachMessage] = useState("Amaya, respira 2 min. Aquí tienes un paseíto rápido con árboles y luz cálida.");
    const [soundtracks, setSoundtracks] = useState<Soundtrack[]>([
        { title: "Nature Sounds", description: "Sonidos de bosque", type: "soundscape", query: "nature" }
    ]);

    // In a real Apps SDK app, we would listen to events or use a client to fetch data from the MCP server.
    // Since this is a UI widget, we simulate the "refresh" when controls change.

    const handleRefresh = async () => {
        setLoading(true);
        // Simulate API call delay
        setTimeout(() => {
            setLoading(false);
            // In real app, this would trigger a new MCP tool call via the ChatGPT context
            console.log("Refreshed with", { timeWindow, mood });
        }, 1000);
    };

    return (
        <div className="max-w-2xl mx-auto p-4 bg-white min-h-screen font-sans text-gray-800">
            {/* Header */}
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Micro Breaks cerca de ti</h1>
                <p className="text-gray-500">Te propongo un plan rápido para desconectar.</p>
            </header>

            {/* Controls */}
            <div className="bg-gray-50 p-4 rounded-xl mb-6 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-600" />
                    <select
                        value={timeWindow}
                        onChange={(e) => setTimeWindow(Number(e.target.value))}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value={10}>10 min</option>
                        <option value={20}>20 min</option>
                        <option value={30}>30 min</option>
                        <option value={45}>45 min</option>
                    </select>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                    {['Necesito calma', 'Estoy bloqueada', 'Quiero inspirarme'].map((m) => (
                        <button
                            key={m}
                            onClick={() => setMood(m)}
                            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${mood === m
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            {m}
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleRefresh}
                    className="text-sm text-blue-600 font-medium hover:text-blue-700"
                >
                    Actualizar
                </button>
            </div>

            {/* Coach Message */}
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6 flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-full">
                    <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-blue-900 text-sm leading-relaxed italic">
                    "{coachMessage}"
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Map */}
                <div className="h-[300px] bg-gray-100 rounded-xl overflow-hidden relative z-0">
                    <MapContainer
                        center={[center.lat, center.lng]}
                        zoom={15}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={false}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={[center.lat, center.lng]}>
                            <Popup>Tu ubicación</Popup>
                        </Marker>
                        {places.map((place, idx) => (
                            <Marker
                                key={idx}
                                position={[place.location.lat, place.location.lng]}
                            >
                                <Popup>{place.name}</Popup>
                            </Marker>
                        ))}
                    </MapContainer>

                    {loading && (
                        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-[1000]">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    )}
                </div>

                {/* List */}
                <div className="space-y-3 h-[300px] overflow-y-auto pr-2">
                    {places.map((place, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-3 hover:border-blue-400 transition-colors cursor-pointer bg-white shadow-sm">
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-2">
                                    {place.type === 'park' && <Trees className="w-4 h-4 text-green-600" />}
                                    {place.type === 'quiet_cafe' && <Coffee className="w-4 h-4 text-orange-600" />}
                                    <h3 className="font-semibold text-gray-900 text-sm">{place.name}</h3>
                                </div>
                                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                    {place.estimated_walk_time}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mb-2">{place.address}</p>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-yellow-600 font-medium">★ {place.rating}</span>
                                <button className="text-xs bg-gray-900 text-white px-3 py-1 rounded-md hover:bg-gray-800">
                                    Ir aquí
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Soundtrack Section */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Soundtrack</h4>
                        {soundtracks.map((track, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer">
                                <Music className="w-4 h-4 text-purple-600" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{track.title}</p>
                                    <p className="text-xs text-gray-500">{track.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
