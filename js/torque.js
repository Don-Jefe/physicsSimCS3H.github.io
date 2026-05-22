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

    // Keep reference to inputs so sliders can affect forces during run.
    this._sliders = {
      force1: force1Slider,
      force2: force2Slider,
      pos1: pos1Slider,
      pos2: pos2Slider,
      length: rodLengthSlider
    };

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
    // Live-update parameters from sliders while running.
    this.length = parseFloat(this._sliders.length.value);
    this.force1 = parseFloat(this._sliders.force1.value);
    this.force2 = parseFloat(this._sliders.force2.value);
    this.pos1 = parseFloat(this._sliders.pos1.value);
    this.pos2 = parseFloat(this._sliders.pos2.value);
    

    // Recompute inertia if length changed.
    this.inertia = (1 / 12) * this.mass * this.length * this.length;

    const torque = this.getTorque();

    const angularAcceleration = torque / this.inertia;

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

    

    const pos1 = parseFloat(pos1Slider.value);
    const pos2 = parseFloat(pos2Slider.value);

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
    ctx.arc(x1, 0, 0, 0, Math.PI * 2);
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
    ctx.arc(x2, 0, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#e74c3c';
    ctx.fill();

    this.drawForceArrow(
      x2,
      0,
      this.force2,
      '#e74c3c'
    );

    ctx.restore();

    

  
  }

  drawForceArrow(x, y, force, color) {
    const dir = force >= 0 ? 1 : -1;

  const length = Math.abs(force) * 7 + 20;

  const endY = y + dir * length;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;

    ctx.lineWidth = 5;
    ctx.lineCap = 'round';

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

  ctx.fillStyle = '#fdfaf5';

  ctx.fillRect(0, 0, w, h);

  ctx.beginPath();

 

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

    

    ctx.restore();
  }

  function drawForcesFromSliders() {
    // Draw arrows in preview mode (before Start) using current slider values
    const centerX = canvas.width / (2 * dpr);
    const centerY = canvas.height / (2 * dpr);

    const force1 = parseFloat(force1Slider.value);
    const force2 = parseFloat(force2Slider.value);

    const pos1 = parseFloat(pos1Slider.value);
    const pos2 = parseFloat(pos2Slider.value);

    // In preview, the rod angle is 0, so we can treat world space = local space.
    const x1 = pos1 * scale;
    const x2 = pos2 * scale;

    drawForceArrow(centerX + x1, centerY, force1, '#4a90e2');
    drawForceArrow(centerX + x2, centerY, force2, '#e74c3c');

    
  }

  // Standalone arrow helpers for preview mode.
  function drawForceArrow(x, y, force, color) {
    const dir = force >= 0 ? 1 : -1;
    const length = Math.abs(force) * 7 + 20;
    const endY = y + dir * length;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    ctx.lineWidth = 5;
    ctx.lineCap = 'round';

    // shaft
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, endY);
    ctx.stroke();

    // arrowhead
    ctx.beginPath();
    ctx.moveTo(x, endY);
    ctx.lineTo(x - 10, endY - dir * 16);
    ctx.lineTo(x + 10, endY - dir * 16);
    ctx.closePath();
    ctx.fill();
  }

  





  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.clearRect(0, 0, w, h);

    drawBackground();

    ctx.save();

    // No glow in preview/initial render to avoid arc-looking halos
    ctx.shadowColor = 'rgba(0,0,0,0)';
    ctx.shadowBlur = 0;

    if (rod) {
      rod.draw();
    } else {
      // Before Start: show forces/torque arrows using current slider values
      drawPreview();
      drawForcesFromSliders();

      // Also show torque value contributions (net torque will be 0 in UI unless simulation runs)
      // Keep it visual-only; stats update on Start.
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