# Plan de Implementación: Vizta Periodista + Sistema de Predicción

**Fecha:** 2025-11-05
**Sistema:** Vizta Chat (ExtractorW + ThePulse)
**Objetivo:** Transformar Vizta en un periodista investigador y agregar capacidad de predicción basada en datos

---

## 🎯 Visión General

### Feature 1: Rol de Periodista Investigador
Vizta adoptará el rol de un periodista profesional que:
- **Cuestiona todo**: No acepta información sin verificar
- **Investiga profundamente**: Busca múltiples fuentes y perspectivas
- **Contrasta datos**: Compara información de diferentes fuentes
- **Presenta hallazgos**: Organiza información de forma estructurada y objetiva

### Feature 2: Sistema de Predicción con Datos Cuantificables
- **Captura automática** de datos cuantificables (#, $, %, cantidades, fechas)
- **Tab de Datos** en el frontend mostrando todos los datos capturados
- **Botón "+"** para activar modo predicción
- **Análisis predictivo** basado en datos históricos del chat
- **UI Generativa** para visualización dinámica de predicciones

---

## 📋 FASE 1: Fundamentos (Rol Periodista + Tab Datos)

### 1.1 Rol de Periodista en Reasoning Layer

**Archivo:** `server/services/agents/vizta/reasoningLayer.js`

#### Cambios en `systemPrompt`:
```javascript
// ANTES: "Eres Vizta, un asistente AI conversacional para Guatemala"
// DESPUÉS: "Eres Vizta, un periodista AI investigador para Guatemala"
```

#### Nuevo comportamiento del agente:

**1. Prompt del Periodista (añadir a `analyzeWithGrok`):**
```javascript
const journalistSystemPrompt = `Eres Vizta, un PERIODISTA AI INVESTIGADOR profesional.

TU ROL:
- Cuestiona la información recibida
- Busca múltiples fuentes independientes
- Verifica hechos antes de presentarlos
- Detecta sesgos y perspectivas faltantes
- Investiga con profundidad, no superficialidad

METODOLOGÍA PERIODÍSTICA:
1. ¿Quién? - Identifica las fuentes y actores
2. ¿Qué? - Define el hecho central
3. ¿Cuándo? - Contextualiza temporalmente
4. ¿Dónde? - Localiza geográficamente
5. ¿Por qué? - Busca causas y motivaciones
6. ¿Cómo? - Explica el proceso o mecanismo

VERIFICACIÓN DE FUENTES:
- Prefiere fuentes primarias sobre secundarias
- Contrasta información entre múltiples fuentes
- Identifica conflictos de interés
- Marca información no verificada claramente

PRESENTACIÓN:
- Separa HECHOS de OPINIONES
- Presenta múltiples perspectivas cuando existan
- Usa lenguaje preciso y objetivo
- Cita fuentes específicas para cada afirmación

DETECCIÓN DE DATOS:
- Identifica y extrae TODOS los datos cuantificables:
  * Números: cantidades, estadísticas, porcentajes
  * Dinero: precios, presupuestos, costos ($, Q, etc)
  * Fechas: eventos, plazos, períodos
  * Métricas: tasas, ratios, comparaciones
- Marca estos datos para captura automática
`;
```

**2. Lógica de Verificación Cruzada:**
```javascript
async _verifyWithMultipleSources(topic, toolResults) {
  // Analiza resultados de perplexity_search, exa_search, latest_trends
  // Busca consistencia entre fuentes
  // Marca información que solo aparece en una fuente
  // Retorna: {verified: [], unverified: [], conflicting: []}
}
```

**3. Extracción de Datos Cuantificables:**
```javascript
_extractQuantifiableData(toolResults, synthesisText) {
  const patterns = {
    money: /(?:Q|GTQ|\$|USD|€|EUR)\s*[\d,]+\.?\d*/g,
    percentage: /\d+\.?\d*\s*%/g,
    numbers: /\d{1,3}(?:,\d{3})*(?:\.\d+)?(?=\s+(?:millones?|miles?|billones?|personas?|usuarios?|casos?|votos?))/gi,
    dates: /\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}/g,
  };

  const extracted = {
    money: [],
    percentages: [],
    quantities: [],
    dates: [],
    metrics: []
  };

  // Extrae con contexto (3 palabras antes y después)
  // Retorna: [{value, type, context, source, confidence}]
}
```

**Integración en `synthesizeWithGrok`:**
```javascript
// Después de generar respuesta, extraer datos
const quantifiableData = this._extractQuantifiableData(toolResults, synthesizedMessage);
const verifiedSources = await this._verifyWithMultipleSources(userMessage, toolResults);

return {
  message: synthesizedMessage,
  sources: extractedSources,
  quantifiableData,  // NUEVO
  sourceVerification: verifiedSources,  // NUEVO
  journalistAnalysis: {  // NUEVO
    factCount: verifiedSources.verified.length,
    sourcesConsulted: extractedSources.length,
    dataPoints: quantifiableData.length,
    verificationLevel: this._calculateVerificationScore(verifiedSources)
  }
};
```

---

### 1.2 Tab de Datos en Frontend

**Archivo:** `ThePulse/src/components/ui/vizta-chat.tsx`

#### Estructura de Datos:
```typescript
interface QuantifiableData {
  value: string;           // "Q1,500,000" | "45%" | "1,234 usuarios"
  type: 'money' | 'percentage' | 'quantity' | 'date' | 'metric';
  context: string;         // "presupuesto asignado para educación"
  source: string;          // URL o nombre de fuente
  confidence: number;      // 0-1
  extractedAt: string;     // ISO timestamp
}

interface ViztaMessage {
  // ... existing fields
  quantifiableData?: QuantifiableData[];
}
```

#### UI del Tab "Datos":
```tsx
// Añadir después del tab "Fuentes" (línea ~447)
{hasData && (
  <TabsTrigger value="data" className="text-xs gap-1.5">
    <Hash className="h-3 w-3" />
    Datos
  </TabsTrigger>
)}

// Contenido del tab (después de línea ~560)
{hasData && (
  <TabsContent value="data" className="space-y-3">
    <div className="text-xs text-gray-500 mb-2">
      {message.quantifiableData!.length} datos capturados
    </div>

    {/* Agrupar por tipo */}
    {['money', 'percentage', 'quantity', 'date', 'metric'].map(type => {
      const dataOfType = message.quantifiableData!.filter(d => d.type === type);
      if (dataOfType.length === 0) return null;

      return (
        <div key={type} className="space-y-2">
          <div className="text-xs font-semibold text-gray-700 uppercase">
            {type === 'money' ? '💰 Valores Monetarios' :
             type === 'percentage' ? '📊 Porcentajes' :
             type === 'quantity' ? '🔢 Cantidades' :
             type === 'date' ? '📅 Fechas' :
             '📈 Métricas'}
          </div>

          {dataOfType.map((data, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm font-semibold text-blue-600 mb-1">
                    {data.value}
                  </div>
                  <div className="text-xs text-gray-600 mb-1">
                    {data.context}
                  </div>
                  {data.source && (
                    <div className="text-xs text-gray-400 truncate">
                      Fuente: {data.source}
                    </div>
                  )}
                </div>

                {/* Indicador de confianza */}
                <div className="flex-shrink-0">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    data.confidence > 0.8 ? "bg-green-500" :
                    data.confidence > 0.5 ? "bg-yellow-500" :
                    "bg-red-500"
                  )} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      );
    })}
  </TabsContent>
)}
```

#### Backend Response Update:
**Archivo:** `server/routes/viztaChat.js`

```javascript
// En processChatMode, añadir a la respuesta (línea ~267):
return {
  success: true,
  response: {agent: 'Vizta', message: responseMessage, ...},
  conversationId: sessionId,
  sources: result.sources || [],
  quantifiableData: result.quantifiableData || [],  // NUEVO
  keyFacts: result.keyFacts || [],
  capturedItems: result.capturedItems || [],
  termSuggestions: result.termSuggestions || [],
  metadata: {
    mode: 'chat',
    processingTime: result.processingTime || Date.now() - startTime,
    toolsUsed: result.toolsUsed || ...,
    dualModelFlow: result.dualModelFlow || false,
    trendsFreshness: result.trendsFreshness,
    journalistAnalysis: result.journalistAnalysis || null  // NUEVO
  }
};
```

---

## 📋 FASE 2: Predicción Inteligente

### 2.1 UI del Botón de Predicción

**Ubicación:** Junto al input de chat en `vizta-chat.tsx`

```tsx
// Añadir estado
const [predictionMode, setPredictionMode] = useState(false);
const [predictionLoading, setPredictionLoading] = useState(false);

// Botón "+" en el área de input (línea ~1300)
<div className="flex items-center gap-2">
  <button
    onClick={() => handlePredictionMode()}
    disabled={!hasQuantifiableData || predictionLoading}
    className={cn(
      "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
      hasQuantifiableData && !predictionLoading
        ? "bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200"
        : "bg-gray-100 text-gray-400 cursor-not-allowed"
    )}
    title="Generar predicción basada en datos del chat"
  >
    {predictionLoading ? (
      <Loader2 className="h-4 w-4 animate-spin" />
    ) : (
      <Plus className="h-4 w-4" />
    )}
    <span>Predecir</span>
    {hasQuantifiableData && (
      <span className="bg-purple-200 text-purple-700 px-1.5 rounded-full text-xs">
        {totalDataPoints}
      </span>
    )}
  </button>

  {/* Input normal */}
  <input ... />
</div>

// Helper para contar datos
const hasQuantifiableData = messages.some(m =>
  m.sender === 'assistant' && m.quantifiableData && m.quantifiableData.length > 0
);

const totalDataPoints = messages
  .filter(m => m.sender === 'assistant')
  .reduce((sum, m) => sum + (m.quantifiableData?.length || 0), 0);
```

---

### 2.2 Sistema de Predicción Backend

**Nuevo archivo:** `server/services/agents/vizta/predictionEngine.js`

```javascript
const { OpenAI } = require('openai');

class PredictionEngine {
  constructor() {
    this.grok = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: 'https://api.x.ai/v1'
    });
  }

  /**
   * Genera predicción basada en datos cuantificables del historial
   */
  async generatePrediction(conversationHistory, quantifiableDataset) {
    console.log('[PREDICTION] 🔮 Generating prediction from', quantifiableDataset.length, 'data points');

    // 1. Analizar patrones en los datos
    const patterns = this._analyzePatterns(quantifiableDataset);

    // 2. Identificar tendencias temporales
    const trends = this._identifyTrends(quantifiableDataset);

    // 3. Generar predicción con Grok
    const prediction = await this._generateWithGrok(
      conversationHistory,
      quantifiableDataset,
      patterns,
      trends
    );

    return {
      prediction: prediction.message,
      confidence: prediction.confidence,
      dataPointsUsed: quantifiableDataset.length,
      patterns,
      trends,
      visualizations: this._generateVisualizationConfig(quantifiableDataset, prediction),
      methodology: prediction.methodology
    };
  }

  _analyzePatterns(dataset) {
    // Busca patrones en los datos
    const byType = this._groupByType(dataset);
    const patterns = [];

    // Patrones de crecimiento/decrecimiento
    if (byType.money && byType.money.length > 1) {
      const sorted = this._sortByDate(byType.money);
      const trend = this._calculateTrend(sorted);
      if (Math.abs(trend.slope) > 0.1) {
        patterns.push({
          type: 'monetary_trend',
          direction: trend.slope > 0 ? 'crecimiento' : 'decrecimiento',
          magnitude: Math.abs(trend.slope),
          confidence: trend.r2
        });
      }
    }

    // Patrones de periodicidad
    if (byType.dates && byType.dates.length > 2) {
      const intervals = this._calculateIntervals(byType.dates);
      const periodic = this._detectPeriodicity(intervals);
      if (periodic.isPeriodic) {
        patterns.push({
          type: 'periodic',
          period: periodic.period,
          confidence: periodic.confidence
        });
      }
    }

    // Patrones de correlación
    const correlations = this._findCorrelations(dataset);
    patterns.push(...correlations);

    return patterns;
  }

  _identifyTrends(dataset) {
    // Identifica tendencias temporales
    const timeSeries = dataset
      .filter(d => d.extractedAt)
      .sort((a, b) => new Date(a.extractedAt) - new Date(b.extractedAt));

    if (timeSeries.length < 3) return { hasTrend: false };

    // Agrupa por tipo y calcula tendencias
    const trends = {};
    for (const type of ['money', 'percentage', 'quantity']) {
      const typeData = timeSeries.filter(d => d.type === type);
      if (typeData.length >= 2) {
        trends[type] = this._calculateTrend(typeData);
      }
    }

    return {
      hasTrend: Object.keys(trends).length > 0,
      trends,
      timeRange: {
        start: timeSeries[0].extractedAt,
        end: timeSeries[timeSeries.length - 1].extractedAt
      }
    };
  }

  async _generateWithGrok(history, dataset, patterns, trends) {
    const systemPrompt = `Eres un ANALISTA PREDICTIVO experto en análisis de datos y forecasting.

TU TAREA:
Generar una predicción fundamentada basándote en:
1. Datos cuantificables extraídos de la conversación
2. Patrones identificados en esos datos
3. Tendencias temporales detectadas
4. Contexto de la conversación

METODOLOGÍA:
1. Analiza la calidad y cantidad de datos disponibles
2. Evalúa la confiabilidad de cada dato
3. Identifica relaciones causales y correlaciones
4. Proyecta tendencias futuras con intervalos de confianza
5. Presenta escenarios: optimista, base, pesimista

FORMATO DE RESPUESTA:
- Comienza con resumen ejecutivo de la predicción
- Explica la metodología usada
- Presenta datos que sustentan la predicción
- Incluye nivel de confianza y factores de riesgo
- Sugiere datos adicionales que mejorarían la predicción

IMPORTANTE:
- Sé honesto sobre limitaciones (pocos datos, datos antiguos, etc)
- No hagas predicciones sin fundamento suficiente
- Marca claramente suposiciones vs datos verificados
- Cuantifica la incertidumbre

Datos disponibles: ${dataset.length}
Patrones detectados: ${patterns.length}
Tendencias identificadas: ${trends.hasTrend ? 'Sí' : 'No'}`;

    const userPrompt = `Genera una predicción basada en estos datos:

**Datos capturados:**
${JSON.stringify(dataset, null, 2)}

**Patrones detectados:**
${JSON.stringify(patterns, null, 2)}

**Tendencias:**
${JSON.stringify(trends, null, 2)}

**Contexto de conversación:**
${history.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}

Genera tu predicción ahora.`;

    const response = await this.grok.chat.completions.create({
      model: 'grok-beta',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3 // Baja temperatura para predicciones más conservadoras
    });

    const message = response.choices[0].message.content;

    // Extraer nivel de confianza del mensaje
    const confidenceMatch = message.match(/confianza[:\s]+(\d+)%/i);
    const confidence = confidenceMatch
      ? parseInt(confidenceMatch[1]) / 100
      : this._calculateConfidence(dataset.length, patterns.length);

    return {
      message,
      confidence,
      methodology: this._extractMethodology(message),
      limitations: this._extractLimitations(message)
    };
  }

  _generateVisualizationConfig(dataset, prediction) {
    // Genera configuración para UI Generativa
    const visualizations = [];

    // Si hay tendencia temporal → gráfico de línea
    const timeSeriesData = dataset.filter(d => d.extractedAt && d.type === 'money');
    if (timeSeriesData.length >= 2) {
      visualizations.push({
        type: 'line_chart',
        title: 'Tendencia Temporal',
        data: timeSeriesData.map(d => ({
          date: d.extractedAt,
          value: this._parseNumericValue(d.value),
          label: d.context
        })),
        prediction: prediction.confidence > 0.5 // Mostrar proyección si confianza > 50%
      });
    }

    // Si hay múltiples categorías → gráfico de barras
    const categories = this._groupByContext(dataset);
    if (Object.keys(categories).length > 1) {
      visualizations.push({
        type: 'bar_chart',
        title: 'Comparación por Categoría',
        data: Object.entries(categories).map(([key, values]) => ({
          category: key,
          value: values.reduce((sum, v) => sum + this._parseNumericValue(v.value), 0),
          count: values.length
        }))
      });
    }

    // Indicador de confianza
    visualizations.push({
      type: 'confidence_indicator',
      value: prediction.confidence,
      label: 'Nivel de Confianza',
      dataPoints: dataset.length
    });

    return visualizations;
  }

  _calculateConfidence(dataPoints, patterns) {
    // Fórmula simple: más datos y patrones = mayor confianza
    const dataScore = Math.min(dataPoints / 10, 1); // Max 1.0 con 10+ datos
    const patternScore = Math.min(patterns / 3, 1); // Max 1.0 con 3+ patrones
    return (dataScore * 0.6 + patternScore * 0.4);
  }

  // ... helper methods para análisis estadístico
}

module.exports = { PredictionEngine };
```

---

### 2.3 Integración con UI Generativa

**Componente de Predicción:** `ThePulse/src/components/ui/prediction-view.tsx`

```tsx
interface PredictionViewProps {
  prediction: {
    message: string;
    confidence: number;
    dataPointsUsed: number;
    patterns: Pattern[];
    trends: Trends;
    visualizations: VisualizationConfig[];
  };
}

export const PredictionView = ({ prediction }: PredictionViewProps) => {
  return (
    <div className="space-y-4 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200">
      {/* Header con confianza */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Predicción Generada
        </h3>
        <ConfidenceIndicator value={prediction.confidence} />
      </div>

      {/* Mensaje de predicción */}
      <div className="bg-white rounded-lg p-4 border border-purple-100">
        <ReactMarkdown>{prediction.message}</ReactMarkdown>
      </div>

      {/* Visualizaciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {prediction.visualizations.map((viz, idx) => (
          <VisualizationCard key={idx} config={viz} />
        ))}
      </div>

      {/* Metadatos */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>📊 {prediction.dataPointsUsed} datos analizados</span>
        <span>🔍 {prediction.patterns.length} patrones detectados</span>
        <span>📈 Confianza: {(prediction.confidence * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
};
```

**Integración en `vizta-chat.tsx`:**

```tsx
// Cuando el mensaje tiene predicción
{message.prediction && (
  <div className="mt-4">
    <PredictionView prediction={message.prediction} />
  </div>
)}
```

---

## 🔧 Resumen Técnico

### Archivos a Crear:
1. `server/services/agents/vizta/predictionEngine.js` - Motor de predicción
2. `ThePulse/src/components/ui/prediction-view.tsx` - Vista de predicción
3. `ThePulse/src/components/ui/confidence-indicator.tsx` - Indicador de confianza
4. `ThePulse/src/components/ui/visualization-card.tsx` - Tarjetas de visualización

### Archivos a Modificar:
1. `server/services/agents/vizta/reasoningLayer.js`:
   - Añadir rol de periodista
   - Método `_extractQuantifiableData()`
   - Método `_verifyWithMultipleSources()`
   - Actualizar `synthesizeWithGrok()` con nuevo prompt

2. `server/services/agents/vizta/index.js`:
   - Integrar `PredictionEngine`
   - Nuevo método `generatePrediction()`
   - Pasar datos cuantificables en respuesta

3. `server/routes/viztaChat.js`:
   - Añadir `quantifiableData` a respuesta
   - Nueva ruta `/predict` para modo predicción
   - Incluir `journalistAnalysis` en metadata

4. `ThePulse/src/components/ui/vizta-chat.tsx`:
   - Tab "Datos" con grid de datos cuantificables
   - Botón "+" para predicción
   - Vista de predicción con UI generativa
   - Estado para `predictionMode`

### Variables de Entorno:
```bash
# Ya existentes
XAI_API_KEY=your_xai_key
VIZTA_USE_DUAL_MODEL=true

# Nuevas (si se usan servicios adicionales)
PREDICTION_MIN_DATAPOINTS=3  # Mínimo de datos para predicción
PREDICTION_CONFIDENCE_THRESHOLD=0.3  # Mínimo de confianza para mostrar
```

---

## 💡 Sugerencias y Mejoras

### ✅ IMPLEMENTADO EN PLAN: Sugerencia 1 - **Verificación de Fuentes en Tiempo Real**

**APIs Recomendadas:**

#### 1. **NewsGuard API** (Opción Premium)
- **Cobertura:** 35,000+ fuentes online (95%+ del engagement con noticias)
- **Scoring:** 0-100 puntos basado en 9 criterios apolíticos
- **Acceso:** API REST, Web Dashboard, Cloud Datastream
- **Costo:** Licencia comercial (contactar ventas)
- **Ventajas:**
  - Ratings detallados con "Nutrition Labels"
  - Análisis de credibilidad y transparencia
  - Actualización constante de ratings
  - Usado por instituciones de investigación y plataformas tech
- **Sitio:** https://www.newsguardtech.com/solutions/news-reliability-ratings/

#### 2. **Media Bias/Fact Check API** (Opción Accesible) ⭐ RECOMENDADA
- **Cobertura:** 9,000+ fuentes
- **Datos:** Bias político + Factual Reporting Score + Credibilidad
- **Acceso:** RapidAPI (https://rapidapi.com)
- **Costo:** Freemium (planes desde gratis hasta enterprise)
- **Ventajas:**
  - Más económico que NewsGuard
  - Fácil integración via RapidAPI
  - Ratings de bias político y precisión factual
  - Documentación completa para developers
- **Sitio:** https://mediabiasfactcheck.com/mbfcs-data-api/

#### 3. **Factiverse API** (Opción Fact-Checking en Tiempo Real)
- **Cobertura:** 220M+ artículos científicos + Google/Bing/Wikipedia
- **Funcionalidad:** Verificación de claims en tiempo real
- **Ventajas:**
  - Fact-checking automático durante escritura
  - Integración con Semantic Scholar
  - Usado en debates políticos en vivo
- **Sitio:** https://www.factiverse.ai/

**Implementación Recomendada:**
```javascript
// server/services/agents/vizta/sourceVerifier.js
const axios = require('axios');

class SourceVerifier {
  constructor() {
    this.mbfcApiKey = process.env.MBFC_RAPIDAPI_KEY;
    this.mbfcApiUrl = 'https://media-bias-fact-check1.p.rapidapi.com';
  }

  async verifySourceCredibility(url) {
    try {
      const domain = new URL(url).hostname.replace('www.', '');

      const response = await axios.get(`${this.mbfcApiUrl}/source/${domain}`, {
        headers: {
          'X-RapidAPI-Key': this.mbfcApiKey,
          'X-RapidAPI-Host': 'media-bias-fact-check1.p.rapidapi.com'
        }
      });

      return {
        domain,
        credibility: response.data.factualReporting || 'unknown', // 'Very High', 'High', 'Mixed', 'Low', 'Very Low'
        bias: response.data.bias || 'unknown', // 'Left', 'Left-Center', 'Center', 'Right-Center', 'Right'
        score: this._convertToScore(response.data.factualReporting),
        details: response.data.notes || '',
        verified: true
      };
    } catch (error) {
      console.log(`[SOURCE_VERIFIER] Could not verify ${url}:`, error.message);
      return {
        domain: new URL(url).hostname,
        credibility: 'unknown',
        bias: 'unknown',
        score: 50, // neutral
        verified: false
      };
    }
  }

  _convertToScore(factualReporting) {
    const scoreMap = {
      'Very High': 95,
      'High': 80,
      'Mostly Factual': 70,
      'Mixed': 50,
      'Low': 30,
      'Very Low': 10
    };
    return scoreMap[factualReporting] || 50;
  }

  async verifyMultipleSources(sources) {
    const verifications = await Promise.all(
      sources.map(source => this.verifySourceCredibility(source.url))
    );

    return sources.map((source, idx) => ({
      ...source,
      verification: verifications[idx]
    }));
  }
}

module.exports = { SourceVerifier };
```

**Variables de Entorno:**
```bash
# .env
MBFC_RAPIDAPI_KEY=your_rapidapi_key_here
# o si usas NewsGuard:
NEWSGUARD_API_KEY=your_newsguard_key_here
```

---

### ⚠️ MOVIDO A FASE 3: Sugerencia 2 - **Predicción con "What-If"**
**Feature:** El usuario ajusta un valor y ve cómo cambia la predicción
**Ejemplo:**
```tsx
<WhatIfSimulator>
  <Slider
    label="¿Qué pasaría si el presupuesto fuera..."
    value={budget}
    onChange={(v) => recalculatePrediction({...data, budget: v})}
  />
</WhatIfSimulator>
```

---

### ✅ IMPLEMENTADO EN PLAN: Sugerencia 3 - **Export de Datos + Spreadsheet Interno**

**Actualización Tab de Datos:**
```tsx
// Añadir al TabsContent de "Datos"
<div className="flex items-center justify-between mb-3">
  <div className="text-xs text-gray-500">
    {message.quantifiableData!.length} datos capturados
  </div>

  <div className="flex items-center gap-2">
    {/* Botón: Añadir a Spreadsheet */}
    <button
      onClick={() => handleAddToSpreadsheet(message.quantifiableData)}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors border border-blue-200"
    >
      <TableIcon className="h-3.5 w-3.5" />
      Añadir a Spreadsheet
    </button>

    {/* Botón: Exportar CSV */}
    <button
      onClick={() => handleExportCSV(message.quantifiableData)}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-xs font-medium transition-colors border border-green-200"
    >
      <Download className="h-3.5 w-3.5" />
      Exportar CSV
    </button>
  </div>
</div>
```

**Funciones de Export:**
```tsx
// En vizta-chat.tsx
const handleExportCSV = (data: QuantifiableData[]) => {
  // Generar CSV
  const headers = ['Valor', 'Tipo', 'Contexto', 'Fuente', 'Confianza', 'Fecha'];
  const rows = data.map(d => [
    d.value,
    d.type,
    d.context,
    d.source,
    (d.confidence * 100).toFixed(0) + '%',
    new Date(d.extractedAt).toLocaleString('es-GT')
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Descargar
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `vizta-datos-${Date.now()}.csv`;
  link.click();

  toast.success(`${data.length} datos exportados a CSV`);
};

const handleAddToSpreadsheet = async (data: QuantifiableData[]) => {
  try {
    // Llamar a API de ThePulse para añadir a spreadsheet interno
    const response = await fetch('/api/spreadsheet/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data,
        sheetName: 'Vizta Datos',
        timestamp: new Date().toISOString()
      })
    });

    if (response.ok) {
      toast.success(`${data.length} datos añadidos al spreadsheet`);
    } else {
      throw new Error('Error al añadir datos');
    }
  } catch (error) {
    toast.error('No se pudieron añadir los datos al spreadsheet');
    console.error(error);
  }
};
```

---

### ✅ IMPLEMENTADO EN PLAN: Sugerencia 4 - **Alertas de Anomalías**
**Concepto:** El periodista detecta datos inconsistentes o sospechosos

**Implementación en `reasoningLayer.js`:**
```javascript
_detectAnomalies(quantifiableData) {
  const warnings = [];
  const byType = this._groupByType(quantifiableData);

  // Detectar outliers en valores monetarios
  if (byType.money && byType.money.length > 2) {
    const values = byType.money.map(d => this._parseNumericValue(d.value));
    const stats = this._calculateStats(values);

    byType.money.forEach(d => {
      const numValue = this._parseNumericValue(d.value);
      if (numValue > stats.median * 3) {
        warnings.push({
          type: 'outlier',
          severity: 'high',
          message: `Valor ${d.value} es 3x superior al promedio - Verificar fuente`,
          data: d,
          recommendation: 'Buscar fuentes adicionales que confirmen esta cifra'
        });
      }
    });
  }

  // Detectar conflictos entre fuentes
  const conflicts = this._findConflictingData(quantifiableData);
  if (conflicts.length > 0) {
    warnings.push({
      type: 'conflict',
      severity: 'medium',
      message: 'Fuentes reportan valores diferentes para el mismo dato',
      conflicts,
      recommendation: 'Priorizar fuente más confiable o marcar como dato disputado'
    });
  }

  // Detectar datos antiguos
  const staleData = quantifiableData.filter(d => {
    const age = Date.now() - new Date(d.extractedAt).getTime();
    return age > 30 * 24 * 60 * 60 * 1000; // >30 días
  });

  if (staleData.length > 0) {
    warnings.push({
      type: 'stale',
      severity: 'low',
      message: `${staleData.length} datos tienen más de 30 días de antigüedad`,
      data: staleData,
      recommendation: 'Buscar datos más recientes si es posible'
    });
  }

  return warnings;
}
```

**UI de Alertas (en Tab Datos):**
```tsx
{anomalyWarnings.length > 0 && (
  <div className="mb-4 space-y-2">
    {anomalyWarnings.map((warning, idx) => (
      <div
        key={idx}
        className={cn(
          "flex items-start gap-3 p-3 rounded-lg border",
          warning.severity === 'high' ? "bg-red-50 border-red-200" :
          warning.severity === 'medium' ? "bg-yellow-50 border-yellow-200" :
          "bg-blue-50 border-blue-200"
        )}
      >
        <AlertTriangle className={cn(
          "h-4 w-4 mt-0.5",
          warning.severity === 'high' ? "text-red-600" :
          warning.severity === 'medium' ? "text-yellow-600" :
          "text-blue-600"
        )} />
        <div className="flex-1">
          <div className="text-xs font-semibold text-gray-900 mb-1">
            {warning.message}
          </div>
          <div className="text-xs text-gray-600">
            {warning.recommendation}
          </div>
        </div>
      </div>
    ))}
  </div>
)}
```

---

### ✅ IMPLEMENTADO EN PLAN: Sugerencia 5 - **Timeline Interactivo con UI Generativa**
**Visualización:** Línea de tiempo con todos los eventos/datos del chat

**Componente Timeline (Fase 2):**
```tsx
// ThePulse/src/components/ui/timeline-view.tsx
import { motion } from 'framer-motion';

interface TimelineViewProps {
  data: QuantifiableData[];
}

export const TimelineView = ({ data }: TimelineViewProps) => {
  const sortedData = [...data].sort((a, b) =>
    new Date(a.extractedAt).getTime() - new Date(b.extractedAt).getTime()
  );

  return (
    <div className="relative py-4">
      {/* Línea vertical central */}
      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-purple-200 to-blue-200" />

      {sortedData.map((item, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className={cn(
            "relative flex items-center gap-4 mb-6",
            idx % 2 === 0 ? "flex-row" : "flex-row-reverse"
          )}
        >
          {/* Contenido */}
          <div className={cn(
            "w-5/12 p-4 rounded-lg border bg-white shadow-sm hover:shadow-md transition-shadow",
            idx % 2 === 0 ? "text-right" : "text-left"
          )}>
            <div className="font-mono text-sm font-semibold text-blue-600 mb-1">
              {item.value}
            </div>
            <div className="text-xs text-gray-600 mb-2">
              {item.context}
            </div>
            <div className="text-xs text-gray-400">
              {new Date(item.extractedAt).toLocaleDateString('es-GT', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>

          {/* Punto central */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <div className={cn(
              "w-4 h-4 rounded-full border-2 border-white shadow-md",
              item.type === 'money' ? "bg-green-500" :
              item.type === 'percentage' ? "bg-blue-500" :
              item.type === 'quantity' ? "bg-purple-500" :
              item.type === 'date' ? "bg-orange-500" :
              "bg-gray-500"
            )} />
          </div>

          {/* Espacio vacío del otro lado */}
          <div className="w-5/12" />
        </motion.div>
      ))}
    </div>
  );
};
```

**Integración en Predicción View:**
```tsx
// Añadir tab de Timeline en visualizaciones de predicción
{prediction.visualizations.map((viz) => {
  if (viz.type === 'timeline') {
    return <TimelineView data={viz.data} />;
  }
  // ... otros tipos de visualizaciones
})}
```

---

### ✅ IMPLEMENTADO EN PLAN: Sugerencia 6 - **Confianza Explicada**
**Mejora:** No solo mostrar "75% confianza", explicar POR QUÉ

**Componente ConfidenceBreakdown (Fase 2):**
```tsx
// ThePulse/src/components/ui/confidence-breakdown.tsx
interface ConfidenceBreakdownProps {
  breakdown: {
    dataQuantity: { score: number; weight: number };
    sourceQuality: { score: number; weight: number };
    temporalConsistency: { score: number; weight: number };
    patternStrength: { score: number; weight: number };
  };
  total: number;
}

export const ConfidenceBreakdown = ({ breakdown, total }: ConfidenceBreakdownProps) => {
  const factors = [
    { label: 'Cantidad de datos', ...breakdown.dataQuantity, icon: Hash },
    { label: 'Calidad de fuentes', ...breakdown.sourceQuality, icon: Shield },
    { label: 'Consistencia temporal', ...breakdown.temporalConsistency, icon: Clock },
    { label: 'Fuerza de patrones', ...breakdown.patternStrength, icon: TrendingUp }
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">
        Desglose de Confianza
      </h4>

      <div className="space-y-3">
        {factors.map((factor, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <factor.icon className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-gray-700">{factor.label}</span>
                <span className="text-gray-400">({(factor.weight * 100).toFixed(0)}%)</span>
              </div>
              <span className="font-mono font-semibold text-gray-900">
                {(factor.score * 100).toFixed(0)}%
              </span>
            </div>

            {/* Barra de progreso */}
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${factor.score * 100}%` }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className={cn(
                  "h-full rounded-full",
                  factor.score > 0.8 ? "bg-green-500" :
                  factor.score > 0.5 ? "bg-yellow-500" :
                  "bg-red-500"
                )}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">
            Confianza Total
          </span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600">
              {(total * 100).toFixed(0)}%
            </span>
            <div className={cn(
              "w-3 h-3 rounded-full",
              total > 0.7 ? "bg-green-500" :
              total > 0.4 ? "bg-yellow-500" :
              "bg-red-500"
            )} />
          </div>
        </div>
      </div>
    </div>
  );
};
```

**Backend - Generar Breakdown:**
```javascript
// En predictionEngine.js
_calculateConfidenceBreakdown(dataset, patterns, trends, sources) {
  // Cantidad de datos (más datos = mayor confianza)
  const dataQuantity = {
    score: Math.min(dataset.length / 10, 1),
    weight: 0.35
  };

  // Calidad de fuentes (basado en verification scores)
  const avgSourceScore = sources.reduce((sum, s) =>
    sum + (s.verification?.score || 50), 0) / sources.length / 100;
  const sourceQuality = {
    score: avgSourceScore,
    weight: 0.30
  };

  // Consistencia temporal (datos recientes y continuos)
  const temporalConsistency = {
    score: this._calculateTemporalConsistency(dataset),
    weight: 0.20
  };

  // Fuerza de patrones (R² de regresiones, etc)
  const avgPatternStrength = patterns.reduce((sum, p) =>
    sum + (p.confidence || 0), 0) / patterns.length;
  const patternStrength = {
    score: avgPatternStrength,
    weight: 0.15
  };

  const total =
    dataQuantity.score * dataQuantity.weight +
    sourceQuality.score * sourceQuality.weight +
    temporalConsistency.score * temporalConsistency.weight +
    patternStrength.score * patternStrength.weight;

  return {
    breakdown: {
      dataQuantity,
      sourceQuality,
      temporalConsistency,
      patternStrength
    },
    total
  };
}
```

---

### ⚠️ NO IMPLEMENTADAS (Opcional/Futuras):

#### Sugerencia 7: **Modo "Fact-Check"**
**Idea:** El usuario marca una afirmación y Vizta la verifica
- Podría implementarse en Fase 3
- Requiere selección de texto y verificación bajo demanda

#### Sugerencia 8: **Predicción Colaborativa**
**Idea:** Permitir que el usuario ajuste parámetros de predicción
- Reservado para Fase 3
- Incluye sliders y controles interactivos

---

## ⚠️ Consideraciones Técnicas

### Performance:
- **Caché de predicciones:** Evitar regenerar si datos no cambian
- **Lazy loading:** Tab de Datos solo carga cuando se abre
- **Paginación:** Si hay >50 datos, paginar

### Seguridad:
- **Sanitización:** Limpiar valores numéricos antes de parsear
- **Rate limiting:** Limitar predicciones por usuario (costosas en tokens)
- **Validación:** Verificar que datos sean válidos antes de análisis

### UX:
- **Skeleton loaders:** Mostrar mientras carga predicción
- **Animaciones:** Suaves al mostrar datos/predicciones
- **Tooltips:** Explicar qué es cada métrica
- **Empty states:** Mensaje cuando no hay datos suficientes

### Testing:
- **Unit tests:** Para funciones de extracción de datos
- **Integration tests:** Para flujo completo de predicción
- **Mock data:** Datasets de prueba con diferentes escenarios

---

## 📅 Estimación de Tiempo

### Fase 1 (Rol Periodista + Tab Datos):
- **Backend (reasoningLayer):** 4-6 horas
  - Prompt de periodista: 1h
  - Extracción de datos: 2h
  - Verificación de fuentes: 2h
  - Tests: 1h

- **Frontend (Tab Datos):** 3-4 horas
  - UI del tab: 2h
  - Integración con API: 1h
  - Estilos y animaciones: 1h

**Total Fase 1:** 7-10 horas

### Fase 2 (Predicción):
- **Backend (predictionEngine):** 6-8 horas
  - Análisis de patrones: 3h
  - Generación con Grok: 2h
  - Visualizaciones config: 2h
  - Tests: 1h

- **Frontend (UI Predicción):** 5-6 horas
  - Botón y estado: 1h
  - PredictionView component: 2h
  - Visualizaciones: 2h
  - Integración: 1h

**Total Fase 2:** 11-14 horas

**TOTAL PROYECTO:** 18-24 horas

---

## 🚀 Próximos Pasos (Fase 1)

1. **Actualizar `reasoningLayer.js`** con rol de periodista
2. **Implementar `_extractQuantifiableData()`**
3. **Probar extracción** con consultas reales
4. **Crear Tab de Datos** en frontend
5. **Integrar API response** con nuevos campos
6. **Testing end-to-end** con consultas variadas

¿Comenzamos con el paso 1?
