<div align="center">
  <h1>Interesting Facts</h1>
  <p><strong>Una plataforma social para compartir datos curiosos</strong></p>
  
  <p>
    <img src="https://img.shields.io/badge/React_Native-0.86-61DAFB?style=flat-square&logo=react" alt="React Native" />
    <img src="https://img.shields.io/badge/Expo-SDK_57-000020?style=flat-square&logo=expo" alt="Expo" />
    <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Firebase-Auth-FFCA28?style=flat-square&logo=firebase" alt="Firebase" />
    <img src="https://img.shields.io/badge/Zustand-State_Management-453F39?style=flat-square" alt="Zustand" />
  </p>
  
  <p>
    <a href="#-características"><strong>Características</strong></a> •
    <a href="#-tecnologías"><strong>Tecnologías</strong></a> •
    <a href="#-arquitectura"><strong>Arquitectura</strong></a> •
    <a href="#-instalación"><strong>Instalación</strong></a>
  </p>
</div>

---

## 📱 Sobre el Proyecto

**Interesting Facts** es una aplicación móvil cross-platform (Android, iOS y Web) construida con React Native y Expo. Permite a los usuarios descubrir, crear y compartir datos curiosos en una comunidad social.

### ✨ Características Principales

- 🔐 **Autenticación Firebase** — Login seguro con email/password
- 📰 **Feed Social** — Facts y reposts con infinite scroll y dedup
- 🔁 **Reposts** — Repostea con un tap, detalle propio con likes y comentarios independientes
- 🔍 **Búsqueda Avanzada** — Busca por personas, posts (facts + reposts) o hashtags
- 💬 **Interacciones** — Likes con avatares inline, comentarios anidados y reposts
- 🏷️ **Menciones y Hashtags** — autocomplete en vivo al escribir `@usuario` o `#tema`
- 👤 **Perfil Personalizable** — Tabs My Facts / Liked / Mentions con live-updates
- 🛡️ **Gate de Versión** — El backend valida `X-App-Version`; si está desactualizada, bloquea la app con link de descarga
- 🌙 **Tema Claro/Oscuro** — Toggle con persistencia y detección del sistema
- 🔄 **Pull-to-Refresh** — Actualiza el feed en cualquier pantalla
- ⚡ **Optimizado** — React Compiler habilitado, lazy loading, cache inteligente

---

## 🛠️ Tecnologías

### Core

- **React Native 0.86** — Framework mobile
- **Expo SDK 57** — Toolchain y desarrollo
- **TypeScript 6.0** — Type safety
- **Expo Router** — File-based routing (similar a Next.js)

### State & Data

- **Zustand** — State management ligero y performante
- **React Query** — Server state y cache (si aplica)
- **Firebase Auth** — Autenticación y persistencia de sesión

### UI/UX

- **React Native Reanimated** — Animaciones fluidas
- **React Native Gesture Handler** — Gestos nativos
- **Expo Vector Icons** — Iconografía consistente
- **Custom Theme System** — Dark/Light mode con detección automática

### Build & Deploy

- **EAS Build** — Builds nativos en la nube
- **Vercel** — Deploy web automático
- **Expo Go** — Desarrollo rápido en dispositivos

---

## 🏗️ Arquitectura

```
app-interesting-facts/
├── app/                      # Expo Router (file-based routing)
│   ├── (tabs)/              # Tab navigator
│   │   ├── index.tsx        # Feed principal
│   │   ├── search.tsx       # Búsqueda
│   │   ├── create.tsx       # Crear fact
│   │   └── profile.tsx      # Perfil propio
│   ├── auth/                # Pantallas de autenticación
│   ├── fact/                # Detalle y edición de facts
│   └── _layout.tsx          # Root layout con providers
│
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── FactCard.tsx     # Card de fact con acciones
│   │   ├── StyledContent.tsx # Renderizado de @mentions y #hashtags
│   │   ├── LikesModal.tsx   # Modal de likes
│   │   └── ...
│   │
│   ├── data/                # Capa de datos
│   │   ├── api/             # Cliente HTTP y tipos
│   │   ├── auth/            # Firebase Auth wrapper
│   │   ├── stores/          # Zustand stores
│   │   │   ├── factsStore.ts
│   │   │   ├── userProfileStore.ts
│   │   │   └── uiStore.ts
│   │   └── hooks/           # Custom hooks
│   │       ├── useAuth.ts
│   │       ├── useFacts.ts
│   │       └── useFactLikes.ts
│   │
│   ├── hooks/               # Hooks de UI
│   │   ├── use-theme.ts     # Sistema de temas
│   │   └── use-color-scheme.ts
│   │
│   └── utils/               # Utilidades
│       ├── parseContent.ts  # Parser de @mentions y #hashtags
│       └── validation.ts    # Validaciones
│
└── public/                  # Assets estáticos (PWA)
```

