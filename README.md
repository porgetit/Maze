# Juego de Laberintos 2D

Este proyecto es un **juego de laberintos** en 2D, desarrollado únicamente con **HTML**, **CSS** y **JavaScript**, con **mapas** generados proceduralmente. El jugador debe recoger estrellas y encontrar la puerta de salida para **ganar**.

## Descripción

- El **mapa** del laberinto se genera al azar, tanto en su **tamaño** (entre 10 y 20 filas y columnas) como en su **estructura** interna, usando **DFS** (Depth-First Search).  
- El **tamaño** de cada celda (`cellSize`) se ajusta de forma automática para que el laberinto nunca se salga de la pantalla.  
- El **movimiento** del jugador es fluido y permite “deslizarse” junto a las paredes (colisión en dos pasos, primero X y luego Y).  
- Hay **3 estrellas** repartidas al azar que el jugador debe recolectar. Una vez que las recolecta todas, la **puerta de salida** se abre.  
- Al **cruzar la puerta abierta**, el juego se reinicia automáticamente tras unos segundos.  
- El jugador es un **círculo cromático** que cambia de color en cada frame (animación de hue en HSL).  

## Requisitos

- **Navegador web** moderno (Chrome, Firefox, Edge, Safari, etc.) con soporte de `canvas` y JavaScript.  
- No se requiere ningún servidor especial; puede abrirse en local.  

## Estructura de Archivos

El proyecto consta de **tres** archivos principales:

```plaintext
.
├── index.html
├── style.css
└── script.js
```

### 1. index.html

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Juego de Laberintos 2D</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>

  <!-- Lienzo donde se dibuja el laberinto -->
  <canvas id="gameCanvas"></canvas>

  <!-- UI para mostrar estrellas y mensaje -->
  <div id="ui">
    <div class="stars">
      <span id="star1" class="star">★</span>
      <span id="star2" class="star">★</span>
      <span id="star3" class="star">★</span>
    </div>
    <div id="message"></div>
  </div>

  <script src="script.js"></script>
</body>
</html>
```

#### Descripción

- **`<canvas>`** con `id="gameCanvas"`: se usa para renderizar el laberinto, el personaje y las estrellas.  
- **`<div id="ui">`**: contiene las estrellas recogidas (marcadas con la clase “collected”) y el mensaje final (por ejemplo, “La puerta se abrió”).  
- Carga de **`style.css`** y luego **`script.js`** en la parte final del `<body>`.

### 2. style.css

```css
html, body {
  margin: 0;
  padding: 0;
  background: #000;
  font-family: sans-serif;
  color: #fff;
  /* Quitar scroll si el canvas cabe en pantalla. 
     Si deseas permitir scroll, remueve overflow: hidden. */
  overflow: hidden;
}

#gameCanvas {
  display: block;
  margin: 0 auto;
  border: 2px solid #0ff;
  box-shadow: 0 0 20px #0ff;
  background: #111;
}

/* UI */
#ui {
  margin: 1rem auto;
  text-align: center;
}

.stars {
  font-size: 2rem;
}

.star {
  color: #444;  /* gris oscuro por defecto */
  margin: 0 0.5rem;
}

.star.collected {
  color: #ffd700; /* oro */
}

#message {
  margin-top: 1rem;
  font-size: 1.2rem;
  min-height: 1.2em;
}
```

#### Descripción

- Establece un **fondo negro** para el `<body>`.  
- El **canvas** tiene un borde y sombra con luces de neón (`#0ff`).  
- Las **estrellas** se muestran en color gris por defecto; cuando se recoge una, se marca con `.collected` y cambia a **oro** (`#ffd700`).  
- El **mensaje** final se muestra debajo de las estrellas.

### 3. script.js

