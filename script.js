/******************************
 * CONFIGURACIONES GENERALES
 ******************************/

// Rango aleatorio para filas y columnas (puedes ajustar)
const MIN_SIZE = 10;
const MAX_SIZE = 20;

// Porcentaje de pantalla que deseamos usar
const SCREEN_USAGE = 0.9;

// Tamaño base de cada celda (en px). Si excede pantalla, lo reduciremos
let cellSize = 40;

/******************************
 * FUNCIÓN AUXILIAR PARA ENTEROS ALEATORIOS
 ******************************/
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/******************************
 * DIMENSIONES ALEATORIAS
 ******************************/
// Generamos filas y columnas dentro del rango definido
let rows = getRandomInt(MIN_SIZE, MAX_SIZE);
let cols = getRandomInt(MIN_SIZE, MAX_SIZE);

// Calculamos el tamaño máximo de canvas permitido
const maxCanvasWidth = window.innerWidth * SCREEN_USAGE;
const maxCanvasHeight = window.innerHeight * SCREEN_USAGE;

// Si (rows*cellSize) o (cols*cellSize) excede el área disponible,
// ajustamos cellSize para que quepa en pantalla
if (rows * cellSize > maxCanvasHeight || cols * cellSize > maxCanvasWidth) {
  const maxCellSizeByHeight = Math.floor(maxCanvasHeight / rows);
  const maxCellSizeByWidth  = Math.floor(maxCanvasWidth  / cols);
  // Elegimos el mínimo para no pasarnos en ningún eje
  cellSize = Math.min(maxCellSizeByHeight, maxCellSizeByWidth);
  // Y, si quieres, imponemos un mínimo
  cellSize = Math.max(cellSize, 10);
}

/******************************
 * SELECCIÓN DE ELEMENTOS DEL DOM
 ******************************/
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Ajustamos el tamaño REAL (lógico) del canvas
canvas.width  = cols * cellSize;
canvas.height = rows * cellSize;

// Estrellas en el DOM
const star1El = document.getElementById("star1");
const star2El = document.getElementById("star2");
const star3El = document.getElementById("star3");
// Mensajes en pantalla
const messageEl = document.getElementById("message");

/******************************
 * ESTRUCTURAS PRINCIPALES
 ******************************/
let maze = [];  // Almacena la grilla de celdas
let animRequest; // Para manejar requestAnimationFrame

/******************************
 * CELDA DEL LABERINTO
 ******************************/
function Cell(row, col) {
  this.row = row;
  this.col = col;
  // Paredes: [top, right, bottom, left]
  this.walls = [true, true, true, true];
  this.visited = false;
}

/******************************
 * CREACIÓN DE LA GRILLA
 ******************************/
function createMazeStructure() {
  for (let r = 0; r < rows; r++) {
    maze[r] = [];
    for (let c = 0; c < cols; c++) {
      maze[r][c] = new Cell(r, c);
    }
  }
}

/******************************
 * GENERACIÓN DEL LABERINTO (DFS)
 ******************************/
function generateMazeDFS(startRow, startCol) {
  const stack = [];
  const startCell = maze[startRow][startCol];
  startCell.visited = true;
  stack.push(startCell);

  while (stack.length > 0) {
    const current = stack.pop();
    const neighbors = getUnvisitedNeighbors(current.row, current.col);

    if (neighbors.length > 0) {
      // Devolvemos la celda actual a la pila
      stack.push(current);

      // Escogemos un vecino aleatorio
      const randIndex = Math.floor(Math.random() * neighbors.length);
      const next = neighbors[randIndex];

      // Eliminamos paredes entre current y next
      removeWalls(current, next);

      // Marcamos y lo apilamos
      next.visited = true;
      stack.push(next);
    }
  }
}

function getUnvisitedNeighbors(row, col) {
  const neighbors = [];

  // Arriba
  if (row > 0 && !maze[row - 1][col].visited) {
    neighbors.push(maze[row - 1][col]);
  }
  // Derecha
  if (col < cols - 1 && !maze[row][col + 1].visited) {
    neighbors.push(maze[row][col + 1]);
  }
  // Abajo
  if (row < rows - 1 && !maze[row + 1][col].visited) {
    neighbors.push(maze[row + 1][col]);
  }
  // Izquierda
  if (col > 0 && !maze[row][col - 1].visited) {
    neighbors.push(maze[row][col - 1]);
  }

  return neighbors;
}

function removeWalls(a, b) {
  const x = a.col - b.col;
  const y = a.row - b.row;

  // b está a la izquierda de a
  if (x === 1) {
    a.walls[3] = false; // left
    b.walls[1] = false; // right
  } else if (x === -1) {
    a.walls[1] = false;
    b.walls[3] = false;
  }

  // b está arriba de a
  if (y === 1) {
    a.walls[0] = false; // top
    b.walls[2] = false; // bottom
  } else if (y === -1) {
    a.walls[2] = false;
    b.walls[0] = false;
  }
}

