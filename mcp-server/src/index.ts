import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import axios from "axios";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import crypto from "crypto";

dotenv.config();

const app = express();
app.use(cors());
// Note: body-parser is included in express 4.16+
// We need raw body for some MCP operations if needed, but standard JSON is usually fine for messages endpoint
app.use(express.json());

const server = new Server(
    {
        name: "micro-breaks-map-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// --- Tool Definitions ---

const FindBreakSpotsSchema = z.object({
    lat: z.number(),
    lng: z.number(),
    maxDistanceMeters: z.number().default(900),
    timeWindowMinutes: z.number().default(30),
    mood: z.string().optional(),
});

const GenerateWalkRouteSchema = z.object({
    lat: z.number(),
    lng: z.number(),
    timeWindowMinutes: z.number(),
    preference: z.enum(["más verde", "más ciudad", "mixto"]).optional(),
});

const SuggestSoundtrackSchema = z.object({
    mood: z.string(),
});

const GenerateCoachMessageSchema = z.object({
    name: z.string().optional(),
    mood: z.string(),
    experience_info: z.string(),
});

// --- Helpers ---

async function queryOverpass(lat: number, lng: number, radius: number, type: 'park' | 'cafe') {
    let query = "";
    if (type === 'park') {
        query = `
      [out:json];
      (
        node["leisure"="park"](around:${radius},${lat},${lng});
        way["leisure"="park"](around:${radius},${lat},${lng});
        relation["leisure"="park"](around:${radius},${lat},${lng});
      );
      out center;
    `;
    } else if (type === 'cafe') {
        query = `
      [out:json];
      (
        node["amenity"="cafe"](around:${radius},${lat},${lng});
        way["amenity"="cafe"](around:${radius},${lat},${lng});
      );
      out center;
    `;
    }

    try {
        const response = await axios.post("https://overpass-api.de/api/interpreter", query, {
            headers: { "Content-Type": "text/plain" }
        });
        return response.data.elements || [];
    } catch (error) {
        console.error("Overpass API Error:", error);
        return [];
    }
}

// --- Handlers ---

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "find_break_spots",
                description: "Encuentra parques, cafés y lugares tranquilos cerca usando OpenStreetMap.",
                inputSchema: {
                    type: "object",
                    properties: {
                        lat: { type: "number", description: "Latitud del usuario" },
                        lng: { type: "number", description: "Longitud del usuario" },
                        maxDistanceMeters: { type: "number", default: 900, description: "Radio de búsqueda en metros" },
                        timeWindowMinutes: { type: "number", default: 30, description: "Tiempo disponible en minutos" },
                        mood: { type: "string", description: "Estado de ánimo (ej: calmado, creativo)" },
                    },
                    required: ["lat", "lng"],
                },
            },
            {
                name: "generate_walk_route",
                description: "Genera una ruta de paseo circular o de ida y vuelta.",
                inputSchema: {
                    type: "object",
                    properties: {
                        lat: { type: "number" },
                        lng: { type: "number" },
                        timeWindowMinutes: { type: "number" },
                        preference: { type: "string", enum: ["más verde", "más ciudad", "mixto"] },
                    },
                    required: ["lat", "lng", "timeWindowMinutes"],
                },
            },
            {
                name: "suggest_soundtrack",
                description: "Sugiere música o sonidos basados en el mood.",
                inputSchema: {
                    type: "object",
                    properties: {
                        mood: { type: "string" },
                    },
                    required: ["mood"],
                },
            },
            {
                name: "generate_coach_message",
                description: "Genera un mensaje corto y amable de coaching.",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        mood: { type: "string" },
                        experience_info: { type: "string" },
                    },
                    required: ["mood", "experience_info"],
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === "find_break_spots") {
            const { lat, lng, maxDistanceMeters, mood } = FindBreakSpotsSchema.parse(args);

            // Parallel queries to Overpass
            const [parks, cafes] = await Promise.all([
                queryOverpass(lat, lng, maxDistanceMeters, 'park'),
                queryOverpass(lat, lng, maxDistanceMeters, 'cafe')
            ]);

            const formatPlace = (p: any, type: 'park' | 'quiet_cafe') => {
                const name = p.tags?.name || (type === 'park' ? "Parque sin nombre" : "Café");
                // Use center if available (for ways/relations), else lat/lon
                const location = {
                    lat: p.center?.lat || p.lat,
                    lng: p.center?.lon || p.lon
                };

                return {
                    name,
                    type,
                    rating: 4.5, // Mock rating as OSM doesn't have ratings
                    address: p.tags?.["addr:street"] ? `${p.tags["addr:street"]} ${p.tags["addr:housenumber"] || ''}` : "Cerca de ti",
                    location,
                    place_id: p.id.toString(),
                    estimated_walk_time: "5-10 min" // Mock time
                };
            };

            const formattedPlaces = [
                ...parks.slice(0, 5).map((p: any) => formatPlace(p, 'park')),
                ...cafes.slice(0, 5).map((c: any) => formatPlace(c, 'quiet_cafe'))
            ];

            return {
                content: [{ type: "text", text: JSON.stringify(formattedPlaces) }],
            };
        }

        if (name === "generate_walk_route") {
            const { lat, lng, timeWindowMinutes } = GenerateWalkRouteSchema.parse(args);

            // Mock route for now, but using OSRM format could be a future enhancement.
            // We return a simple square route around the user.
            const offset = 0.003; // roughly 300-400m
            const mockRoute = [
                { lat: lat, lng: lng },
                { lat: lat + offset, lng: lng },
                { lat: lat + offset, lng: lng + offset },
                { lat: lat, lng: lng + offset },
                { lat: lat, lng: lng }
            ];

            return {
                content: [{
                    type: "text", text: JSON.stringify({
                        route_points: mockRoute,
                        estimated_duration: `${timeWindowMinutes} min`,
                        description: "Ruta circular por el barrio"
                    })
                }],
            };
        }

        if (name === "suggest_soundtrack") {
            const { mood } = SuggestSoundtrackSchema.parse(args);

            let suggestions = [];
            const m = mood.toLowerCase();

            if (m.includes("calma") || m.includes("tranquil")) {
                suggestions = [
                    { title: "Nature Sounds", description: "Sonidos de bosque y lluvia", type: "soundscape", query: "nature sounds" },
                    { title: "Piano Chill", description: "Piano suave para desconectar", type: "playlist", query: "piano chill" }
                ];
            } else if (m.includes("creativ") || m.includes("inspir")) {
                suggestions = [
                    { title: "Lofi Beats", description: "Ritmos suaves para fluir", type: "playlist", query: "lofi beats" },
                    { title: "Classical Focus", description: "Música clásica estimulante", type: "playlist", query: "classical focus" }
                ];
            } else {
                suggestions = [
                    { title: "Acoustic Relax", description: "Guitarra acústica", type: "playlist", query: "acoustic relax" },
                    { title: "Ambient Noise", description: "Ruido blanco suave", type: "soundscape", query: "ambient noise" }
                ];
            }

            return {
                content: [{ type: "text", text: JSON.stringify(suggestions) }],
            };
        }

        if (name === "generate_coach_message") {
            const { name, mood, experience_info } = GenerateCoachMessageSchema.parse(args);
            const userName = name || "ahí";

            let message = "";
            if (mood.includes("agotado") || mood.includes("bloqueada")) {
                message = `${userName}, respira profundo. Tómate estos minutos para ti. ${experience_info} te ayudará a resetear.`;
            } else if (mood.includes("calma")) {
                message = `Disfruta de la paz, ${userName}. ${experience_info} es perfecto para mantener esa serenidad.`;
            } else {
                message = `¡Vamos, ${userName}! Un poco de aire fresco te vendrá genial. Mira: ${experience_info}.`;
            }

            return {
                content: [{ type: "text", text: message }],
            };
        }

        throw new Error(`Tool ${name} not found`);
    } catch (error: any) {
        return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
        };
    }
});

