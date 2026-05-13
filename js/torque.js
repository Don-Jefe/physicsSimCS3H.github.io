document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('sim');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  function initCanvas() {
  const rect =
    canvas.parentElement.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';

  ctx.imageSmoothingEnabled = true;
}

  window.addEventListener('resize', initCanvas);
  initCanvas();

  // =========================
  // UI ELEMENTS
  // =========================
  const rodLengthSlider = document.getElementById('length');
  const rodLengthVal = document.getElementById('length-val');

  const force1Slider = document.getElementById('force1');
  const force1Val = document.getElementById('force1-val');

  const force2Slider = document.getElementById('force2');
  const force2Val = document.getElementById('force2-val');

  const pos1Slider = document.getElementById('pos1');
  const pos1Val = document.getElementById('pos1-val');

  const pos2Slider = document.getElementById('pos2');
  const pos2Val = document.getElementById('pos2-val');

  const startBtn = document.getElementById('start');
  const pauseBtn = document.getElementById('pause');
  const resetBtn = document.getElementById('reset');

  const angleDisplay = document.getElementById('angle');
  const omegaDisplay = document.getElementById('omega');
  const torqueDisplay = document.getElementById('torque');

  // SIMULATION VARIABLES

  const scale = 120;
  let rod;
  let running = false;

  class RodSystem {
  constructor(length, force1, force2, pos1, pos2) {
    this.length = length;

    this.force1 = force1;
    this.force2 = force2;

    this.pos1 = pos1;
    this.pos2 = pos2;

    this.angle = 0;
    this.angularVelocity = 0;

    this.mass = 5;

    this.inertia =
      (1 / 12) * this.mass * this.length * this.length;
  }

  getTorque() {
    return (
      this.pos1 * this.force1 +
      this.pos2 * this.force2
    );
  }

  update(dt) {
    const torque = this.getTorque();

    const angularAcceleration =
      torque / this.inertia;

    this.angularVelocity +=
      angularAcceleration * dt;

    // damping
    this.angularVelocity *= 0.995;

    this.angle +=
      this.angularVelocity * dt;
  }

  draw() {
    let dpr = window.devicePixelRatio || 1;
    const centerX = canvas.width / (2 * dpr);
    const centerY = canvas.height / (2 * dpr);

    // RESET TRANSFORM
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.save();

    ctx.translate(centerX, centerY);
    ctx.rotate(this.angle);

    const rodPixelLength = this.length * scale;

    // =====================
    // ROD
    // =====================

    ctx.beginPath();
    ctx.moveTo(-rodPixelLength / 2, 0);
    ctx.lineTo(rodPixelLength / 2, 0);

    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#333';
    ctx.stroke();

    // =====================
    // PIVOT
    // =====================

    ctx.beginPath();

    ctx.arc(0, 0, 16, 0, Math.PI * 2);

    ctx.fillStyle = '#888';

    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#444';

    ctx.stroke();

    // =====================
    // FORCE 1
    // =====================

    const x1 = this.pos1 * scale;

    ctx.beginPath();
    ctx.arc(x1, 0, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#4a90e2';
    ctx.fill();

    this.drawForceArrow(
      x1,
      0,
      this.force1,
      '#4a90e2'
    );

    // =====================
    // FORCE 2
    // =====================

    const x2 = this.pos2 * scale;

    ctx.beginPath();
    ctx.arc(x2, 0, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#e74c3c';
    ctx.fill();

    this.drawForceArrow(
      x2,
      0,
      this.force2,
      '#e74c3c'
    );

    ctx.restore();

    // DRAW TORQUE ARROWS IN WORLD SPACE
    this.drawTorqueArrow(
      centerX + x1 * Math.cos(this.angle),
      centerY + x1 * Math.sin(this.angle),
      this.pos1 * this.force1,
      '#4a90e2'
    );

    this.drawTorqueArrow(
      centerX + x2 * Math.cos(this.angle),
      centerY + x2 * Math.sin(this.angle),
      this.pos2 * this.force2,
      '#e74c3c'
    );
  }

  drawForceArrow(x, y, force, color) {
  const dir = force >= 0 ? 1 : -1;

  const length = Math.abs(force) * 7 + 20;

  const endY = y + dir * length;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;

  ctx.lineWidth = 5;
  ctx.lineCap = 'round';

  // glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;

  // shaft
  ctx.beginPath();

  ctx.moveTo(x, y);
  ctx.lineTo(x, endY);

  ctx.stroke();

  // arrowhead
  ctx.beginPath();

  ctx.moveTo(x, endY);

  ctx.lineTo(
    x - 10,
    endY - dir * 16
  );

  ctx.lineTo(
    x + 10,
    endY - dir * 16
  );

  ctx.closePath();

  ctx.fill();

  ctx.shadowBlur = 0;
}

  drawTorqueArrow(x, y, torque, color) {
    if (Math.abs(torque) < 0.01) return;

    const clockwise = torque < 0;

    const radius = 28;

    const startAngle = clockwise
      ? Math.PI * 0.15
      : Math.PI * 1.15;

    const endAngle = clockwise
      ? Math.PI * 1.15
      : Math.PI * 0.15;

    ctx.beginPath();

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;

    ctx.arc(
      x,
      y,
      radius,
      startAngle,
      endAngle,
      clockwise
    );

    ctx.stroke();

    // arrowhead
    const ax =
      x + radius * Math.cos(endAngle);

    const ay =
      y + radius * Math.sin(endAngle);

    ctx.beginPath();

    ctx.moveTo(ax, ay);

    ctx.lineTo(
      ax - 8 * Math.cos(endAngle - 0.4),
      ay - 8 * Math.sin(endAngle - 0.4)
    );

    ctx.lineTo(
      ax - 8 * Math.cos(endAngle + 0.4),
      ay - 8 * Math.sin(endAngle + 0.4)
    );

    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();
  }
}

  // UI UPDATES
  function updateLabels() {
    rodLengthVal.textContent = rodLengthSlider.value;

    force1Val.textContent = force1Slider.value;
    force2Val.textContent = force2Slider.value;

    pos1Val.textContent = pos1Slider.value;
    pos2Val.textContent = pos2Slider.value;
  }

  updateLabels();

  [
    rodLengthSlider,
    force1Slider,
    force2Slider,
    pos1Slider,
    pos2Slider
  ].forEach(slider => {
    slider.addEventListener('input', updateLabels);
  });

 
  // BUTTONS
  startBtn.onclick = () => {
    rod = new RodSystem(
      parseFloat(rodLengthSlider.value),
      parseFloat(force1Slider.value),
      parseFloat(force2Slider.value),
      parseFloat(pos1Slider.value),
      parseFloat(pos2Slider.value)
    );

    running = true;
  };

  pauseBtn.onclick = () => {
    running = !running;
  };

  resetBtn.onclick = () => {
    running = false;
    rod = null;
  };

  // =========================
  // UPDATE
  // =========================
  function update() {
    if (!running || !rod) return;

    angleDisplay.textContent =
      (rod.angle * 180 / Math.PI).toFixed(2);

    omegaDisplay.textContent =
      rod.angularVelocity.toFixed(2);

    torqueDisplay.textContent =
      rod.getTorque().toFixed(2);
  }

  // =========================
  // DRAW
  // =========================
  function drawBackground() {
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  ctx.fillStyle = '#f5f7fa';

  ctx.fillRect(0, 0, w, h);

  ctx.beginPath();

  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);

  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 2;

  ctx.stroke();
}

  function drawPreview() {
    const centerX = canvas.width / (2 * dpr);
    const centerY = canvas.height / (2 * dpr);

    const length = parseFloat(rodLengthSlider.value);

    const pos1 = parseFloat(pos1Slider.value);
    const pos2 = parseFloat(pos2Slider.value);

    ctx.save();

    ctx.translate(centerX, centerY);

    // rod
    ctx.beginPath();
    ctx.moveTo(-length * scale / 2, 0);
    ctx.lineTo(length * scale / 2, 0);

    ctx.lineWidth = 10;
    ctx.strokeStyle = '#333';
    ctx.stroke();

    // pivot
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#666';
    ctx.fill();

    // force points
    ctx.beginPath();
    ctx.arc(pos1 * scale, 0, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#4a90e2';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(pos2 * scale, 0, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#e74c3c';
    ctx.fill();

    ctx.restore();
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.clearRect(0, 0, w, h);

    drawBackground();

    ctx.save();

    ctx.shadowColor = 'rgba(0,0,0,0.167)';
    ctx.shadowBlur = 5;

    if (rod) {
      rod.draw();
    } else {
      drawPreview();
    }
    
    ctx.restore();
  }

  // =========================
  // MAIN LOOP
  // =========================
  let lastTime = performance.now();

  function animate(currentTime) {
   const dt = Math.min(
    (currentTime - lastTime) / 1000,
    0.033
  );

  lastTime = currentTime;

  if (running && rod) {
    rod.update(dt);
  }

    update();
    draw();
    
    requestAnimationFrame(animate);


  }

  requestAnimationFrame(animate);
});