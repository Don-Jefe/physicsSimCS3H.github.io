/**
 * Projectile Physics Simulation — Fixed Version
 */

// IDs
const canvas = document.getElementById('sim');
const ctx = canvas.getContext('2d');
const angleSlider = document.getElementById('angle');
const angleVal = document.getElementById('angle-val');
const speedSlider = document.getElementById('speed');
const speedVal = document.getElementById('speed-val');
const launchBtn = document.getElementById('launch');
const pauseBtn = document.getElementById('pause');
const resetBtn = document.getElementById('reset');
const maxhVal = document.getElementById('maxh');
const rangeVal = document.getElementById('range');
const velocityVal = document.getElementById('velocity');
const timeVal = document.getElementById('time');

// Simulation state
let projectile = null;
let isRunning = false;
let time = 0;

// Constants
const g = 9.8;
const scale = 2; // 1 meter = 2 pixels

// Projectile class
class Projectile {
  constructor(angle, speed) {
    this.angle = angle * Math.PI / 180;
    this.speed = speed;

    this.x = 0;
    this.y = 0;

    this.vx = speed * Math.cos(this.angle);
    this.vy = speed * Math.sin(this.angle);

    this.maxHeight = 0;
    this.range = 0;
    this.path = [];
  }

  update(dt) {
    // Velocity
    this.vy -= g * dt;
    
    // Position
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    

    // Track max height
    this.maxHeight = Math.max(this.maxHeight, this.y);

    // Ground collision
    if (this.y < 0) {
      this.y = 0;
      this.vy = 0;
      this.vx = 0;
      isRunning = false;
    }

    this.range = this.x;
  }

  draw(ctx) {
  const px = this.x * scale;
  const py = canvas.height - this.y * scale;

  const gradient = ctx.createRadialGradient(px-2, py-2, 2, px, py, 8);
  gradient.addColorStop(0, "#fffaf3");
  gradient.addColorStop(1, "#7a5a3a");

  ctx.beginPath();
  ctx.arc(px, py, 8, 0, 2 * Math.PI);
  ctx.fillStyle = gradient;
  ctx.fill();

  // subtle shadow
  ctx.beginPath();
  ctx.ellipse(px, canvas.height - 32, 10, 4, 0, 0, 2*Math.PI);
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.fill();
}
}

function initCanvas() {
  canvas.width = window.innerWidth * 0.8;
  canvas.height = window.innerHeight * 0.6;
  canvas.style.height = canvas.height + 'px';
}
window.addEventListener('resize', initCanvas);
initCanvas();

// Controls
launchBtn.addEventListener('click', () => {
  const angle = parseFloat(angleSlider.value);
  const speed = parseFloat(speedSlider.value);
  projectile = new Projectile(angle, speed);
  time = 0;
  isRunning = true;
});

pauseBtn.addEventListener('click', () => {
  isRunning = !isRunning;
});

resetBtn.addEventListener('click', () => {
  projectile = null;
  time = 0;
  isRunning = false;

  maxhVal.textContent = '0.00';
  rangeVal.textContent = '0.00';
  velocityVal.textContent = '0.00';
  timeVal.textContent = '0.00';
});

// Sliders
angleSlider.oninput = () => angleVal.textContent = angleSlider.value;
speedSlider.oninput = () => speedVal.textContent = speedSlider.value;

// Update loop
function update() {
  if (isRunning && projectile) {
    const dt = 0.08; // Fixed time step

    projectile.update(dt);
    time += dt;

    maxhVal.textContent = projectile.maxHeight.toFixed(2);
    rangeVal.textContent = projectile.range.toFixed(2);
    velocityVal.textContent = Math.sqrt(
      projectile.vx ** 2 + projectile.vy ** 2
    ).toFixed(2);
    timeVal.textContent = time.toFixed(2);
  }
}

// Draw loop
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (projectile) {
    projectile.draw(ctx);
  }
}

// Main game loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();