### Patrones de Diseño

- **Container/Presentational** — Separación de lógica y UI
- **Custom Hooks** — Reutilización de lógica de negocio
- **Zustand Stores** — State management global con slices
- **API Client Pattern** — Cliente HTTP centralizado con interceptors
- **Theme System** — Tokens de diseño centralizados

---

## 🚀 Instalación

### Prerrequisitos

- Node.js 22.13.0+ (mínimo requerido por Expo SDK 57)
- pnpm (el proyecto usa pnpm y `pnpm-lock.yaml`)
- [Expo Go](https://expo.dev/go) app en tu dispositivo (para desarrollo)

### Setup

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd app-interesting-facts

# 2. Instalar dependencias
pnpm install

# 3. Configurar variables de entorno
cp .env.example .env
```

### Variables de Entorno

Edita `.env` con tus credenciales:

```env
# API Backend
EXPO_PUBLIC_API_URL=https://api-interesting-facts.onrender.com

# Versión de la app — se envía como header X-App-Version (version check del backend)
EXPO_PUBLIC_APP_VERSION=1.0.0

# URL de la landing web — el gate de versión enlaza aquí para descargar la última APK
EXPO_PUBLIC_WEB_URL=

# Fallback de descarga directa de APK (opcional)
EXPO_PUBLIC_APK_URL=

# Firebase (obtener del Firebase Console)
EXPO_PUBLIC_FIREBASE_API_KEY=tu_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=tu_app_id
```

### Ejecutar

```bash
# Iniciar servidor de desarrollo
pnpm start

# O directamente en una plataforma
pnpm android    # Android
pnpm ios        # iOS
pnpm web        # Web
```

Escanea el QR code con Expo Go o presiona `a`/`i`/`w` para abrir automáticamente.

---

## 📦 Scripts Disponibles

| Comando              | Descripción                               |
| -------------------- | ----------------------------------------- |
| `pnpm start`         | Inicia el servidor de desarrollo Expo     |
| `pnpm android`       | Abre en Android                           |
| `pnpm ios`           | Abre en iOS                               |
| `pnpm web`           | Abre en navegador web                     |
| `pnpm lint`          | Ejecuta ESLint                            |
| `pnpm build:web`     | Build para producción web                 |
| `pnpm build:android` | Build APK/AAB para Android (requiere EAS) |

---

## 🏗️ Build para Producción

### Web

```bash
pnpm build:web
# Output en dist/
```

Deploy automático en Vercel al hacer push a `main`.

### Android

```bash
# Login en EAS
npx eas-cli login

# Build APK (preview)
npx eas-cli build -p android --profile preview

# Build AAB (production)
npx eas-cli build -p android --profile production
```

### iOS

Requiere cuenta de Apple Developer Program.

```bash
npx eas-cli build -p ios --profile production
```

---

## 🎯 Características Destacadas

### Gate de Versión (Version Check)

- Cada request envía el header `X-App-Version` (de `EXPO_PUBLIC_APP_VERSION`)
- El backend compara contra `MIN_APP_VERSION` y responde `426` si el cliente está desactualizado
- El client detecta la respuesta y activa un gate a pantalla completa con link directo a la landing para descargar la última versión
- Configuración requerida en Vercel: `MIN_APP_VERSION=1.0.0` y `STRICT_VERSION_CHECK=true`

### Sistema de Temas

- Detección automática del tema del sistema
- Toggle manual con persistencia en AsyncStorage
- Anti-flash en web con script inline en `+html.tsx`
- Tokens de diseño centralizados en `src/constants/theme.ts`

### Autocomplete Inteligente

- Detección en tiempo real de `@mentions` y `#hashtags`
- Debounce de 300ms para evitar spam a la API
- Navegación con teclado (flechas + Enter)
- Dropdown posicionado dinámicamente

### Optimizaciones

- **React Compiler** — Optimizaciones automáticas de re-renders
- **Zustand** — State management con suscripciones granulares
- **Image Caching** — Cache de imágenes con expo-image
- **Lazy Loading** — Carga diferida de componentes pesados

---

## 🤝 Contribuciones

Este es un proyecto personal/portfolio, pero si tienes sugerencias o encuentras bugs:

1. Abre un issue describiendo el problema
2. O fork el repo y crea un pull request

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT.

---

## 👨‍💻 Autor

Desarrollado con ❤️ por **Miguel Rodac** usando React Native + Expo

**Stack:**

- Frontend: React Native, Expo, TypeScript, Zustand
- Backend: API REST (Node.js)
- Auth: Firebase Authentication
- Deploy: Vercel (web), EAS Build (mobile)

---

<div align="center">
  <sub>¿Te gustó el proyecto? Dale una ⭐️!</sub>
</div>
