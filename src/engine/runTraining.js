import ChessEvolutionOptimizer from './trainPieceValues.js';
import fs from 'fs';
import path from 'path';

/**
 * 🚀 CONFIGURACIÓN RÁPIDA DE ENTRENAMIENTO
 * Configuraciones optimizadas para diferentes escenarios
 */

// Configuración para PRUEBA RÁPIDA (5-10 minutos)
const quickTestConfig = {
  populationSize: 8,
  generations: 10,
  mutationRate: 0.2,
  crossoverRate: 0.8,
  elitismRate: 0.25,
  gamesPerEvaluation: 3,
  maxGameTurns: 80,
  tournamentSize: 2
};

// Configuración ESTÁNDAR (30-60 minutos)
const standardConfig = {
  populationSize: 16,
  generations: 30,
  mutationRate: 0.15,
  crossoverRate: 0.8,
  elitismRate: 0.25,
  gamesPerEvaluation: 6,
  maxGameTurns: 120,
  tournamentSize: 3
};

// Configuración INTENSIVA (2-4 horas)
const intensiveConfig = {
  populationSize: 24,
  generations: 50,
  mutationRate: 0.12,
  crossoverRate: 0.85,
  elitismRate: 0.2,
  gamesPerEvaluation: 8,
  maxGameTurns: 150,
  tournamentSize: 4
};

// Configuración PROFESIONAL (6-12 horas)
const professionalConfig = {
  populationSize: 32,
  generations: 100,
  mutationRate: 0.1,
  crossoverRate: 0.9,
  elitismRate: 0.15,
  gamesPerEvaluation: 12,
  maxGameTurns: 200,
  tournamentSize: 5
};

/**
 * Función para ejecutar entrenamiento con configuración específica
 */
async function runTraining(configName = 'quick') {
  const configs = {
    quick: quickTestConfig,
    standard: standardConfig,
    intensive: intensiveConfig,
    professional: professionalConfig
  };

  const config = configs[configName];
  if (!config) {
    console.error(`❌ Configuración '${configName}' no encontrada`);
    console.log('Configuraciones disponibles:', Object.keys(configs));
    return;
  }

  console.log(`🎯 Ejecutando entrenamiento: ${configName.toUpperCase()}`);
  console.log(`📊 Configuración:`, config);
  console.log(`⏱️  Tiempo estimado: ${getEstimatedTime(config)}`);
  
  const optimizer = new ChessEvolutionOptimizer(config);
  
  try {
    const bestIndividual = await optimizer.evolve();

    // Guardar los valores entrenados
    const outputPath = path.resolve('./trained_ai_params.json');
    fs.writeFileSync(outputPath, JSON.stringify({
      values: bestIndividual.values,
      diversityValues: bestIndividual.diversityValues,
      playingStyle: bestIndividual.playingStyle
    }, null, 2));
    console.log(`✅ Parámetros entrenados guardados en ${outputPath}`);

    console.log('\n🎉 ¡Entrenamiento completado!');
    console.log('🏆 Mejor configuración encontrada:');
    console.log(JSON.stringify(bestIndividual.values, null, 2));
    
    return bestIndividual;
  } catch (error) {
    console.error('❌ Error durante el entrenamiento:', error);
  }
}

/**
 * Estima el tiempo de ejecución basado en la configuración
 */
function getEstimatedTime(config) {
  const gamesPerGeneration = config.populationSize * config.gamesPerEvaluation;
  const totalGames = gamesPerGeneration * config.generations;
  const avgGameTime = 2; // segundos por partida (estimación)
  const totalMinutes = (totalGames * avgGameTime) / 60;
  
  if (totalMinutes < 60) {
    return `${Math.round(totalMinutes)} minutos`;
  } else {
    return `${Math.round(totalMinutes / 60)} horas`;
  }
}

/**
 * Función para entrenar solo el alfil (como tu código original)
 */
async function trainBishopOnly() {
  console.log('🎯 Entrenamiento específico del alfil (modo original)');
  
  const config = {
    populationSize: 10,
    generations: 15,
    gamesPerEvaluation: 4,
    maxGameTurns: 100
  };

  const optimizer = new ChessEvolutionOptimizer(config);
  
  // Modificar para que solo entrene el alfil
  optimizer.pieceRanges = {
    p: [100, 100],    // Peón fijo
    r: [500, 500],    // Torre fija
    n: [320, 320],    // Caballo fijo
    b: [280, 380],    // Solo alfil variable
    q: [900, 900],    // Dama fija
    k: [0, 0]         // Rey siempre 0
  };

  const bestIndividual = await optimizer.evolve();
  console.log(`🏆 Mejor valor para el alfil: ${bestIndividual.values.b}`);
  
  return bestIndividual;
}

/**
 * Menú interactivo para elegir tipo de entrenamiento
 */
async function interactiveTraining() {
  console.log('\n🧬 OPTIMIZADOR EVOLUTIVO DE AJEDREZ');
  console.log('===================================');
  console.log('Selecciona el tipo de entrenamiento:');
  console.log('1. 🚀 Prueba rápida (5-10 min)');
  console.log('2. 📈 Entrenamiento estándar (30-60 min)');
  console.log('3. 💪 Entrenamiento intensivo (2-4 horas)');
  console.log('4. 🏆 Entrenamiento profesional (6-12 horas)');
  console.log('5. 🎯 Solo alfil (como original)');
  console.log('6. ⚙️  Configuración personalizada');
  
  // Simulación de selección (en un entorno real usarías readline)
  const selection = process.argv[2] || '1';
  
  switch (selection) {
    case '1':
      return await runTraining('quick');
    case '2':
      return await runTraining('standard');
    case '3':
      return await runTraining('intensive');
    case '4':
      return await runTraining('professional');
    case '5':
      return await trainBishopOnly();
    case '6':
      return await customTraining();
    default:
      console.log('🚀 Ejecutando prueba rápida por defecto...');
      return await runTraining('quick');
  }
}

/**
 * Configuración personalizada
 */
async function customTraining() {
  console.log('⚙️  Configuración personalizada');
  
  // Aquí podrías agregar prompts para configuración personalizada
  const customConfig = {
    populationSize: 20,
    generations: 25,
    mutationRate: 0.15,
    crossoverRate: 0.8,
    elitismRate: 0.2,
    gamesPerEvaluation: 6,
    maxGameTurns: 120,
    tournamentSize: 3
  };
  
  console.log('Usando configuración personalizada:', customConfig);
  
  const optimizer = new ChessEvolutionOptimizer(customConfig);
  return await optimizer.evolve();
}

// Ejecutar entrenamiento
if (import.meta.url === `file://${process.argv[1]}`) {
  interactiveTraining();
}

export { runTraining, trainBishopOnly, interactiveTraining };