```js
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
  // Tomamos el mínimo para no pasarnos en ningún eje
  cellSize = Math.min(maxCellSizeByHeight, maxCellSizeByWidth);
  // Impón un mínimo para no tener celdas muy pequeñas
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
let maze = [];
let animRequest; // para requestAnimationFrame

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
let player = {
  x: 0.5 * cellSize,
  y: 0.5 * cellSize,
  radius: cellSize * 0.2, // jugador más pequeño
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

  if (dx === 0 && dy === 0) return;

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
  const colIndex = Math.floor(px / cellSize);
  const rowIndex = Math.floor(py / cellSize);

  if (rowIndex < 0 || rowIndex >= rows || colIndex < 0 || colIndex >= cols) {
    return true; // Fuera del grid
  }

  const cellX = px - colIndex * cellSize;
  const cellY = py - rowIndex * cellSize;
  const cell = maze[rowIndex][colIndex];

  // top
  if (cell.walls[0] && cellY - radius < 0) return true;
  // right
  if (cell.walls[1] && cellX + radius > cellSize) return true;
  // bottom
  if (cell.walls[2] && cellY + radius > cellSize) return true;
  // left
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
    const dx = door.col * cellSize + cellSize / 2;
    const dy = door.row * cellSize + cellSize / 2;
    const dist = Math.hypot(player.x - dx, player.y - dy);

    if (dist < player.radius + cellSize * 0.25) {
      // Ganó
      messageEl.textContent = "¡Has salido del laberinto! Reiniciando...";
      cancelAnimationFrame(animRequest);
      setTimeout(() => {
        location.reload();
      }, 2000);
    }
  } else {
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
  updatePlayerMovement();
  drawEverything();
  checkStarsCollection();
  checkDoor();
  animRequest = requestAnimationFrame(gameLoop);
}

/******************************
 * DIBUJAR TODO
 ******************************/
function drawEverything() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Laberinto (neón)
  ctx.strokeStyle = "#0ff";
  ctx.lineWidth = 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = maze[r][c];
      const x = c * cellSize;
      const y = r * cellSize;

      if (cell.walls[0]) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + cellSize, y);
        ctx.stroke();
      }
      if (cell.walls[1]) {
        ctx.beginPath();
        ctx.moveTo(x + cellSize, y);
        ctx.lineTo(x + cellSize, y + cellSize);
        ctx.stroke();
      }
      if (cell.walls[2]) {
        ctx.beginPath();
        ctx.moveTo(x + cellSize, y + cellSize);
        ctx.lineTo(x, y + cellSize);
        ctx.stroke();
      }
      if (cell.walls[3]) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + cellSize);
        ctx.stroke();
      }
    }
  }

  // Estrellas
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

  // Puerta
  if (door.isOpen) {
    ctx.fillStyle = "#32CD32"; // verde
  } else {
    ctx.fillStyle = "#F00";    // rojo
  }
  const dx = door.col * cellSize + cellSize / 2;
  const dy = door.row * cellSize + cellSize / 2;
  ctx.beginPath();
  ctx.arc(dx, dy, cellSize * 0.25, 0, 2 * Math.PI);
  ctx.fill();

  // Jugador (animación de hue)
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
  createMazeStructure();
  generateMazeDFS(0, 0);

  player.x = 0.5 * cellSize;
  player.y = 0.5 * cellSize;

  placeStars();
  placeDoor();

  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);

  requestAnimationFrame(gameLoop);
}

// ¡Iniciamos!
setup();
```

## Uso

1. **Descarga o clona** este repositorio en tu máquina local.  
2. Abre el archivo **`index.html`** en un navegador web moderno.  
3. Al **cargar la página**, se generará un **laberinto aleatorio** con dimensiones ajustadas a tu pantalla y un tamaño de celda que no se salga de los límites.  
4. Controla al jugador con **flechas** o **WASD** para desplazarte en 2D.  
   - Recoge las **3 estrellas** marcadas en color dorado.  
   - Una vez reunidas, la **puerta** (círculo rojo) se volverá **verde** (puerta abierta).  
   - Dirígete a la **puerta abierta** para **ganar**, el juego se reiniciará luego de 2 segundos.  

## Autoría

Proyecto creado por **Kevin Esguerra Cardona** en **diciembre del 2024**, desarrollado en un par de horas, **asistido por ChatGPT**.  