// --- Express Server Setup for SSE ---

let transport: SSEServerTransport;

app.get("/", (req, res) => {
    res.send("Micro Breaks MCP Server is running 🚀. Use /sse for ChatGPT connection.");
});

app.get("/sse", async (req, res) => {
    console.log("New SSE connection");

    // Critical headers for Render/Nginx buffering
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disables Nginx buffering on Render

    // Create new transport (Global for simplicity, last connection wins)
    transport = new SSEServerTransport("/messages", res);

    // Connect the server to this transport
    await server.connect(transport);

    // Send a keep-alive comment every 15 seconds to prevent Render/Nginx timeouts
    const keepAlive = setInterval(() => {
        if (res.writableEnded) {
            clearInterval(keepAlive);
            return;
        }
        res.write(":\n\n");
    }, 15000);

    req.on("close", () => {
        console.log("SSE connection closed");
        clearInterval(keepAlive);
    });
});

app.post("/messages", async (req, res) => {
    console.log("Received message on /messages");
    if (!transport) {
        console.error("No active transport");
        res.sendStatus(400);
        return;
    }
    try {
        await transport.handlePostMessage(req, res);
    } catch (error) {
        console.error("Error handling message:", error);
        res.sendStatus(500);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`MCP Server running on port ${PORT}`);
    console.log(`SSE Endpoint: http://localhost:${PORT}/sse`);
});
