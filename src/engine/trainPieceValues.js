import { Chess } from 'chess.js';
import ChessAI from './ChessAI.js';
import fs from 'fs';
import path from 'path';

/**
 * 🧬 OPTIMIZADOR EVOLUTIVO DE AJEDREZ CON DIVERSIDAD MEJORADA
 * Sistema avanzado que evoluciona los valores de las piezas usando algoritmos genéticos
 * ✨ NUEVO: Incluye variabilidad para evitar patrones repetitivos
 */

class ChessEvolutionOptimizer {
  constructor(config = {}) {
    this.config = {
      populationSize: 20,
      generations: 50,
      mutationRate: 0.1,
      crossoverRate: 0.8,
      elitismRate: 0.2,
      gamesPerEvaluation: 8,
      maxGameTurns: 150,
      tournamentSize: 3,
      // 🆕 NUEVAS CONFIGURACIONES PARA DIVERSIDAD
      diversityBonus: 0.1,        // Bonus por diversidad de movimientos
      randomnessLevel: 0.15,      // Nivel de aleatoriedad en decisiones
      openingVariation: true,     // Variación en aperturas
      evaluationNoise: 0.05,      // Ruido en la evaluación
      temperatureDecay: 0.95,     // Decaimiento de la temperatura
      ...config
    };

    // Rangos de valores para cada pieza (centipawns)
    this.pieceRanges = {
      p: [80, 120],    // Peón
      r: [450, 550],   // Torre
      n: [280, 380],   // Caballo
      b: [280, 380],   // Alfil
      q: [800, 1000],  // Dama
      k: [0, 0]        // Rey (siempre 0)
    };

    // 🆕 NUEVOS PARÁMETROS PARA DIVERSIDAD
    this.diversityParams = {
      positionBonus: [0.8, 1.2],     // Bonus por posición
      aggressiveness: [0.5, 1.5],    // Nivel de agresividad
      development: [0.8, 1.3],       // Importancia del desarrollo
      kingSafety: [0.7, 1.4],        // Seguridad del rey
      pawnStructure: [0.6, 1.2],     // Estructura de peones
      mobility: [0.8, 1.4],          // Movilidad de piezas
      centerControl: [0.9, 1.3],     // Control del centro
      endgameWeight: [0.8, 1.2]      // Peso del final
    };

    // Almacenamiento de datos
    this.evolutionHistory = [];
    this.bestIndividuals = [];
    this.gameDatabase = [];
    this.movePatterns = new Map(); // 🆕 Seguimiento de patrones
    
    this.initializeLogger();
  }

