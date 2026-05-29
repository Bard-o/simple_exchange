# Master Prompt — *Simple Exchange*

---

## Visión general

Construir una app web de conversión de divisas llamada **Simple Exchange**. La app vive en escritorio pero con layout de columna centrada tipo móvil (~420px de ancho máximo). Stack: **React + TypeScript + Tailwind CSS + Vite**, desplegada en **Vercel**.

---

## API de datos

**currencyapi.com** — API key guardada como variable de entorno en Vercel (`VITE_CURRENCY_API_KEY`).

Dos endpoints a usar:
- `GET /latest` — tasas actuales entre monedas seleccionadas
- `GET /historical?date=YYYY-MM-DD` — tasa de un día específico (para construir las gráficas)

> Las llamadas al histórico se hacen día por día en el rango seleccionado. Con el plan gratuito (300 req/mes) hay que ser cuidadoso: **cachear en `sessionStorage`** los resultados históricos para no repetir llamadas en la misma sesión.

---

## Flujo de pantalla (4 estados)

**Estado 1 — Vacío**
Un único botón rectangular con bordes redondeados: `+ add base currency`. Centrado vertical y horizontalmente en la pantalla.

**Estado 2 — Selector de moneda**
Modal o panel overlay al hacer click en cualquier botón de agregar. Muestra una grilla de monedas disponibles (las más comunes primero: USD, EUR, COP, GBP, JPY, BRL, MXN, ARS, etc.). Debe tener un campo de búsqueda por nombre o código. Al seleccionar, cierra el selector y actualiza el estado.

**Estado 3 — Una moneda seleccionada**
La moneda base aparece como un input editable con su código y valor. Debajo, aparece el botón `+ add currency`. Al lado del input: íconos para **cambiar** (abre el selector de nuevo) y **eliminar** (solo disponible si hay más de una moneda).

**Estado 4 — Dos o más monedas**
Todos los inputs están activos. Al editar cualquier input, los demás se recalculan en tiempo real usando las tasas actuales. Máximo **4 monedas** (base + 3 adicionales). Cuando se llega a 4, el botón `+ add currency` desaparece.

Debajo de los inputs: sección de **gráficas históricas**, una por cada moneda adicional (vs. la base). Cada gráfica tiene un **selector horizontal de período**: `7D` / `30D`.

---

## Lógica de conversión

- Las tasas se obtienen con la base como moneda origen.
- Al editar el input de la base, se multiplica su valor por la tasa correspondiente para cada moneda adicional.
- Al editar el input de una moneda adicional, se recalcula la base dividiendo por la tasa, y luego se recalculan todas las demás.
- Las tasas se refrescan automáticamente cada 10 minutos o al recargar.

---

## Gráficas históricas

- Librería: **Recharts**
- Una gráfica por moneda adicional, etiquetada como `[CÓDIGO_ADICIONAL] to [CÓDIGO_BASE]`
- Eje X: fechas. Eje Y: tasa de cambio.
- Selector `7D` / `30D` tipo pill horizontal, encima o debajo del título de la gráfica.
- Los datos se cachean en `sessionStorage` con clave `history_{FROM}_{TO}_{DATE}`.

---

## Persistencia

`localStorage` guarda:
- Las monedas seleccionadas (códigos y orden)
- El último valor ingresado en la base

Al cargar la app, si hay datos en `localStorage`, se restaura el estado 3 o 4 directamente.

---

## Estética visual

La dirección estética es **retro indie web con influencia Frutiger Aero**, pero con una paleta dominada por **rojos** — lo que crea una tensión deliberada entre lo orgánico/glassy del Aero y la energía del rojo. Debe sentirse único, no pulido en exceso.

Algunas ideas sueltas a expandir durante el diseño:
- Fondos con gradientes sutiles, quizás con algo de textura o ruido
- Botones y inputs con apariencia ligeramente "physical" — sombras internas, bordes con profundidad
- Tipografía con carácter, no solo sans-serif genérica
- Las gráficas pueden tener un estilo que recuerde a software de escritorio de los 2000s
- El contraste entre el rojo y un fondo claro o crema puede funcionar mejor que rojo sobre oscuro

> **Nota para el agente:** antes de implementar el diseño visual, consultar las design skills disponibles para guiar decisiones de paleta, componentes y tokens.

---

## Estructura de archivos sugerida

```
src/
  components/
    CurrencyInput.tsx
    CurrencySelector.tsx
    HistoryChart.tsx
    PeriodSelector.tsx
  hooks/
    useExchangeRates.ts
    useHistoricalRates.ts
    useCurrencyStore.ts
  utils/
    cache.ts
    formatters.ts
  App.tsx
  main.tsx
.env.local         ← VITE_CURRENCY_API_KEY
```

---

## Constraints finales

- Máximo 4 monedas simultáneas
- Sin backend, sin autenticación
- Todos los llamados a la API van con la key desde env vars (nunca hardcodeada)
- La app debe funcionar offline para los datos ya cacheados (degradación elegante si la API falla)
- Deploy en Vercel con la env var configurada desde el dashboard
