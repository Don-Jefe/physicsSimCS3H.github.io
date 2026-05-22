/**
 * Pendulum Simulator — Constraint-based (single/double/triple)
 * Author: Jeffrey Heintz vibe-style comments (JP &)
 * 
 * outline
 * 1) Make 1/2/3 pendulums behave like rigid rods 
 * 2) Make mouse dragging feel smooth while physics run.
 * 3) Make the visuals match the rest of the project oak + glow).
 *
 * Implementation notes:
 * - Uses Verlet integration on bob points (px, py + previous px/py).
 * - Uses iterative distance constraints to enforce fixed link lengths.
 * - Dragging: the grabbed bob is pulled toward the mouse via a spring term,
 *   while constraints continue to solve so links remain stable.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Canvas = where all the simulation drawing happens.
  const canvas = document.getElementById('sim');
  // 2D context = we draw rods + bobs + shadows here.
  const ctx = canvas.getContext('2d');


  const dpr = window.devicePixelRatio || 1;

  // UI (existing)
  const angleSlider = document.getElementById('angle');
  const lengthSlider = document.getElementById('length');
  const gravitySlider = document.getElementById('gravity');

  const angleVal = document.getElementById('angle-val');
  const lengthVal = document.getElementById('length-val');
  const gravityVal = document.getElementById('gravity-val');

  const startBtn = document.getElementById('start');
  const pauseBtn = document.getElementById('pause');
  const resetBtn = document.getElementById('reset');

  const add2 = document.getElementById('add2');
  const add3 = document.getElementById('add3');
  const add1 = document.getElementById('add1');
  const numInput = document.getElementById('number-of-pendulums');


  // Telemetry HUD (now static HTML in pendulumn.html)
  // Expected container id: #pendulum-telemetry
  const telemetryEl = document.getElementById('pendulum-telemetry');
  if (!telemetryEl) {
    console.warn('Missing telemetry container: #pendulum-telemetry');
  }


  const p_t = document.getElementById('p_t');
  const p_E = document.getElementById('p_E');
  const p_th1 = document.getElementById('p_th1');
  const p_th2 = document.getElementById('p_th2');
  const p_th3 = document.getElementById('p_th3');
  const p_fps = document.getElementById('p_fps');

  const COLORS = {
    bg1: '#fdfaf5',
    bg2: '#fdfaf5',
    rod: '#13110f',
    rodGlow: 'rgba(43, 47, 58, 0.06)',
    pivot: '#6f6a5a',
    bob1: '#a67c52',
    bob2: '#7a5a3a',
    shadow: 'rgba(0,0,0,0.10)'
  };

  // Controls
  function syncLabels() {
    angleVal.textContent = angleSlider.value + '°';
    lengthVal.textContent = lengthSlider.value + 'm';
    gravityVal.textContent = parseFloat(gravitySlider.value).toFixed(2);
  }
  syncLabels();

  let running = false;
  let dragging = false;
  let grabbed = -1; // bob index 0..n-1
  let dragTarget = { x: 0, y: 0 };

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function getCanvasPoint(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: e.clientX - r.left,
      y: e.clientY - r.top
    };
  }

  // Stable constraint pendulum (Verlet + rod length constraints)
  class PendulumSystem {
    constructor() {
      this.n = 1; // 1..3 (bobs count)

      this.q = [0, 0, 0];
      this.dq = [0, 0, 0]; // approx from Verlet

      this.m = [1, 1, 1]; // not used in constraint solve (rods massless), but used for telemetry energy*

      this.totalLength = parseFloat(lengthSlider.value); // meters
      this.g = parseFloat(gravitySlider.value);

      // screen-space state (CSS pixels)
      this.x = [0, 0, 0];
      this.y = [0, 0, 0];
      this.px = [0, 0, 0];
      this.py = [0, 0, 0];

      this.linkLenPx = [0, 0, 0];

      this.damping = 0.995;
      this.iter = 12;
      this.dragSpring = 0.25;

      this.time = 0;

      this._inited = false;
      this.anchor = { x: 0, y: 0 };

      this._lastAngle = [0, 0, 0];
    }

    pixelsPerMeter() {
      // match old page feel: 5m ~ 65% of canvas height
      const h = canvas.height / dpr;
      return (h * 0.65) / 5;
    }

    getAnchorPx() {
      return {
        x: (canvas.width / dpr) / 2,
        y: (canvas.height / dpr) * 0.3
      };
    }

    updateParamsFromUI() {
      this.g = parseFloat(gravitySlider.value);
      this.totalLength = parseFloat(lengthSlider.value);

      const segM = this.totalLength / this.n;
      const ppm = this.pixelsPerMeter();
      const segPx = segM * ppm;
      for (let i = 0; i < 3; i++) this.linkLenPx[i] = segPx;

      // gravity accel in px/s^2
      this.gPx = this.g * ppm;
    }

    reset() {
      this._inited = true;
      this.updateParamsFromUI();

      this.anchor = this.getAnchorPx();
      const th = (parseFloat(angleSlider.value) * Math.PI) / 180;

      // init chain by placing bobs along their segment directions
      let x = this.anchor.x;
      let y = this.anchor.y;
      const q0 = th;
      const qs = [q0, this.n >= 2 ? q0 * 0.9 : 0, this.n >= 3 ? q0 * 0.7 : 0];

      for (let i = 0; i < this.n; i++) {
        x += Math.sin(qs[i]) * this.linkLenPx[i];
        y += Math.cos(qs[i]) * this.linkLenPx[i];
        this.x[i] = x;
        this.y[i] = y;
        this.px[i] = x;
        this.py[i] = y;
        this._lastAngle[i] = qs[i];
        this.q[i] = qs[i];
        this.dq[i] = 0;
      }

      for (let i = this.n; i < 3; i++) {
        this.x[i] = 0; this.y[i] = 0; this.px[i] = 0; this.py[i] = 0;
        this.q[i] = 0; this.dq[i] = 0;
      }

      this.time = 0;
    }

    step(dt) {
      if (!this._inited) return;

      // Verlet integration
      for (let i = 0; i < this.n; i++) {
        const vx = (this.x[i] - this.px[i]) * this.damping;
        const vy = (this.y[i] - this.py[i]) * this.damping;

        this.px[i] = this.x[i];
        this.py[i] = this.y[i];

        // gravity
        this.x[i] += vx;
        this.y[i] += vy + this.gPx * dt * dt;

        // drag spring (directly on bob position)
        if (dragging && i === grabbed) {
          this.x[i] += (dragTarget.x - this.x[i]) * this.dragSpring;
          this.y[i] += (dragTarget.y - this.y[i]) * this.dragSpring;
        }
      }

      // Constraints enforce rod lengths
      for (let k = 0; k < this.iter; k++) {
        // first bob to anchor
        if (this.n >= 1) {
          const dx = this.x[0] - this.anchor.x;
          const dy = this.y[0] - this.anchor.y;
          const dist = Math.hypot(dx, dy) || 1e-6;
          const diff = (dist - this.linkLenPx[0]) / dist;
          // parent is fixed
          this.x[0] -= dx * diff;
          this.y[0] -= dy * diff;
        }

        // between bobs
        for (let i = 1; i < this.n; i++) {
          const x0 = this.x[i - 1];
          const y0 = this.y[i - 1];
          const dx = this.x[i] - x0;
          const dy = this.y[i] - y0;
          const dist = Math.hypot(dx, dy) || 1e-6;
          const diff = (dist - this.linkLenPx[i]) / dist;
          const corrX = dx * diff;
          const corrY = dy * diff;

          const parentFree = !(dragging && (i - 1) === grabbed);
          const childFree = !(dragging && i === grabbed);

          if (parentFree && childFree) {
            this.x[i - 1] += corrX * 0.5;
            this.y[i - 1] += corrY * 0.5;
            this.x[i] -= corrX * 0.5;
            this.y[i] -= corrY * 0.5;
          } else if (childFree) {
            // only move child
            this.x[i] -= corrX;
            this.y[i] -= corrY;
          } else if (parentFree) {
            // only move parent
            this.x[i - 1] += corrX;
            this.y[i - 1] += corrY;
          }
        }
      }

      // Update approximate angles for telemetry (theta from vertical)
      for (let i = 0; i < this.n; i++) {
        const px = i === 0 ? this.anchor.x : this.x[i - 1];
        const py = i === 0 ? this.anchor.y : this.y[i - 1];
        const dx = this.x[i] - px;
        const dy = this.y[i] - py;
        const ang = Math.atan2(dx, dy);
        this.dq[i] = (ang - this._lastAngle[i]) / Math.max(dt, 1e-6);
        this.q[i] = ang;
        this._lastAngle[i] = ang;
      }

      this.time += dt;
    }

    energyApprox() {
      // Approximate energy using bob velocities from Verlet and height from geometry.
      // Constraint energy is ignored; good enough for stable telemetry.
      let K = 0;
      let V = 0;

      const ppm = this.pixelsPerMeter();
      const segM = this.totalLength / this.n;

      for (let i = 0; i < this.n; i++) {
        const vx = (this.x[i] - this.px[i]) / Math.max(dtLast, 1e-6);
        const vy = (this.y[i] - this.py[i]) / Math.max(dtLast, 1e-6);
        // convert px velocity to meters/s
        const vxm = vx / ppm;
        const vym = vy / ppm;
        const v2 = vxm * vxm + vym * vym;
        K += 0.5 * this.m[i] * v2;

        // height relative to anchor (y increases downward)
        // compute bob y in meters from pixel y
        const yRelPx = this.y[i] - this.anchor.y;
        const yRelM = yRelPx / ppm;
        // potential V = m g (-y) where up positive; with down-positive yRelM, height above anchor = -yRelM
        V += this.m[i] * this.g * (-yRelM);
      }
      return { K, V, E: K + V };
    }

    draw() {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, COLORS.bg1);
      grad.addColorStop(1, COLORS.bg2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // shadow under end bob
      if (this.n > 0) {
        const endX = this.x[this.n - 1];
        const endY = this.y[this.n - 1];
        ctx.beginPath();
        ctx.fillStyle = COLORS.shadow;
        ctx.fill();
      }

      // anchor pivot
      ctx.beginPath();
      ctx.arc(this.anchor.x, this.anchor.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.pivot;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(60,40,15,0.25)';
      ctx.stroke();

      // rods
      for (let i = 0; i < this.n; i++) {
        const x0 = i === 0 ? this.anchor.x : this.x[i - 1];
        const y0 = i === 0 ? this.anchor.y : this.y[i - 1];
        const x1 = this.x[i];
        const y1 = this.y[i];

        const thickness = 10 - i * 2.2;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineWidth = thickness;
        ctx.strokeStyle = COLORS.rod;
        ctx.shadowColor = COLORS.rodGlow;
        ctx.shadowBlur = 2;

        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.restore();

        
        ctx.save();
        ctx.stroke();
        ctx.restore();
      }

      // bobs
      for (let i = 0; i < this.n; i++) {
        const r = 14 - i * 1.8;
        const x = this.x[i];
        const y = this.y[i];

        const gradBob = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r);
        gradBob.addColorStop(0, '#b69b81');
        gradBob.addColorStop(0.3, COLORS.bob1);
        gradBob.addColorStop(1, COLORS.bob2);

        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = gradBob;
        ctx.shadowColor = 'rgba(122,90,58,0.18)';
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.restore();

        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(35,25,15,0.55)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();

        // specular
        // ctx.beginPath();
        // ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.28, 0, Math.PI * 2);
        // ctx.fillStyle = 'rgba(255,255,255,0.45)';
        // ctx.fill();
      }

      // drag indicator
      if (dragging && grabbed >= 0) {
        ctx.beginPath();
        ctx.arc(dragTarget.x, dragTarget.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#a67c52';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(74,144,226,0.35)';
        ctx.stroke();
      }
    }
  }

  const sim = new PendulumSystem();

  // Resize: match existing styling (CSS controls sizing)
  function resizeCanvas() {
    // Use the canvas parent size
    const rect = canvas.getBoundingClientRect();
    const cssW = rect.width || 800;
    const cssH = rect.height || 500;

    canvas.width = Math.max(2, Math.floor(cssW * dpr));
    canvas.height = Math.max(2, Math.floor(cssH * dpr));

    // keep simulation coherent
    sim.reset();
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Mouse dragging
  canvas.addEventListener('pointerdown', (e) => {
    const p = getCanvasPoint(e);

    // compute nearest bob by current geometry
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < sim.n; i++) {
      const dx = p.x - sim.x[i];
      const dy = p.y - sim.y[i];
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }

    if (best === -1 || bestD > 120 * 120) return;

    dragging = true;
    grabbed = best;
    dragTarget = { x: p.x, y: p.y };

    // start simulation on grab for better UX
    running = true;
    canvas.setPointerCapture?.(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const p = getCanvasPoint(e);
    dragTarget = { x: p.x, y: p.y };
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    grabbed = -1;
    canvas.releasePointerCapture?.(e.pointerId);
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  // UI events
  angleSlider.oninput = () => {
    syncLabels();
    sim.reset();
  };
  lengthSlider.oninput = () => {
    syncLabels();
    sim.reset();
  };
  gravitySlider.oninput = () => {
    syncLabels();
    sim.reset();
  };

  startBtn.onclick = () => {
    running = true;
  };

  pauseBtn.onclick = () => {
    running = !running;
  };

  resetBtn.onclick = () => {
    running = false;
    dragging = false;
    grabbed = -1;
    sim.reset();
  };

  if (add2) {
    add2.onclick = () => {
      sim.n = 2;
      sim.reset();
    };
  }
  if (add3) {
    add3.onclick = () => {
      sim.n = 3;
      sim.reset();
    };
  }
  if (add1) {
    add1.onclick = () => {
      sim.n = 1;
      sim.reset();
    };
  }
  if (numInput) {
    numInput.onchange = () => {
      const val = parseInt(numInput.value);
      if (isNaN(val) || val < 1 || val > 3) {
        numInput.value = sim.n;
        return;
      }
      sim.n = val;
      sim.reset();
    };
  }



  // Main loop
  let lastT = performance.now();
  let dtLast = 1 / 60;

  let fpsLast = performance.now();
  let fpsFrames = 0;

  function loop(t) {
    const dt = Math.min((t - lastT) / 1000, 0.02);
    lastT = t;
    dtLast = dt;

    if (running) {
      sim.step(dt);
    } else if (dragging) {
      // still evolve physics when user is dragging even if paused
      sim.step(dt);
    }

    sim.draw();

    // telemetry
    p_t.textContent = sim.time.toFixed(2);
    const { E } = sim.energyApprox();
    p_E.textContent = E.toFixed(2);

    p_th1.textContent = (sim.q[0] * 180 / Math.PI).toFixed(2);
    p_th2.textContent = (sim.n >= 2 ? sim.q[1] * 180 / Math.PI : 0).toFixed(2);
    p_th3.textContent = (sim.n >= 3 ? sim.q[2] * 180 / Math.PI : 0).toFixed(2);

    fpsFrames++;
    if (t - fpsLast >= 500) {
      const fps = Math.round((fpsFrames * 1000) / (t - fpsLast));
      p_fps.textContent = String(fps);
      fpsFrames = 0;
      fpsLast = t;
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
});