  initializeLogger() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = `chess_evolution_${timestamp}.log`;
    this.dataFile = `evolution_data_${timestamp}.json`;
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level}: ${message}`;
    console.log(logEntry);
    
    // Guardar en archivo
    fs.appendFileSync(this.logFile, logEntry + '\n');
  }

  /**
   * 🆕 Genera un individuo aleatorio con parámetros de diversidad
   */
  generateRandomIndividual() {
    const values = {};
    
    // Valores base de las piezas
    Object.entries(this.pieceRanges).forEach(([piece, [min, max]]) => {
      if (piece === 'k') {
        values[piece] = 0;
        values[piece.toUpperCase()] = 0;
      } else {
        const value = Math.floor(Math.random() * (max - min + 1)) + min;
        values[piece] = value;
        values[piece.toUpperCase()] = -value;
      }
    });

    // 🆕 Parámetros de diversidad
    const diversityValues = {};
    Object.entries(this.diversityParams).forEach(([param, [min, max]]) => {
      diversityValues[param] = min + Math.random() * (max - min);
    });

    return {
      id: this.generateId(),
      values,
      diversityValues,
      fitness: 0,
      games: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      generation: 0,
      uniqueMoves: new Set(), // 🆕 Seguimiento de movimientos únicos
      playingStyle: this.generatePlayingStyle(), // 🆕 Estilo de juego
      temperature: 1.0 // 🆕 Temperatura inicial para aleatoriedad
    };
  }

  /**
   * 🆕 Genera un estilo de juego único para cada individuo
   */
  generatePlayingStyle() {
    const styles = [
      'aggressive',    // Agresivo
      'positional',    // Posicional
      'tactical',      // Táctico
      'defensive',     // Defensivo
      'dynamic',       // Dinámico
      'classical',     // Clásico
      'modern',        // Moderno
      'hypermodern'    // Hipermoderno
    ];
    
    return styles[Math.floor(Math.random() * styles.length)];
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Inicializa la población con diversidad
   */
  initializePopulation() {
    this.log(`Inicializando población de ${this.config.populationSize} individuos con diversidad...`);
    
    const population = [];
    for (let i = 0; i < this.config.populationSize; i++) {
      population.push(this.generateRandomIndividual());
    }

    // Agregar individuos con diferentes estilos predefinidos
    const predefinedStyles = [
      { name: 'classic', values: { p: 100, r: 500, n: 320, b: 330, q: 900 } },
      { name: 'aggressive', values: { p: 90, r: 480, n: 350, b: 310, q: 950 } },
      { name: 'positional', values: { p: 110, r: 520, n: 300, b: 350, q: 880 } },
      { name: 'tactical', values: { p: 95, r: 490, n: 340, b: 320, q: 920 } }
    ];

    predefinedStyles.forEach((style, index) => {
      if (index < population.length) {
        const individual = population[index];
        Object.entries(style.values).forEach(([piece, value]) => {
          individual.values[piece] = value;
          individual.values[piece.toUpperCase()] = -value;
        });
        individual.id = style.name;
        individual.playingStyle = style.name;
      }
    });

    return population;
  }

  /**
   * 🆕 Crea una IA con valores específicos y parámetros de diversidad
   */
  createAI(individual, difficulty = 3) {
    const ai = new ChessAI(difficulty);
    ai.setDifficulty(difficulty);
    
    // Aplicar valores de piezas
    ai.PIECE_VALUES = { ...ai.PIECE_VALUES, ...individual.values };
    
    // 🆕 Aplicar parámetros de diversidad
    ai.diversityParams = individual.diversityValues;
    ai.playingStyle = individual.playingStyle;
    ai.temperature = individual.temperature;
    ai.randomnessLevel = this.config.randomnessLevel;
    
    // 🆕 Modificar función de evaluación para incluir diversidad
    const originalEvaluate = ai.evaluatePosition;
    ai.evaluatePosition = (game) => {
      let score = originalEvaluate.call(ai, game);
      
      // Aplicar modificadores de diversidad
      const params = ai.diversityParams;
      
      // Bonus por desarrollo temprano
      if (game.history().length < 20) {
        score += this.calculateDevelopmentBonus(game) * params.development;
      }
      
      // Modificar según el estilo de juego
      score = this.applyPlayingStyleModifiers(score, game, ai.playingStyle);
      
      // Añadir ruido para variabilidad
      if (this.config.evaluationNoise > 0) {
        const noise = (Math.random() - 0.5) * this.config.evaluationNoise * 100;
        score += noise;
      }
      
      return score;
    };

    // 🆕 Modificar selección de movimientos para añadir variabilidad
    const originalGetBestMove = ai.getBestMove;
    ai.getBestMove = (game) => {
      const result = originalGetBestMove.call(ai, game);
      
      // Aplicar temperatura para aleatoriedad
      if (ai.temperature > 0.1 && Math.random() < ai.randomnessLevel) {
        const moves = game.moves({ verbose: true });
        if (moves.length > 1) {
          // Seleccionar un movimiento aleatorio de los mejores
          const topMoves = moves.slice(0, Math.min(3, moves.length));
          const randomMove = topMoves[Math.floor(Math.random() * topMoves.length)];
          result.move = randomMove;
        }
      }
      
      // Reducir temperatura gradualmente
      ai.temperature *= this.config.temperatureDecay;
      
      return result;
    };
    
    return ai;
  }

  /**
   * 🆕 Calcula bonus por desarrollo de piezas
   */
  calculateDevelopmentBonus(game) {
    const board = game.board();
    let developmentScore = 0;
    
    // Verificar desarrollo de caballos y alfiles
    board.forEach((row, i) => {
      row.forEach((piece, j) => {
        if (piece && piece.color === game.turn()) {
          if (piece.type === 'n' || piece.type === 'b') {
            // Bonus por sacar piezas de la primera fila
            if ((piece.color === 'w' && i < 6) || (piece.color === 'b' && i > 1)) {
              developmentScore += 10;
            }
          }
        }
      });
    });
    
    return developmentScore;
  }

  /**
   * 🆕 Aplica modificadores según el estilo de juego
   */
  applyPlayingStyleModifiers(score, game, style) {
    const history = game.history();
    const moveCount = history.length;
    
    switch (style) {
      case 'aggressive':
        // Bonus por ataques y capturas
        if (game.in_check() || history[history.length - 1]?.includes('x')) {
          score += 20;
        }
        break;
        
      case 'positional':
        // Bonus por control del centro y estructura
        score += this.evaluateCenterControl(game) * 0.5;
        break;
        
      case 'tactical':
        // Bonus por oportunidades tácticas
        if (game.in_check() || this.hasThreats(game)) {
          score += 15;
        }
        break;
        
      case 'defensive':
        // Bonus por seguridad del rey
        score += this.evaluateKingSafety(game) * 0.3;
        break;
        
      case 'dynamic':
        // Cambiar estilo según la fase del juego
        if (moveCount < 20) {
          score += this.calculateDevelopmentBonus(game) * 0.5;
        } else {
          score += this.evaluateCenterControl(game) * 0.3;
        }
        break;
    }
    
    return score;
  }

  /**
   * 🆕 Evalúa el control del centro
   */
  evaluateCenterControl(game) {
    const centerSquares = ['d4', 'd5', 'e4', 'e5'];
    let controlScore = 0;
    
    centerSquares.forEach(square => {
      const piece = game.get(square);
      if (piece) {
        controlScore += piece.color === game.turn() ? 10 : -10;
      }
    });
    
    return controlScore;
  }

  /**
   * 🆕 Evalúa la seguridad del rey
   */
  evaluateKingSafety(game) {
    // Implementación básica de seguridad del rey
    const kingSquare = this.findKing(game, game.turn());
    if (!kingSquare) return 0;
    
    let safetyScore = 0;
    
    // Bonus por enroque
    if (game.turn() === 'w' && (kingSquare === 'g1' || kingSquare === 'c1')) {
      safetyScore += 20;
    } else if (game.turn() === 'b' && (kingSquare === 'g8' || kingSquare === 'c8')) {
      safetyScore += 20;
    }
    
    return safetyScore;
  }

  /**
   * 🆕 Encuentra la posición del rey
   */
  findKing(game, color) {
    const board = game.board();
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.type === 'k' && piece.color === color) {
          return String.fromCharCode(97 + j) + (8 - i);
        }
      }
    }
    return null;
  }

  /**
   * 🆕 Verifica si hay amenazas tácticas
   */
  hasThreats(game) {
    const moves = game.moves({ verbose: true });
    return moves.some(move => 
      move.captured || 
      move.promotion || 
      move.san.includes('+') ||
      move.san.includes('#')
    );
  }

  /**
   * 🆕 Juega una partida con seguimiento de diversidad
   */
  async playGame(individual1, individual2, gameNumber = 0) {
    const game = new Chess();
    const ai1 = this.createAI(individual1);
    const ai2 = this.createAI(individual2);
    
    let turn = 0;
    const moveHistory = [];
    const gamePatterns = new Set();
    
    // 🆕 Aplicar variación de apertura
    if (this.config.openingVariation && Math.random() < 0.3) {
      this.applyRandomOpening(game);
    }
    
    while (!game.game_over() && turn < this.config.maxGameTurns) {
      const ai = game.turn() === 'w' ? ai1 : ai2;
      const startTime = Date.now();
      
      try {
        const { move } = ai.getBestMove(game);
        if (!move) break;
        
        // 🆕 Registrar patrones de movimiento
        const pattern = `${move.from}-${move.to}`;
        gamePatterns.add(pattern);
        
        // 🆕 Añadir movimiento a la estadística del individuo
        const individual = game.turn() === 'w' ? individual1 : individual2;
        individual.uniqueMoves.add(move.san || move);
        
        game.move(move);
        moveHistory.push({
          move: move.san || move,
          fen: game.fen(),
          turn: game.turn(),
          time: Date.now() - startTime,
          pattern
        });
        
        turn++;
      } catch (error) {
        this.log(`Error en partida: ${error.message}`, 'ERROR');
        break;
      }
    }

    // Determinar resultado
    let result = this.calculateGameResult(game, turn);
    
    // 🆕 Aplicar bonus por diversidad
    const diversityBonus = this.calculateDiversityBonus(gamePatterns, individual1, individual2);
    result += diversityBonus;

    // Guardar datos de la partida
    this.gameDatabase.push({
      id1: individual1.id,
      id2: individual2.id,
      result,
      moves: moveHistory.length,
      gameNumber,
      endReason: this.getEndReason(game, turn),
      uniquePatterns: gamePatterns.size, // 🆕 Diversidad de patrones
      style1: individual1.playingStyle,
      style2: individual2.playingStyle
    });

    return result;
  }

  /**
   * 🆕 Aplica una apertura aleatoria
   */
  applyRandomOpening(game) {
    const openings = [
      ['e4', 'e5', 'Nf3'],
      ['d4', 'd5', 'c4'],
      ['Nf3', 'Nf6', 'g3'],
      ['c4', 'e5', 'Nc3'],
      ['e4', 'c5', 'Nf3']
    ];
    
    const opening = openings[Math.floor(Math.random() * openings.length)];
    const movesToPlay = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < Math.min(movesToPlay, opening.length); i++) {
      try {
        const moves = game.moves();
        if (moves.includes(opening[i])) {
          game.move(opening[i]);
        } else {
          break;
        }
      } catch (error) {
        break;
      }
    }
  }

  /**
   * 🆕 Calcula el resultado del juego
   */
  calculateGameResult(game, turn) {
    if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition() || turn >= this.config.maxGameTurns) {
      return 0.5;
    } else if (game.in_checkmate()) {
      return game.turn() === 'w' ? 0 : 1;
    } else {
      return 0.5;
    }
  }

  /**
   * 🆕 Calcula bonus por diversidad de movimientos
   */
  calculateDiversityBonus(gamePatterns, individual1, individual2) {
    const diversityScore = gamePatterns.size / 20; // Normalizar
    return Math.min(diversityScore * this.config.diversityBonus, 0.1);
  }

  getEndReason(game, turn) {
    if (game.in_checkmate()) return 'checkmate';
    if (game.in_stalemate()) return 'stalemate';
    if (game.in_draw()) return 'draw';
    if (game.in_threefold_repetition()) return 'threefold';
    if (turn >= this.config.maxGameTurns) return 'max_turns';
    return 'unknown';
  }

  /**
   * 🆕 Evalúa la fitness con bonus por diversidad
   */
  async evaluateIndividual(individual, opponents) {
    let totalScore = 0;
    let games = 0;
    let wins = 0;
    let losses = 0;
    let draws = 0;

    for (const opponent of opponents) {
      if (individual.id === opponent.id) continue;

      // Jugar como blancas
      const resultWhite = await this.playGame(individual, opponent, games);
      totalScore += resultWhite;
      games++;
      
      if (resultWhite > 0.6) wins++;
      else if (resultWhite < 0.4) losses++;
      else draws++;

      // Jugar como negras
      const resultBlack = 1 - await this.playGame(opponent, individual, games);
      totalScore += resultBlack;
      games++;
      
      if (resultBlack > 0.6) wins++;
      else if (resultBlack < 0.4) losses++;
      else draws++;

      // Limitar el número de partidas
      if (games >= this.config.gamesPerEvaluation) break;
    }

    // Calcular fitness con bonificaciones
    const winRate = wins / games;
    const drawRate = draws / games;
    const avgScore = totalScore / games;
    
    // 🆕 Bonus por diversidad de movimientos
    const diversityBonus = Math.min(individual.uniqueMoves.size / 50, 0.2);
    
    // Fitness combinada: puntuación base + bonificaciones + diversidad
    const fitness = avgScore + (winRate * 0.2) + (drawRate * 0.1) + diversityBonus;

    // Actualizar estadísticas del individuo
    individual.fitness = fitness;
    individual.games = games;
    individual.wins = wins;
    individual.losses = losses;
    individual.draws = draws;
    individual.winRate = winRate;
    individual.avgScore = avgScore;
    individual.diversityScore = diversityBonus;

    return fitness;
  }

  /**
   * Evalúa toda la población
   */
  async evaluatePopulation(population, generation) {
    this.log(`📊 Evaluando generación ${generation} con diversidad...`);
    
    // Crear una lista de oponentes aleatorios para cada individuo
    const evaluationPromises = population.map(async (individual, index) => {
      const opponents = this.selectRandomOpponents(population, individual, 4);
      await this.evaluateIndividual(individual, opponents);
      individual.generation = generation;
      
      if (index % 5 === 0) {
        this.log(`Evaluado individuo ${index + 1}/${population.length}`);
      }
    });

    await Promise.all(evaluationPromises);
    
    // Ordenar por fitness
    population.sort((a, b) => b.fitness - a.fitness);
    
    // Estadísticas de la generación
    const bestFitness = population[0].fitness;
    const avgFitness = population.reduce((sum, ind) => sum + ind.fitness, 0) / population.length;
    const worstFitness = population[population.length - 1].fitness;
    const avgDiversity = population.reduce((sum, ind) => sum + ind.diversityScore, 0) / population.length;
    
    this.log(`🏆 Gen ${generation} - Mejor: ${bestFitness.toFixed(4)}, Promedio: ${avgFitness.toFixed(4)}, Diversidad: ${avgDiversity.toFixed(4)}`);
    
    // Guardar el mejor individuo
    this.bestIndividuals.push({
      generation,
      individual: JSON.parse(JSON.stringify(population[0])),
      stats: { bestFitness, avgFitness, worstFitness, avgDiversity }
    });

    return population;
  }

  selectRandomOpponents(population, individual, count) {
    const others = population.filter(p => p.id !== individual.id);
    const opponents = [];
    
    for (let i = 0; i < Math.min(count, others.length); i++) {
      const randomIndex = Math.floor(Math.random() * others.length);
      opponents.push(others[randomIndex]);
    }
    
    return opponents;
  }

  /**
   * Selección por torneo
   */
  tournamentSelection(population) {
    const tournament = [];
    
    for (let i = 0; i < this.config.tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * population.length);
      tournament.push(population[randomIndex]);
    }
    
    return tournament.sort((a, b) => b.fitness - a.fitness)[0];
  }

  /**
   * 🆕 Cruzamiento con diversidad
   */
  crossover(parent1, parent2) {
    if (Math.random() > this.config.crossoverRate) {
      return [parent1, parent2];
    }

    const child1 = { ...this.generateRandomIndividual() };
    const child2 = { ...this.generateRandomIndividual() };

    // Cruzamiento uniforme para valores de piezas
    Object.keys(this.pieceRanges).forEach(piece => {
      if (piece === 'k') return;
      
      if (Math.random() < 0.5) {
        child1.values[piece] = parent1.values[piece];
        child1.values[piece.toUpperCase()] = parent1.values[piece.toUpperCase()];
        child2.values[piece] = parent2.values[piece];
        child2.values[piece.toUpperCase()] = parent2.values[piece.toUpperCase()];
      } else {
        child1.values[piece] = parent2.values[piece];
        child1.values[piece.toUpperCase()] = parent2.values[piece.toUpperCase()];
        child2.values[piece] = parent1.values[piece];
        child2.values[piece.toUpperCase()] = parent1.values[piece.toUpperCase()];
      }
    });

    // 🆕 Cruzamiento para parámetros de diversidad
    Object.keys(this.diversityParams).forEach(param => {
      if (Math.random() < 0.5) {
        child1.diversityValues[param] = parent1.diversityValues[param];
        child2.diversityValues[param] = parent2.diversityValues[param];
      } else {
        child1.diversityValues[param] = parent2.diversityValues[param];
        child2.diversityValues[param] = parent1.diversityValues[param];
      }
    });

    // 🆕 Heredar estilos de juego
    child1.playingStyle = Math.random() < 0.7 ? parent1.playingStyle : this.generatePlayingStyle();
    child2.playingStyle = Math.random() < 0.7 ? parent2.playingStyle : this.generatePlayingStyle();

    return [child1, child2];
  }

  /**
   * 🆕 Mutación con diversidad
   */
  mutate(individual) {
    if (Math.random() > this.config.mutationRate) return individual;

    const mutatedValues = { ...individual.values };
    const mutatedDiversityValues = { ...individual.diversityValues };
    
    // Mutación de valores de piezas
    Object.entries(this.pieceRanges).forEach(([piece, [min, max]]) => {
      if (piece === 'k') return;
      
      if (Math.random() < 0.3) {
        const currentValue = mutatedValues[piece];
        const mutation = Math.floor((Math.random() - 0.5) * 40);
        let newValue = currentValue + mutation;
        
        newValue = Math.max(min, Math.min(max, newValue));
        
        mutatedValues[piece] = newValue;
        mutatedValues[piece.toUpperCase()] = -newValue;
      }
    });

    // 🆕 Mutación de parámetros de diversidad
    Object.entries(this.diversityParams).forEach(([param, [min, max]]) => {
      if (Math.random() < 0.2) {
        const currentValue = mutatedDiversityValues[param];
        const mutation = (Math.random() - 0.5) * 0.2;
        let newValue = currentValue + mutation;
        
        newValue = Math.max(min, Math.min(max, newValue));
        mutatedDiversityValues[param] = newValue;
      }
    });

    // 🆕 Mutación de estilo de juego
    const newPlayingStyle = Math.random() < 0.1 ? this.generatePlayingStyle() : individual.playingStyle;

    return {
      ...individual,
      values: mutatedValues,
      diversityValues: mutatedDiversityValues,
      playingStyle: newPlayingStyle,
      id: this.generateId(),
      fitness: 0,
      games: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      uniqueMoves: new Set(),
      temperature: 1.0
    };
  }

  /**
   * Genera la siguiente generación
   */
  generateNextGeneration(population) {
    const nextGeneration = [];
    
    // Elitismo: mantener los mejores individuos
    const eliteCount = Math.floor(this.config.populationSize * this.config.elitismRate);
    for (let i = 0; i < eliteCount; i++) {
      nextGeneration.push({
        ...population[i],
        id: this.generateId(),
        fitness: 0,
        games: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        uniqueMoves: new Set(),
        temperature: 1.0
      });
    }

    // Generar el resto mediante cruzamiento y mutación
    while (nextGeneration.length < this.config.populationSize) {
      const parent1 = this.tournamentSelection(population);
      const parent2 = this.tournamentSelection(population);
      
      const [child1, child2] = this.crossover(parent1, parent2);
      
      nextGeneration.push(this.mutate(child1));
      if (nextGeneration.length < this.config.populationSize) {
        nextGeneration.push(this.mutate(child2));
      }
    }

    return nextGeneration;
  }

  /**
   * Guarda los datos de evolución
   */
  saveEvolutionData() {
    const data = {
      config: this.config,
      bestIndividuals: this.bestIndividuals,
      gameDatabase: this.gameDatabase,
      evolutionHistory: this.evolutionHistory,
      diversityParams: this.diversityParams,
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
    this.log(`💾 Datos guardados en ${this.dataFile}`);
  }

  /**
   * Proceso principal de evolución
   */
  async evolve() {
    this.log('🚀 Iniciando evolución de ajedrez con diversidad mejorada...');
    
    let population = this.initializePopulation();
    
    for (let generation = 0; generation < this.config.generations; generation++) {
      const startTime = Date.now();
      
      // Evaluar población
      population = await this.evaluatePopulation(population, generation);
      
      // Mostrar estadísticas detalladas
      this.printGenerationStats(population, generation);
      
      // Guardar datos cada 10 generaciones
      if (generation % 10 === 0) {
        this.saveEvolutionData();
      }

      // Generar siguiente generación (excepto en la última)
      if (generation < this.config.generations - 1) {
        population = this.generateNextGeneration(population);
      }

      const generationTime = (Date.now() - startTime) / 1000;
      this.log(`⏱️  Generación ${generation} completada en ${generationTime.toFixed(2)}s`);
    }

    // Guardar datos finales
    this.saveEvolutionData();
    this.printFinalResults();
    
    return population[0]; // Retornar el mejor individuo
  }

  printGenerationStats(population, generation) {
    const best = population[0];
    const diversityStats = this.calculatePopulationDiversity(population);
    
    this.log(`\n📈 GENERACIÓN ${generation} - ESTADÍSTICAS DETALLADAS`);
    this.log(`🥇 Mejor individuo (${best.id}) - Estilo: ${best.playingStyle}`);
    this.log(`   Fitness: ${best.fitness.toFixed(4)} | Win Rate: ${(best.winRate * 100).toFixed(1)}%`);
    this.log(`   Diversidad: ${best.diversityScore.toFixed(4)} | Movimientos únicos: ${best.uniqueMoves.size}`);
    this.log(`   Valores: P=${best.values.p} R=${best.values.r} N=${best.values.n} B=${best.values.b} Q=${best.values.q}`);
    this.log(`   Partidas: ${best.games} (${best.wins}W/${best.draws}D/${best.losses}L)`);
    this.log(`🎯 Diversidad poblacional: ${diversityStats.avgDiversity.toFixed(4)}`);
    this.log(`📊 Estilos representados: ${diversityStats.uniqueStyles.join(', ')}`);
  }

  /**
   * 🆕 Calcula la diversidad de toda la población
   */
  calculatePopulationDiversity(population) {
    const totalDiversity = population.reduce((sum, ind) => sum + (ind.diversityScore || 0), 0);
    const avgDiversity = totalDiversity / population.length;
    
    const styles = population.map(ind => ind.playingStyle);
    const uniqueStyles = [...new Set(styles)];
    
    return {
      avgDiversity,
      uniqueStyles,
      styleDistribution: this.getStyleDistribution(styles)
    };
  }

  /**
   * 🆕 Obtiene la distribución de estilos
   */
  getStyleDistribution(styles) {
    const distribution = {};
    styles.forEach(style => {
      distribution[style] = (distribution[style] || 0) + 1;
    });
    return distribution;
  }

  printFinalResults() {
    const best = this.bestIndividuals[this.bestIndividuals.length - 1];
    const finalStats = this.calculatePopulationDiversity(this.bestIndividuals.map(b => b.individual));
    
    this.log('\n🏆 RESULTADOS FINALES CON DIVERSIDAD');
    this.log('='.repeat(60));
    this.log(`Mejor individuo encontrado: ${best.individual.id}`);
    this.log(`Estilo de juego: ${best.individual.playingStyle}`);
    this.log(`Fitness final: ${best.individual.fitness.toFixed(4)}`);
    this.log(`Tasa de victoria: ${(best.individual.winRate * 100).toFixed(1)}%`);
    this.log(`Puntuación de diversidad: ${best.individual.diversityScore.toFixed(4)}`);
    this.log(`Movimientos únicos utilizados: ${best.individual.uniqueMoves.size}`);
    
    this.log('\n📊 Valores optimizados de las piezas:');
    this.log(`   Peón:     ${best.individual.values.p}`);
    this.log(`   Torre:    ${best.individual.values.r}`);
    this.log(`   Caballo:  ${best.individual.values.n}`);
    this.log(`   Alfil:    ${best.individual.values.b}`);
    this.log(`   Dama:     ${best.individual.values.q}`);
    
    this.log('\n🎯 Parámetros de diversidad optimizados:');
    Object.entries(best.individual.diversityValues).forEach(([param, value]) => {
      this.log(`   ${param}: ${value.toFixed(3)}`);
    });
    
    this.log('\n📈 Evolución del mejor fitness:');
    this.bestIndividuals.forEach((gen, i) => {
      if (i % 10 === 0 || i === this.bestIndividuals.length - 1) {
        this.log(`   Gen ${gen.generation}: ${gen.individual.fitness.toFixed(4)} (${gen.individual.playingStyle})`);
      }
    });

    this.log('\n🎨 Análisis de diversidad:');
    this.log(`   Estilos evolucionados: ${finalStats.uniqueStyles.join(', ')}`);
    this.log(`   Diversidad promedio: ${finalStats.avgDiversity.toFixed(4)}`);
    
    this.log('\n🎮 Estadísticas de partidas:');
    const totalGames = this.gameDatabase.length;
    const avgMovesPerGame = this.gameDatabase.reduce((sum, game) => sum + game.moves, 0) / totalGames;
    const uniquePatterns = new Set(this.gameDatabase.map(game => game.uniquePatterns)).size;
    
    this.log(`   Total de partidas jugadas: ${totalGames}`);
    this.log(`   Promedio de movimientos por partida: ${avgMovesPerGame.toFixed(1)}`);
    this.log(`   Patrones únicos generados: ${uniquePatterns}`);
    
    // Análisis de finales de partida
    const endReasons = {};
    this.gameDatabase.forEach(game => {
      endReasons[game.endReason] = (endReasons[game.endReason] || 0) + 1;
    });
    
    this.log('\n🏁 Distribución de finales de partida:');
    Object.entries(endReasons).forEach(([reason, count]) => {
      const percentage = (count / totalGames * 100).toFixed(1);
      this.log(`   ${reason}: ${count} (${percentage}%)`);
    });
  }
}

// ================================
// CONFIGURACIONES PREDEFINIDAS MEJORADAS
// ================================

// Configuración para PRUEBA RÁPIDA CON DIVERSIDAD (5-10 minutos)
const quickTestConfig = {
  populationSize: 8,
  generations: 10,
  mutationRate: 0.25,
  crossoverRate: 0.8,
  elitismRate: 0.25,
  gamesPerEvaluation: 3,
  maxGameTurns: 80,
  tournamentSize: 2,
  // Parámetros de diversidad
  diversityBonus: 0.15,
  randomnessLevel: 0.2,
  openingVariation: true,
  evaluationNoise: 0.08,
  temperatureDecay: 0.9
};

// Configuración ESTÁNDAR CON DIVERSIDAD (30-60 minutos)
const standardConfig = {
  populationSize: 16,
  generations: 30,
  mutationRate: 0.18,
  crossoverRate: 0.85,
  elitismRate: 0.2,
  gamesPerEvaluation: 6,
  maxGameTurns: 120,
  tournamentSize: 3,
  // Parámetros de diversidad
  diversityBonus: 0.12,
  randomnessLevel: 0.15,
  openingVariation: true,
  evaluationNoise: 0.05,
  temperatureDecay: 0.95
};

// Configuración INTENSIVA CON DIVERSIDAD (2-4 horas)
const intensiveConfig = {
  populationSize: 24,
  generations: 50,
  mutationRate: 0.15,
  crossoverRate: 0.85,
  elitismRate: 0.15,
  gamesPerEvaluation: 8,
  maxGameTurns: 150,
  tournamentSize: 4,
  // Parámetros de diversidad
  diversityBonus: 0.1,
  randomnessLevel: 0.12,
  openingVariation: true,
  evaluationNoise: 0.03,
  temperatureDecay: 0.98
};

// 🆕 Configuración ULTRA DIVERSA (1-2 horas)
const ultraDiverseConfig = {
  populationSize: 20,
  generations: 35,
  mutationRate: 0.3,
  crossoverRate: 0.9,
  elitismRate: 0.1,
  gamesPerEvaluation: 5,
  maxGameTurns: 100,
  tournamentSize: 3,
  // Parámetros de diversidad maximizados
  diversityBonus: 0.25,
  randomnessLevel: 0.3,
  openingVariation: true,
  evaluationNoise: 0.1,
  temperatureDecay: 0.85
};

/**
 * Función para ejecutar entrenamiento con configuración específica
 */
async function runTraining(configName = 'quick') {
  const configs = {
    quick: quickTestConfig,
    standard: standardConfig,
    intensive: intensiveConfig,
    diverse: ultraDiverseConfig
  };

  const config = configs[configName];
  if (!config) {
    console.error(`❌ Configuración '${configName}' no encontrada`);
    console.log('Configuraciones disponibles:', Object.keys(configs));
    return;
  }

  console.log(`🎯 Ejecutando entrenamiento: ${configName.toUpperCase()}`);
  console.log(`📊 Configuración:`, config);
  console.log(`🎨 Características de diversidad activadas:`);
  console.log(`   - Variación de aperturas: ${config.openingVariation ? '✅' : '❌'}`);
  console.log(`   - Nivel de aleatoriedad: ${config.randomnessLevel}`);
  console.log(`   - Bonus por diversidad: ${config.diversityBonus}`);
  console.log(`   - Ruido en evaluación: ${config.evaluationNoise}`);
  
  const optimizer = new ChessEvolutionOptimizer(config);
  
  try {
    const bestIndividual = await optimizer.evolve();
    
    console.log('\n🎉 ¡Entrenamiento completado!');
    console.log('🏆 Mejor configuración encontrada:');
    console.log('📊 Valores de piezas:', JSON.stringify(bestIndividual.values, null, 2));
    console.log('🎯 Parámetros de diversidad:', JSON.stringify(bestIndividual.diversityValues, null, 2));
    console.log('🎮 Estilo de juego:', bestIndividual.playingStyle);
    console.log('📈 Puntuación de diversidad:', bestIndividual.diversityScore.toFixed(4));
    
    return bestIndividual;
  } catch (error) {
    console.error('❌ Error durante el entrenamiento:', error);
  }
}

/**
 * 🆕 Función para entrenar con máxima diversidad
 */
async function trainWithMaxDiversity() {
  console.log('🌈 Entrenamiento con máxima diversidad activado');
  
  const config = {
    populationSize: 15,
    generations: 25,
    mutationRate: 0.4,
    crossoverRate: 0.95,
    elitismRate: 0.05,
    gamesPerEvaluation: 4,
    maxGameTurns: 90,
    tournamentSize: 2,
    // Diversidad al máximo
    diversityBonus: 0.3,
    randomnessLevel: 0.4,
    openingVariation: true,
    evaluationNoise: 0.15,
    temperatureDecay: 0.8
  };

  const optimizer = new ChessEvolutionOptimizer(config);
  
  // Ampliar rangos para más diversidad
  optimizer.pieceRanges = {
    p: [70, 130],
    r: [400, 600],
    n: [250, 400],
    b: [250, 400],
    q: [750, 1050],
    k: [0, 0]
  };

  console.log('🎯 Configuración de máxima diversidad aplicada');
  console.log('📊 Rangos ampliados para las piezas');
  
  const bestIndividual = await optimizer.evolve();
  console.log(`🏆 Resultado con máxima diversidad - Estilo: ${bestIndividual.playingStyle}`);
  
  return bestIndividual;
}

/**
 * Función para entrenar solo el alfil (con diversidad)
 */
async function trainBishopOnly() {
  console.log('🎯 Entrenamiento específico del alfil con diversidad');
  
  const config = {
    populationSize: 12,
    generations: 20,
    gamesPerEvaluation: 4,
    maxGameTurns: 100,
    diversityBonus: 0.2,
    randomnessLevel: 0.25,
    openingVariation: true,
    evaluationNoise: 0.1
  };

  const optimizer = new ChessEvolutionOptimizer(config);
  
  // Modificar para que solo entrene el alfil
  optimizer.pieceRanges = {
    p: [100, 100],
    r: [500, 500],
    n: [320, 320],
    b: [250, 400],    // Solo alfil variable con rango ampliado
    q: [900, 900],
    k: [0, 0]
  };

  const bestIndividual = await optimizer.evolve();
  console.log(`🏆 Mejor valor para el alfil con diversidad: ${bestIndividual.values.b}`);
  console.log(`🎮 Estilo desarrollado: ${bestIndividual.playingStyle}`);
  
  return bestIndividual;
}

/**
 * 🆕 Función para análisis comparativo de estilos
 */
async function comparePlayingStyles() {
  console.log('⚔️ Análisis comparativo de estilos de juego');
  
  const styles = ['aggressive', 'positional', 'tactical', 'defensive'];
  const results = {};
  
  for (const style of styles) {
    console.log(`\n🎯 Entrenando estilo: ${style}`);
    
    const config = {
      populationSize: 8,
      generations: 15,
      gamesPerEvaluation: 3,
      diversityBonus: 0.15,
      randomnessLevel: 0.2
    };
    
    const optimizer = new ChessEvolutionOptimizer(config);
    
    // Forzar población inicial con el estilo específico
    const population = optimizer.initializePopulation();
    population.forEach(individual => {
      individual.playingStyle = style;
    });
    
    const bestIndividual = await optimizer.evolve();
    results[style] = {
      fitness: bestIndividual.fitness,
      winRate: bestIndividual.winRate,
      values: bestIndividual.values,
      diversityScore: bestIndividual.diversityScore
    };
  }
  
  console.log('\n📊 COMPARACIÓN DE ESTILOS:');
  Object.entries(results).forEach(([style, data]) => {
    console.log(`${style.toUpperCase()}:`);
    console.log(`  Fitness: ${data.fitness.toFixed(4)}`);
    console.log(`  Win Rate: ${(data.winRate * 100).toFixed(1)}%`);
    console.log(`  Diversidad: ${data.diversityScore.toFixed(4)}`);
    console.log(`  Valores: P=${data.values.p} R=${data.values.r} N=${data.values.n} B=${data.values.b} Q=${data.values.q}`);
  });
  
  return results;
}

// ================================
// EJECUCIÓN PRINCIPAL MEJORADA
// ================================

async function main() {
  console.log('🧬 OPTIMIZADOR EVOLUTIVO DE AJEDREZ CON DIVERSIDAD');
  console.log('================================================');
  console.log('🎨 Características nuevas:');
  console.log('   ✅ Múltiples estilos de juego');
  console.log('   ✅ Variación de aperturas');
  console.log('   ✅ Aleatoriedad controlada');
  console.log('   ✅ Bonus por diversidad');
  console.log('   ✅ Evaluación con ruido');
  console.log('   ✅ Temperatura decreciente');
  console.log('');
  
  // Leer argumento de línea de comandos
  const mode = process.argv[2] || 'quick';
  
  switch (mode) {
    case 'quick':
      console.log('🚀 Ejecutando prueba rápida con diversidad...');
      return await runTraining('quick');
    case 'standard':
      console.log('📈 Ejecutando entrenamiento estándar con diversidad...');
      return await runTraining('standard');
    case 'intensive':
      console.log('💪 Ejecutando entrenamiento intensivo con diversidad...');
      return await runTraining('intensive');
    case 'diverse':
      console.log('🌈 Ejecutando entrenamiento ultra diverso...');
      return await runTraining('diverse');
    case 'max':
      console.log('🔥 Ejecutando entrenamiento con máxima diversidad...');
      return await trainWithMaxDiversity();
    case 'bishop':
      console.log('🎯 Entrenando solo el alfil con diversidad...');
      return await trainBishopOnly();
    case 'compare':
      console.log('⚔️ Comparando estilos de juego...');
      return await comparePlayingStyles();
    default:
      console.log('🚀 Ejecutando prueba rápida con diversidad por defecto...');
      return await runTraining('quick');
  }
}

// Ejecutar si es el módulo principal
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default ChessEvolutionOptimizer;