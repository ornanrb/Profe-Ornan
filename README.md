# Profe Ornan - Tutor Virtual Pedagógico y Multimodal (MINERD) 🇩🇴

Tutor pedagógico inteligente adaptado al Currículo Nacional de la República Dominicana (MINERD). Cuenta con soporte para diálogo por voz en tiempo real, fórmulas matemáticas formuladas rigurosamente en LaTeX, análisis multimodal de libretas y fotos de tareas, generación de recursos interactivos y exportación oficial de planificaciones de clase a Microsoft Word (`.docx`).

---

## 🚀 Requisitos Previos

1. **Node.js**: Versión 18 o superior ([Descargar Node.js](https://nodejs.org/)).
2. **Git**: Instalado en tu computadora ([Descargar Git](https://git-scm.com/)).
3. **Clave API de Gemini**: Obtén tu clave gratuita en [Google AI Studio](https://aistudio.google.com/app/apikey).

---

## 💻 1. Cómo usar y ejecutar la aplicación localmente

### Paso 1: Clonar o descargar el proyecto
Si ya descargaste el código en tu computadora, abre la terminal en la carpeta del proyecto.

### Paso 2: Instalar las dependencias
Ejecuta en tu terminal:
```bash
npm install
```

### Paso 3: Configurar las variables de entorno
Crea un archivo llamado `.env` en la raíz del proyecto (puedes duplicar `.env.example`):
```bash
cp .env.example .env
```
Abre `.env` y coloca tu API key de Gemini:
```env
GEMINI_API_KEY="AIzaSy..."
```

*(Opcional: Si deseas usar otros proveedores como OpenAI, Anthropic o DeepSeek, también puedes ingresar tus claves directamente desde la interfaz web en el botón de configuración de IA).*

### Paso 4: Iniciar el servidor de desarrollo
Ejecuta:
```bash
npm run dev
```

Abre tu navegador en:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📦 2. Cómo publicar la aplicación en GitHub

Para subir tu proyecto a un repositorio nuevo en GitHub:

### Paso 1: Crear un archivo `.gitignore` (si no existe)
Verifica que `node_modules` y `.env` no se suban a GitHub. En tu `.gitignore` debe estar:
```
node_modules
dist
.env
.DS_Store
```

### Paso 2: Inicializar el repositorio Git local
En la terminal, dentro de la carpeta del proyecto, ejecuta:
```bash
git init
git add .
git commit -m "feat: inicialización completa de Profe Ornan"
git branch -M main
```

### Paso 3: Crear el repositorio en GitHub
1. Entra a [github.com/new](https://github.com/new).
2. Nombra el repositorio (por ejemplo, `profe-ornan`).
3. Elige si será **Público** o **Privado**.
4. Haz clic en **Create repository** (sin marcar las casillas de inicializar con README).

### Paso 4: Vincular y subir tu código
Copia la URL de tu repositorio de GitHub y ejecuta:
```bash
git remote add origin https://github.com/TU_USUARIO/profe-ornan.git
git push -u origin main
```

*(Si utilizas la herramienta GitHub CLI `gh`, puedes hacerlo directamente con: `gh repo create profe-ornan --public --source=. --push`)*

---

## 🛠️ Comandos útiles

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo en el puerto 3000 con recarga rápida. |
| `npm run build` | Compila la aplicación frontend con Vite y empaqueta el servidor con esbuild. |
| `npm run start` | Inicia el servidor optimizado para producción (`dist/server.cjs`). |
| `npm run lint` | Comprueba tipos y sintaxis TypeScript sin emitir código. |

---

## ✨ Características Principales

- **Diálogo y Síntesis de Voz en Tiempo Real**: Explicaciones pedagógicas directas y naturales.
- **Fórmulas y Ecuaciones con LaTeX**: Renderizado de expresiones algebraicas mediante KaTeX.
- **Panel Lateral de Archivos (Drawer)**: Historial para repasar fotos de libretas y diagnósticos previos.
- **Planificación Docente MINERD**: Generación con competencias fundamentales y específicas, situaciones de aprendizaje, secuencias didácticas y rúbricas.
- **Exportación a Word (.docx)**: Descarga directa con formato institucional del Ministerio de Educación Dominicano.
