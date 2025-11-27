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
import path from "path";
import fs from "fs";

dotenv.config();

// Global variable to store last search results for widget injection
let lastWidgetData: any = {};

// ... (Express setup)

// ... (initialize handler)

        } else if (method === "resources/read") {
    const uri = params.uri;
    if (uri === "ui://widget/map") {
        // Read the HTML file
        const htmlPath = path.join(UI_BUILD_PATH, "index.html");
        let htmlContent = "";

        try {
            htmlContent = fs.readFileSync(htmlPath, "utf-8");

            // FIX: Replace relative paths with absolute URLs for ChatGPT
            const BASE_URL = process.env.RENDER_EXTERNAL_URL || "https://micro-breaks-map.onrender.com";

            htmlContent = htmlContent.replace(
                /src="\/assets\//g,
                `src="${BASE_URL}/assets/`
            ).replace(
                /href="\/assets\//g,
                `href="${BASE_URL}/assets/`
            );

            // Inject the last search results
            const injection = `
                    <script>
                        window.__INITIAL_DATA__ = ${JSON.stringify(lastWidgetData)};
                    </script>
                    `;
            htmlContent = htmlContent.replace("</body>", injection + "</body>");

        } catch (e) {
            console.error("Error reading UI index.html:", e);
            htmlContent = "<h1>Error loading widget</h1>";
        }

        res.json({
            jsonrpc: "2.0",
            id: requestId,
            result: {
                contents: [
                    {
                        uri: "ui://widget/map",
                        mimeType: "text/html+skybridge",
                        text: htmlContent
                    }
                ]
            }
        });
    } else {
        res.json({
            jsonrpc: "2.0",
            id: requestId,
            error: { code: -32602, message: "Resource not found" }
        });
    }
} else if (method === "tools/list") {
    res.json({
        jsonrpc: "2.0",
        id: requestId,
        result: {
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
                    // Link this tool to the widget
                    _meta: {
                        "openai/outputTemplate": "ui://widget/map",
                        "openai/toolInvocation/invoking": "Buscando lugares...",
                        "openai/toolInvocation/invoked": "Lugares encontrados"
                    }
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
                    // Link this tool to the widget
                    _meta: {
                        "openai/outputTemplate": "ui://widget/map",
                        "openai/toolInvocation/invoking": "Generando ruta...",
                        "openai/toolInvocation/invoked": "Ruta generada"
                    }
                },
                // ... (other tools)
                {
                    name: "suggest_soundtrack",
                    description: "Sugiere música o sonidos basados en el mood.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            mood: { type: "string" },
                        },
                        required: ["mood"],
                    }
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
                    }
                }
            ]
        }
    });
} else if (method === "tools/call") {
    const toolName = params.name;
    const args = params.arguments || {};

    let result;

    if (toolName === "find_break_spots") {
        const { lat, lng, maxDistanceMeters, mood } = FindBreakSpotsSchema.parse(args);
        const [parks, cafes] = await Promise.all([
            queryOverpass(lat, lng, maxDistanceMeters, 'park'),
            queryOverpass(lat, lng, maxDistanceMeters, 'cafe')
        ]);

        const formatPlace = (p: any, type: 'park' | 'quiet_cafe') => {
            const name = p.tags?.name || (type === 'park' ? "Parque sin nombre" : "Café");
            const location = {
                lat: p.center?.lat || p.lat,
                lng: p.center?.lon || p.lon
            };
            return {
                name,
                type,
                rating: 4.5,
                address: p.tags?.["addr:street"] ? `${p.tags["addr:street"]} ${p.tags["addr:housenumber"] || ''}` : "Cerca de ti",
                location,
                place_id: p.id.toString(),
                estimated_walk_time: "5-10 min"
            };
        };

        const formattedPlaces = [
            ...parks.slice(0, 5).map((p: any) => formatPlace(p, 'park')),
            ...cafes.slice(0, 5).map((c: any) => formatPlace(c, 'quiet_cafe'))
        ];

        // Store results for widget
        lastWidgetData = { places: formattedPlaces };

        result = {
            content: [{ type: "text", text: `Encontré ${formattedPlaces.length} lugares cerca de ti.` }],
            structuredContent: { places: formattedPlaces }
        };

    } else if (toolName === "generate_walk_route") {
        const { lat, lng, timeWindowMinutes } = GenerateWalkRouteSchema.parse(args);
        const offset = 0.003;
        const mockRoute = [
            { lat: lat, lng: lng },
            { lat: lat + offset, lng: lng },
            { lat: lat + offset, lng: lng + offset },
            { lat: lat, lng: lng + offset },
            { lat: lat, lng: lng }
        ];

        // Store results for widget
        lastWidgetData = { route: mockRoute };

        result = {
            content: [{
                type: "text", text: JSON.stringify({
                    route_points: mockRoute,
                    estimated_duration: `${timeWindowMinutes} min`,
                    description: "Ruta circular por el barrio"
                })
            }]
        };

    } else if (toolName === "suggest_soundtrack") {
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
        result = { content: [{ type: "text", text: JSON.stringify(suggestions) }] };

    } else if (toolName === "generate_coach_message") {
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
        result = { content: [{ type: "text", text: message }] };
    } else {
        throw new Error(`Tool ${toolName} not found`);
    }

    res.json({
        jsonrpc: "2.0",
        id: requestId,
        result: result
    });

} else {
    // Fallback for other methods or ping
    res.json({
        jsonrpc: "2.0",
        id: requestId,
        error: {
            code: -32601,
            message: `Method ${method} not supported`
        }
    });
}
    } catch (error: any) {
    console.error("Error processing request:", error);
    res.status(500).json({
        jsonrpc: "2.0",
        id: requestId,
        error: {
            code: -32603,
            message: error.message
        }
    });
}
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`MCP Server running on port ${PORT}`);
    console.log(`MCP Endpoint: http://localhost:${PORT}/mcp`);
});