/******************************
 * JUGADOR
 ******************************/
// Reducimos un poco el radio respecto a cellSize
let player = {
  x: 0.5 * cellSize,
  y: 0.5 * cellSize,
  radius: cellSize * 0.2,  // jugador más pequeño
  colorHue: 0,
  speed: 3.5,
};

/******************************
 * MANEJO DE TECLAS (SLIDING)
 ******************************/
const keys = {
  up: false,
  down: false,
  left: false,
  right: false,
};

function handleKeyDown(e) {
  if (e.key === "ArrowUp" || e.key === "w") keys.up = true;
  if (e.key === "ArrowDown" || e.key === "s") keys.down = true;
  if (e.key === "ArrowLeft" || e.key === "a") keys.left = true;
  if (e.key === "ArrowRight" || e.key === "d") keys.right = true;
}

function handleKeyUp(e) {
  if (e.key === "ArrowUp" || e.key === "w") keys.up = false;
  if (e.key === "ArrowDown" || e.key === "s") keys.down = false;
  if (e.key === "ArrowLeft" || e.key === "a") keys.left = false;
  if (e.key === "ArrowRight" || e.key === "d") keys.right = false;
}

/******************************
 * MOVIMIENTO CONTINUO CON DESLIZAMIENTO
 ******************************/
function updatePlayerMovement() {
  let dx = 0;
  let dy = 0;

  if (keys.up)    dy -= 1;
  if (keys.down)  dy += 1;
  if (keys.left)  dx -= 1;
  if (keys.right) dx += 1;

  if (dx === 0 && dy === 0) return; // No hay movimiento

  // Normalizar para no ir más rápido en diagonal
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length > 0) {
    dx = (dx / length) * player.speed;
    dy = (dy / length) * player.speed;
  }

  // 1) Mover en X
  let newX = player.x + dx;
  let newY = player.y;
  if (!isCollidingWithWalls(newX, newY, player.radius)) {
    player.x = newX;
  }

  // 2) Mover en Y
  newX = player.x;
  newY = player.y + dy;
  if (!isCollidingWithWalls(newX, newY, player.radius)) {
    player.y = newY;
  }
}

/******************************
 * DETECCIÓN DE COLISIONES (PAREDES)
 ******************************/
function isCollidingWithWalls(px, py, radius) {
  // Calculamos la celda en la que estaría el centro del jugador
  const colIndex = Math.floor(px / cellSize);
  const rowIndex = Math.floor(py / cellSize);

  // Fuera del grid => colisión
  if (rowIndex < 0 || rowIndex >= rows || colIndex < 0 || colIndex >= cols) {
    return true;
  }

  const cellX = px - colIndex * cellSize;
  const cellY = py - rowIndex * cellSize;
  const cell = maze[rowIndex][colIndex];

  // Top
  if (cell.walls[0] && cellY - radius < 0) return true;
  // Right
  if (cell.walls[1] && cellX + radius > cellSize) return true;
  // Bottom
  if (cell.walls[2] && cellY + radius > cellSize) return true;
  // Left
  if (cell.walls[3] && cellX - radius < 0) return true;

  return false;
}

/******************************
 * ESTRELLAS
 ******************************/
let stars = [
  { row: 0, col: 0, collected: false },
  { row: 0, col: 0, collected: false },
  { row: 0, col: 0, collected: false },
];

function placeStars() {
  const usedCells = new Set();
  // Celda inicial del jugador
  const pCell = `${Math.floor(player.y / cellSize)}-${Math.floor(player.x / cellSize)}`;
  usedCells.add(pCell);

  for (let i = 0; i < stars.length; i++) {
    let r, c, key;
    do {
      r = Math.floor(Math.random() * rows);
      c = Math.floor(Math.random() * cols);
      key = `${r}-${c}`;
    } while (usedCells.has(key));

    usedCells.add(key);
    stars[i].row = r;
    stars[i].col = c;
    stars[i].collected = false;
  }
}

/******************************
 * PUERTA DE SALIDA
 ******************************/
let door = {
  row: 0,
  col: 0,
  isOpen: false,
};

function placeDoor() {
  const usedCells = new Set();
  // Celda del jugador
  const pCell = `${Math.floor(player.y / cellSize)}-${Math.floor(player.x / cellSize)}`;
  usedCells.add(pCell);

  // Celdas de las estrellas
  for (const star of stars) {
    usedCells.add(`${star.row}-${star.col}`);
  }

  let r, c, key;
  do {
    r = Math.floor(Math.random() * rows);
    c = Math.floor(Math.random() * cols);
    key = `${r}-${c}`;
  } while (usedCells.has(key));

  door.row = r;
  door.col = c;
  door.isOpen = false;
}

