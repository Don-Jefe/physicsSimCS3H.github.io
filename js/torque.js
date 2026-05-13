document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('sim');
  const ctx = canvas.getContext('2d');

  function initCanvas() {
    canvas.width = window.innerWidth * 0.65;
    canvas.height = window.innerHeight * 0.7;
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

      // positions relative to center
      this.pos1 = pos1;
      this.pos2 = pos2;

      this.angle = 0.0;
      this.angularVelocity = 0;

      this.mass = 5;

      // Moment of inertia for rod
      this.inertia = (1 / 12) * this.mass * this.length * this.length;
    }

    getTorque() {
      // τ = rFsin(θ)
      // Force direction is vertical downward

      const torque1 = this.pos1 * this.force1;
      const torque2 = this.pos2 * this.force2;

      return torque1 + torque2;
    }

    update(dt) {
      const torque = this.getTorque();

      const angularAcceleration = torque / this.inertia;

      this.angularVelocity += angularAcceleration * dt;

      this.angle += this.angularVelocity * dt;
    }

    draw() {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      ctx.save();

      ctx.translate(centerX, centerY);
      ctx.rotate(this.angle);

      // Rod
      ctx.beginPath();
      ctx.moveTo(-this.length * scale / 2, 0);
      ctx.lineTo(this.length * scale / 2, 0);

      ctx.lineWidth = 10;
      ctx.strokeStyle = '#333';
      ctx.stroke();

      // Pivot
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#666';
      ctx.fill();

      // =====================
      // FORCE 1
      // =====================
      const x1 = this.pos1 * scale;

      ctx.beginPath();
      ctx.arc(x1, 0, 12, 0, Math.PI * 2);
      ctx.fillStyle = '#4a90e2';
      ctx.fill();

      this.drawArrow(x1, 0, this.force1, '#4a90e2');


      // FORCE 2
      const x2 = this.pos2 * scale;

      ctx.beginPath();
      ctx.arc(x2, 0, 12, 0, Math.PI * 2);
      ctx.fillStyle = '#e74c3c';
      ctx.fill();

      this.drawArrow(x2, 0, this.force2, '#e74c3c');

      ctx.restore();
    }

    drawArrow(x, y, force, color) {
      const length = force * 4;

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 3;

      // line
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + length);
      ctx.stroke();

      // arrowhead
      ctx.beginPath();
      ctx.moveTo(x - 6, y + length - 10);
      ctx.lineTo(x + 6, y + length - 10);
      ctx.lineTo(x, y + length);
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

    rod.update(0.016);

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
    ctx.fillStyle = '#f5f7fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // horizontal axis
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);

    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawPreview() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

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
    drawBackground();

    if (rod) {
      rod.draw();
    } else {
      drawPreview();
    }
  }

  // =========================
  // MAIN LOOP
  // =========================
  function animate() {
    update();
    draw();

    requestAnimationFrame(animate);
  }

  animate();
});