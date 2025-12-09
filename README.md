# LiveAvatar Web SDK & Demo - Guía Completa

Bienvenido al repositorio de **LiveAvatar Web Resources**. Este proyecto está diseñado para ayudarte a integrar avatares interactivos con inteligencia artificial en tus aplicaciones web de manera rápida y sencilla.

## 🌟 ¿Qué es esto y para qué sirve? (De 0 a 100)

Imagina que quieres tener una persona virtual en tu sitio web con la que tus usuarios puedan hablar en tiempo real, como si fuera una videollamada.

- **¿Qué hace?**: Muestra un avatar realista (generado por HeyGen) que puede escuchar lo que dice el usuario (voz o texto), procesarlo y responder inteligentemente (usando OpenAI/ChatGPT) con voz y movimiento de labios sincronizado.
- **¿Para qué sirve?**:
  - **Atención al Cliente**: Un asistente virtual que responde dudas 24/7 con una cara humana.
  - **Educación**: Tutores virtuales que explican conceptos y responden preguntas.
  - **Ayudantes de Compra**: Personal shoppers que guían al usuario por una tienda online.
  - **Entrenamiento**: Pacientes o clientes simulados para practicar habilidades de comunicación.

Este repositorio te entrega el código base ("esqueleto") para que no tengas que empezar desde cero.

## 🚀 Tecnologías Usadas (Nivel Técnico)

Si eres desarrollador o estás aprendiendo, estas son las herramientas que hacen funcionar este proyecto:

### 1. **HeyGen Streaming Avatar SDK** (`@heygen/liveavatar-web-sdk`)

Es el corazón del proyecto.

- **Función**: Se encarga de conectar con los servidores de HeyGen para recibir el video del avatar en tiempo real. Maneja la conexión WebRTC (video de baja latencia) y la sincronización de labios.

### 2. **Next.js** (Framework de React)

Es la estructura de la aplicación web.

- **Función**: Permite crear la interfaz de usuario, manejar las rutas y, muy importante, crear los **API Routes** (servidor backend) necesarios para ocultar tus claves secretas (API Keys) y que no sean robadas desde el navegador.

### 3. **OpenAI API** (Inteligencia Artificial)

Es el "cerebro" del avatar.

- **Función**: Cuando el usuario habla, su texto se envía a OpenAI (modelos GPT-4 o GPT-3.5). OpenAI genera la respuesta de texto, que luego el avatar "lee" en voz alta.

### 4. **TailwindCSS**

Es la herramienta de diseño.

- **Función**: Permite dar estilo a la página (colores, botones, espaciado) de forma rápida sin escribir archivos CSS gigantes.

### 5. **Monorepo (Turbo & PNPM)**

- **Estructura**: Este proyecto usa una arquitectura moderna llamada "Monorepo", gestionada por **Turbo**. Esto significa que puedes tener múltiples aplicaciones y paquetes compartidos en una sola carpeta principal.

---

## 🛠️ Cómo Empezar (Paso a Paso)

### 1. Requisitos Previos

Necesitas tener instalado en tu computadora:

- [Node.js](https://nodejs.org/) (versión 18 o superior).
- Una cuenta en [HeyGen](https://app.heygen.com/) (necesitas una API Key y créditos de prueba).
- Una cuenta en [OpenAI](https://platform.openai.com/) (API Key).

### 2. Instalación

Abre tu terminal en la carpeta del proyecto y ejecuta:

```bash
npm install
# O si prefieres pnpm (recomendado por el proyecto)
pnpm install
```

### 3. Configuración de Secretos

El proyecto necesita tus llaves para funcionar.

1. Ve a la carpeta `apps/demo`.
2. Busca o crea un archivo llmado `.env.local` (o revisa `secrets.ts` si el proyecto usa otra configuración manual).
3. Deberás configurar variables como:
   - `HEYGEN_API_KEY`: Tu llave de HeyGen.
   - `OPENAI_API_KEY`: Tu llave de OpenAI.

### 4. Correr la Demo

Para iniciar la aplicación en modo desarrollo:

```bash
npm run dev
```

Esto abrirá la aplicación web, generalmente en `http://localhost:3000` o `http://localhost:3001`.

## 📂 Estructura del Proyecto

- **`apps/demo`**: Aquí está la aplicación web principal que verás en el navegador.
  - `src/components`: Contiene los componentes visuales (Botones, Ventana del Avatar).
  - `app/api`: Contiene el código del servidor que habla con HeyGen y OpenAI.
- **`packages`**: Código compartido reutilizable (configuraciones de TypeScript, ESLint, etc.).

---

### Recursos Adicionales

- [Documentación Oficial de HeyGen](https://docs.heygen.com/)
- [Documentación de Next.js](https://nextjs.org/docs)
