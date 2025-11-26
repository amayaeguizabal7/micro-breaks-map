# Micro Breaks Map

Una App de ChatGPT diseñada para ayudarte a desconectar con micro-experiencias cerca de tu ubicación.

## Estructura del Proyecto

- `mcp-server/`: Servidor MCP (Backend) en Node.js + TypeScript.
- `ui/`: Widget de interfaz (Frontend) en React + Vite.

## Requisitos Previos

1.  Node.js (v18+ recomendado).
2.  **No necesitas API Keys** para empezar. Usamos OpenStreetMap (Overpass API) que es gratuito.

## Configuración

### 1. MCP Server

1.  Entra en la carpeta del servidor:
    ```bash
    cd mcp-server
    ```
2.  Instala las dependencias:
    ```bash
    npm install
    ```
3.  Inicia el servidor en modo desarrollo:
    ```bash
    npm run dev
    # O compila y ejecuta:
    # npm run build && npm start
    ```

### 2. UI Widget

1.  Entra en la carpeta de UI:
    ```bash
    cd ui
    ```
2.  Instala las dependencias:
    ```bash
    npm install
    ```
3.  Inicia el servidor de desarrollo:
    ```bash
    npm run dev
    ```
    Esto servirá el widget en `http://localhost:5173`.

## Integración con ChatGPT

Para conectar esta App con ChatGPT, usaremos el **OpenAI Apps SDK**.

### Opción A: Usando el CLI (Recomendado)

1.  Asegúrate de tener el CLI instalado:
    ```bash
    npm install -g @openai/apps-cli
    ```

2.  Desde la raíz del proyecto (donde está `openai.json`), ejecuta:
    ```bash
    openai-apps dev
    ```
    Esto iniciará un túnel seguro y te dará una URL para instalar la App en ChatGPT.

3.  Sigue las instrucciones en la terminal para abrir ChatGPT y autorizar la App.

### Opción B: Configuración Manual (Developer Mode)

Si prefieres hacerlo manualmente en la plataforma de desarrolladores:

1.  Ve a [ChatGPT](https://chatgpt.com) y activa las funciones de desarrollador.
2.  Crea una nueva App apuntando a tu servidor local.
    -   Para el **Backend**, necesitarás exponer tu puerto local (ej. usando `ngrok` o similar) si no usas el CLI.
    -   Para el **Frontend**, igual (ej. `http://localhost:5173`).

> **Nota**: El archivo `openai.json` ya está configurado para funcionar con el CLI (`url: "stdio"` para el backend). Si usas el CLI, él se encarga de todo.

### Opción C: Despliegue en Render (Para URL Pública)

Si quieres usar el MCP desde cualquier lugar sin tener tu ordenador encendido:

1.  Sube el contenido a GitHub (ya lo hemos hecho).
2.  Crea un **Web Service** en [Render](https://render.com).
3.  Conecta tu repo `micro-breaks-map`.
4.  **Configuración Importante**:
    -   **Name**: `micro-breaks-mcp` (o lo que quieras).
    -   **Runtime**: **Docker**.
    -   **Root Directory**: `mcp-server` (¡Muy importante! El Dockerfile está ahí dentro).
    -   **Region**: Frankfurt (o la más cercana).
    -   **Plan**: Free.
5.  Dale a "Create Web Service".
6.  Espera a que termine el despliegue (puede tardar unos minutos).
7.  Copia la URL que te da (ej: `https://micro-breaks-mcp.onrender.com`).
8.  En ChatGPT (Developer Mode), configura la App:
    -   **Backend URL**: `https://micro-breaks-mcp.onrender.com/sse` (Añade `/sse` al final).
