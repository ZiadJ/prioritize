# JetNuxtPrime

Este es un proyecto base para iniciar rápidamente aplicaciones en Nuxt.js(v3.15) con una configuración preconfigurada que incluye:

- [PrimeVue](https://www.primefaces.org/primevue/) para componentes de UI [[`@primevue/nuxt-module`](https://primefaces.org/primevue)]. 
- Configuración de modo oscuro y claro [[`@nuxtjs/color-mode`](https://nuxt.com/modules/color-mode)].
- Integración de [Google Fonts](https://google-fonts.nuxtjs.org/) [[`@nuxtjs/google-fonts`](https://nuxt.com/modules/google-fonts)].
- Configuración de [TailwindCSS](https://tailwindcss.com/) para estilos [[`@nuxtjs/tailwindcss`](https://nuxt.com/modules/tailwindcss)].
- Iconos [`@nuxt/icon`](https://nuxt.com/modules/icon) 
> Inspirado en la simplicidad y rapidez de Laravel Breeze, este proyecto está diseñado para servir como una base sólida para tus aplicaciones Nuxt.js.

---

## Importante

Este proyecto está en desarrollo activo y puede haber cambios significativos en el futuro. Si encuentras algún problema o tienes sugerencias, por favor abre un issue.

La configuración actual está diseñada para Nuxt.js v3.15. con compatibilityVersion: 4 en nuxt.config.ts la ruta de la carpeta de componentes cambia a app/components al igual que la carpeta de paginas app/pages entre otros.

Revise la [documentación oficial de Nuxt.js | Upgrade Guide | Opting in to Nuxt 4](https://nuxt.com/docs/getting-started/upgrade#opting-in-to-nuxt-4) para obtener más información.


## Instalación

Clona el repositorio y ejecuta los siguientes comandos para configurar el proyecto:

```bash
# Clonar el repositorio
git clone https://github.com/Isc-mntl-snchz/JetNuxtPrime

# Entrar al directorio del proyecto
cd JetNuxtPrime

# Instalar las dependencias
npm install

# Iniciar el servidor de desarrollo
npm run dev
```

---

## Características Incluidas

### 1. **PrimeVue**
PrimeVue está preconfigurado para que puedas utilizar componentes de UI fácilmente.
Ejemplo de uso:

```vue
<template>
  <Button label="Click Me" />
</template>
```
app/pages/index.vue

---

### 2. **Modo de Color (Claro/Oscuro)**
La configuración de `@nuxtjs/color-mode` permite alternar entre los modos de color claro y oscuro.

- La clase `dark` se aplica dinámicamente al `<html>`.
- Puedes cambiar el modo de color utilizando `useColorMode`:

```vue
<script setup lang="ts">const colorMode = useColorMode();

const changeColorMode = () => {
  colorMode.preference = colorMode.value = (colorMode.value === "dark") ? "light" : "dark";
};

const determianteIconMode = computed(() => {
  return (colorMode.value === "dark") ? "line-md:moon" : "line-md:sunny-filled-loop";
});

const determianteIconColorMode = computed(() => {
  return (colorMode.value === "dark") ? "text-xl text-white animate-bounce-slow transition-transform duration-500" : "text-yellow-800 animate-spin-slow transition-transform duration-500";
});
</script>

<template>
  <button @click="changeColorMode" class="flex items-center gap-2 outline-none"
    v-if="!$colorMode.unknown && !$colorMode.forced">
    <Icon :name="determianteIconMode" :class="determianteIconColorMode"></Icon>
  </button>
</template>
```

---

### 3. **Google Fonts**
Se incluye soporte para Google Fonts. Puedes modificar las fuentes desde `nuxt.config.ts`.

Por defecto, incluye:

```ts
export default defineNuxtConfig({
  ...,
 googleFonts: {
    families: {
      Montserrat: true,
      Roboto: true,
      Inter: [200, 400, 700],
      "Josefin+Sans": true,
      Lato: [100, 300],
      Raleway: {
        wght: [100, 400],
        ital: [100],
      },
      "Crimson Pro": {
        wght: "200..900",
        ital: "200..700",
      },
    },
  },
});
```

---

### 4. **TailwindCSS**
TailwindCSS está configurado con modo oscuro habilitado. Puedes personalizarlo desde `tailwind.config.js`.

```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [],
  theme: {
    fontFamily: {
      sans: ["Inter", "sans-serif"],
      lato: ["Lato", "sans-serif"],
      relaway: ["Raleway", "sans-serif"],
      crimson: ["Crimson Text", "serif"],
      roboto: ["Roboto", "sans-serif"],
      josefin: ["Josefin Sans", "sans-serif"],
      montserrat: ["Montserrat", "sans-serif"],
    },
    extend: {
      animation: {
        "spin-slow": " spin 5s linear infinite",
        'bounce-slow': 'bounce 5s infinite',
      },
    },
  },
  plugins: [],
};

```

---

## Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo.
- `npm run build`: Compila el proyecto para producción.
- `npm run preview`: Previsualiza el proyecto después de compilarlo.

---

## Próximos Pasos

1. **Autenticación**: Agregar autenticación básica utilizando Nuxt.js PrimeVue(con opciones para JWT o OAuth).
2. **Componentes Adicionales**: Incluir más componentes útiles de .
3. **Documentación**: Expandir la documentación del proyecto.

---

## Contribuciones

¡Las contribuciones son bienvenidas! Si tienes ideas o mejoras, por favor abre un issue o envía un pull request.

---

## Licencia

Este proyecto está bajo la [MIT License](LICENSE).

