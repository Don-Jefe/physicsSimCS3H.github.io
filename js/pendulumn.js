document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('sim');
  const ctx = canvas.getContext('2d');

  function initCanvas() {
    canvas.width = window.innerWidth * 0.6;
    canvas.height = window.innerHeight * 0.6;
    canvas.style.height = canvas.height + 'px';
  }
  window.addEventListener('resize', initCanvas);
  initCanvas();

  const angleSlider = document.getElementById('angle');
  const angleVal = document.getElementById('angle-val');
  const lengthSlider = document.getElementById('length');
  const lengthVal = document.getElementById('length-val');
  const gravitySlider = document.getElementById('gravity');
  const gravityVal = document.getElementById('gravity-val');
  const startBtn = document.getElementById('start');
  const pauseBtn = document.getElementById('pause');
  const resetBtn = document.getElementById('reset');

  let pendulum = null;
  let isRunning = false;
  let time = 0;
  const scale = 75;

  class Pendulum {
    constructor(angle, length, gravity) {
      this.angle = angle * Math.PI / 180;
      this.length = length;
      this.gravity = gravity;
      this.angularVelocity = 0;
    }

    update(dt) {
      const angularAcceleration = (-this.gravity / this.length) * Math.sin(this.angle);
      this.angularVelocity += angularAcceleration * dt;
      this.angle += this.angularVelocity * dt;
    }

    getPosition() {
      return {
        x: this.length * Math.sin(this.angle),
        y: this.length * Math.cos(this.angle)
      };
    }

    draw(ctx) {
      const { x, y } = this.getPosition();

      // rod
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(x * scale, y * scale);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 4;
      ctx.stroke();

      // bob
      ctx.beginPath();
      ctx.arc(x * scale, y * scale, 15, 0, Math.PI * 2);
      ctx.fillStyle = '#7a5a3a';
      ctx.shadowColor = '#bc946c';
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // UI updates
  angleSlider.oninput = () => angleVal.textContent = angleSlider.value;
  lengthSlider.oninput = () => lengthVal.textContent = lengthSlider.value;
  gravitySlider.oninput = () => gravityVal.textContent = parseFloat(gravitySlider.value).toFixed(2);

  startBtn.onclick = () => {
    pendulum = new Pendulum(
      parseFloat(angleSlider.value),
      parseFloat(lengthSlider.value),
      parseFloat(gravitySlider.value)
    );
    isRunning = true;
    time = 0;
  };

  pauseBtn.onclick = () => isRunning = !isRunning;

  resetBtn.onclick = () => {
    isRunning = false;
    pendulum = null;
    time = 0;
  };

  function update() {
    if (isRunning && pendulum) {
      const dt = 0.016;
      pendulum.update(dt);
      time += dt;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#f0f8ff');
    gradient.addColorStop(1, '#e6f3ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height * 0.3);

    // Pivot point
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#667';
    ctx.fill();

    if (pendulum) {
      pendulum.draw(ctx);
    }

    ctx.restore();
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  loop();
});