/******************************
 * RECOLECCIÓN DE ESTRELLAS
 ******************************/
function checkStarsCollection() {
  for (const st of stars) {
    if (!st.collected) {
      const sx = st.col * cellSize + cellSize / 2;
      const sy = st.row * cellSize + cellSize / 2;
      const dist = Math.hypot(player.x - sx, player.y - sy);

      // Si colisionamos con la estrella
      if (dist < player.radius + cellSize * 0.2) {
        st.collected = true;
        updateStarUI();
      }
    }
  }
}

function updateStarUI() {
  const starEls = [star1El, star2El, star3El];
  stars.forEach((star, i) => {
    if (star.collected) {
      starEls[i].classList.add("collected");
    }
  });
}

/******************************
 * PUERTA Y VICTORIA
 ******************************/
function checkDoor() {
  if (door.isOpen) {
    // Ver si el jugador choca con la puerta
    const dx = door.col * cellSize + cellSize / 2;
    const dy = door.row * cellSize + cellSize / 2;
    const dist = Math.hypot(player.x - dx, player.y - dy);

    if (dist < player.radius + cellSize * 0.25) {
      // Ganó
      messageEl.textContent = "¡Has salido del laberinto! Reiniciando...";
      cancelAnimationFrame(animRequest);
      setTimeout(() => {
        location.reload();
      }, 2000); // 2 seg para ver el mensaje
    }
  } else {
    // Si no está abierta, verificamos si se recogieron todas las estrellas
    if (stars.every(star => star.collected)) {
      door.isOpen = true;
      messageEl.textContent = "¡Todas las estrellas recogidas! La puerta se ha abierto.";
    }
  }
}

/******************************
 * BUCLE PRINCIPAL
 ******************************/
function gameLoop() {
  // 1. Actualizar movimiento del jugador
  updatePlayerMovement();

  // 2. Dibujar todo
  drawEverything();

  // 3. Revisar estrellas y puerta
  checkStarsCollection();
  checkDoor();

  // 4. Request siguiente frame
  animRequest = requestAnimationFrame(gameLoop);
}

/******************************
 * DIBUJAR TODO
 ******************************/
function drawEverything() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Dibujar laberinto (líneas neon)
  ctx.strokeStyle = "#0ff";
  ctx.lineWidth = 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = maze[r][c];
      const x = c * cellSize;
      const y = r * cellSize;

      // top
      if (cell.walls[0]) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + cellSize, y);
        ctx.stroke();
      }
      // right
      if (cell.walls[1]) {
        ctx.beginPath();
        ctx.moveTo(x + cellSize, y);
        ctx.lineTo(x + cellSize, y + cellSize);
        ctx.stroke();
      }
      // bottom
      if (cell.walls[2]) {
        ctx.beginPath();
        ctx.moveTo(x + cellSize, y + cellSize);
        ctx.lineTo(x, y + cellSize);
        ctx.stroke();
      }
      // left
      if (cell.walls[3]) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + cellSize);
        ctx.stroke();
      }
    }
  }

  // Dibujar estrellas
  ctx.fillStyle = "#FFD700";
  for (const st of stars) {
    if (!st.collected) {
      const sx = st.col * cellSize + cellSize / 2;
      const sy = st.row * cellSize + cellSize / 2;
      ctx.beginPath();
      ctx.arc(sx, sy, cellSize * 0.2, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  // Dibujar puerta
  if (door.isOpen) {
    ctx.fillStyle = "#32CD32"; // Verde para abierta
  } else {
    ctx.fillStyle = "#F00";    // Rojo para cerrada
  }
  const dx = door.col * cellSize + cellSize / 2;
  const dy = door.row * cellSize + cellSize / 2;
  ctx.beginPath();
  ctx.arc(dx, dy, cellSize * 0.25, 0, 2 * Math.PI);
  ctx.fill();

  // Dibujar jugador (con animación de color HSL)
  player.colorHue = (player.colorHue + 1) % 360;
  ctx.fillStyle = `hsl(${player.colorHue}, 100%, 50%)`;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, 2 * Math.PI);
  ctx.fill();
}

/******************************
 * SETUP
 ******************************/
function setup() {
  // 1. Crear la estructura base (grilla)
  createMazeStructure();

  // 2. Generar el laberinto con DFS
  generateMazeDFS(0, 0);

  // 3. Reiniciar posición del jugador en la celda (0,0)
  player.x = 0.5 * cellSize;
  player.y = 0.5 * cellSize;

  // 4. Colocar estrellas y puerta
  placeStars();
  placeDoor();

  // 5. Escucha de teclado
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);

  // 6. Iniciar el bucle
  requestAnimationFrame(gameLoop);
}

// Finalmente, ejecutamos setup() al cargar
setup();
