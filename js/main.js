// Multiple demos manager: projectile and SHM (plain JS + canvas)
(function(){
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  // UI elements for navigation
  const navProj = document.getElementById('nav-projectile');
  const navShm = document.getElementById('nav-shm');

  // Containers
  const projControls = document.getElementById('proj-controls');
  const shmControls = document.getElementById('shm-controls');

  // Projectile elements
  const angleInput = document.getElementById('angle');
  const speedInput = document.getElementById('speed');
  const gravityInput = document.getElementById('gravity');
  const angleVal = document.getElementById('angle-val');
  const speedVal = document.getElementById('speed-val');
  const gravityVal = document.getElementById('gravity-val');
  const launchBtn = document.getElementById('launch');
  const resetBtn = document.getElementById('reset');

  // SHM elements
  const shmAmp = document.getElementById('shm-amplitude');
  const shmAmpVal = document.getElementById('shm-amplitude-val');
  const shmMass = document.getElementById('shm-mass');
  const shmMassVal = document.getElementById('shm-mass-val');
  const shmK = document.getElementById('shm-k');
  const shmKVal = document.getElementById('shm-k-val');
  const shmC = document.getElementById('shm-c');
  const shmCVal = document.getElementById('shm-c-val');
  const shmStart = document.getElementById('shm-start');
  const shmStop = document.getElementById('shm-stop');
  const shmReset = document.getElementById('shm-reset');
  // Circuit elements
  const navCircuit = document.getElementById('nav-circuit');
  const circuitControls = document.getElementById('circuit-controls');
  const circVin = document.getElementById('circ-vin');
  const circVinVal = document.getElementById('circ-vin-val');
  const circR = document.getElementById('circ-r');
  const circRVal = document.getElementById('circ-r-val');
  const circC = document.getElementById('circ-c');
  const circCVal = document.getElementById('circ-c-val');
  const circMode = document.getElementById('circ-mode');
  const circStart = document.getElementById('circ-start');
  const circStop = document.getElementById('circ-stop');
  const circReset = document.getElementById('circ-reset');

  let rafId = null;
  let mode = 'projectile';

  // ---------- Projectile demo state ----------
  let trajectory = [];
  let projectile = null;

  function updateProjLabels(){
    angleVal.textContent = angleInput.value + '°';
    speedVal.textContent = speedInput.value;
    gravityVal.textContent = gravityInput.value;
  }
  angleInput.addEventListener('input', updateProjLabels);
  speedInput.addEventListener('input', updateProjLabels);
  gravityInput.addEventListener('input', updateProjLabels);
  updateProjLabels();

  function startLaunch(){
    cancelAnim();
    trajectory = [];
    const angleDeg = Number(angleInput.value);
    const speed = Number(speedInput.value);
    const g = Number(gravityInput.value);

    const rad = angleDeg * Math.PI/180;
    const startX = 40;
    const groundY = canvas.height - 30;
    const scale = 5; // pixels per meter (adjustable)

    projectile = {
      x: startX,
      y: groundY,
      vx: speed*Math.cos(rad)*scale/10,
      vy: -speed*Math.sin(rad)*scale/10,
      g: g*scale/10,
      radius: 6
    };

    trajectory.push({x: projectile.x, y: projectile.y});
    animateProjectile();
  }

  function animateProjectile(){
    const groundY = canvas.height - 30;
    function step(){
      projectile.vy += projectile.g;
      projectile.x += projectile.vx;
      projectile.y += projectile.vy;
      trajectory.push({x: projectile.x, y: projectile.y});

      if(projectile.y + projectile.radius >= groundY){
        projectile.y = groundY - projectile.radius;
        draw();
        cancelAnim();
        return;
      }

      draw();
      rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);
  }

  // ---------- SHM demo state ----------
  let shm = {
    x: 0, // displacement in px
    v: 0, // velocity px/s
    m: Number(shmMass ? shmMass.value : 1),
    k: Number(shmK ? shmK.value : 10),
    c: Number(shmC ? shmC.value : 0.2),
    A: Number(shmAmp ? shmAmp.value : 100),
    running: false
  };

  function updateShmLabels(){
    if(!shmAmp) return;
    shmAmpVal.textContent = shmAmp.value;
    shmMassVal.textContent = shmMass.value;
    shmKVal.textContent = shmK.value;
    shmCVal.textContent = shmC.value;
  }
  if(shmAmp) shmAmp.addEventListener('input', updateShmLabels);
  if(shmMass) shmMass.addEventListener('input', updateShmLabels);
  if(shmK) shmK.addEventListener('input', updateShmLabels);
  if(shmC) shmC.addEventListener('input', updateShmLabels);
  updateShmLabels();

  // Circuit labels
  function updateCircLabels(){
    if(!circVin) return;
    circVinVal.textContent = circVin.value + ' V';
    circRVal.textContent = circR.value + ' Ω';
    circCVal.textContent = circC.value + ' F';
  }
  if(circVin) circVin.addEventListener('input', updateCircLabels);
  if(circR) circR.addEventListener('input', updateCircLabels);
  if(circC) circC.addEventListener('input', updateCircLabels);
  updateCircLabels();

  function shmStartSim(){
    // initialize
    cancelAnim();
    shm.m = Number(shmMass.value);
    shm.k = Number(shmK.value);
    shm.c = Number(shmC.value);
    shm.A = Number(shmAmp.value);
    shm.x = shm.A;
    shm.v = 0;
    shm.running = true;
    lastTime = performance.now();
    animateShm();
  }

  function shmStopSim(){
    shm.running = false;
    cancelAnim();
  }

  function shmResetSim(){
    shmStopSim();
    shm.x = Number(shmAmp.value);
    shm.v = 0;
    draw();
  }

  let lastTime = 0;
  function animateShm(){
    function step(now){
      const dt = Math.min(0.05, (now - lastTime)/1000); // cap dt
      lastTime = now;
      // equation: m*x'' + c*x' + k*x = 0 -> x'' = -(c/m)*x' - (k/m)*x
      const a = -(shm.c/shm.m)*shm.v - (shm.k/shm.m)*shm.x;
      shm.v += a*dt;
      shm.x += shm.v*dt;

      draw();

      if(shm.running) rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);
  }

  // ---------- Circuit demo state and simulation (RC) ----------
  let circuit = {
    Vc: 0,
    t: 0,
    running: false,
    data: [] // store {t, Vc}
  };

  function circStartSim(){
    cancelAnim();
    circuit.Vc = circMode.value === 'charge' ? 0 : Number(circVin.value);
    circuit.t = 0;
    circuit.data = [{t:0, Vc: circuit.Vc}];
    circuit.running = true;
    lastTime = performance.now();
    animateCircuit();
  }

  function circStopSim(){
    circuit.running = false;
    cancelAnim();
  }

  function circResetSim(){
    circStopSim();
    circuit.Vc = 0;
    circuit.t = 0;
    circuit.data = [{t:0, Vc: circuit.Vc}];
    draw();
  }

  function animateCircuit(){
    function step(now){
      const dt = Math.min(0.05, (now - lastTime)/1000);
      lastTime = now;
      const R = Number(circR.value);
      const C = Number(circC.value);
      const Vin = Number(circVin.value);
      // dVc/dt = (1/RC)*(Vin - Vc) for charging; for discharging Vin=0
      if(circMode.value === 'charge'){
        const dVc = (1/(R*C))*(Vin - circuit.Vc) * dt;
        circuit.Vc += dVc;
      } else {
        const dVc = (1/(R*C))*(0 - circuit.Vc) * dt;
        circuit.Vc += dVc;
      }
      circuit.t += dt;
      circuit.data.push({t: circuit.t, Vc: circuit.Vc});
      // limit stored points
      if(circuit.data.length>2000) circuit.data.shift();
      draw();
      if(circuit.running) rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);
  }

  // ---------- Common drawing ----------
  function clearCanvas(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
  }

  function drawGround(){
    const y = canvas.height - 30;
    ctx.fillStyle = '#e6e6e6';
    ctx.fillRect(0,y,canvas.width,30);
    ctx.strokeStyle = '#bbb';
    ctx.beginPath();
    ctx.moveTo(0,y);
    ctx.lineTo(canvas.width,y);
    ctx.stroke();
  }

  function draw(){
    clearCanvas();
    drawGround();

    if(mode === 'projectile'){
      // draw trajectory
      if(trajectory.length>1){
        ctx.strokeStyle = '#d9534f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(trajectory[0].x, trajectory[0].y);
        for(let i=1;i<trajectory.length;i++) ctx.lineTo(trajectory[i].x, trajectory[i].y);
        ctx.stroke();
      }

      // draw projectile
      if(projectile){
        ctx.fillStyle = '#2b9df4';
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI*2);
        ctx.fill();
      }
    } else if(mode === 'shm'){
      // draw spring-mass horizontally centered
      const cx = canvas.width/2;
      const cy = canvas.height/2;
      const anchorX = cx - 200;
      const massX = cx + shm.x; // displacement in px
      // draw anchor
      ctx.fillStyle = '#555';
      ctx.fillRect(anchorX-8, cy-20, 16, 40);

      // draw spring as zig-zag
      ctx.strokeStyle = '#777';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const segments = 12;
      const sx = anchorX;
      const ex = massX - 30;
      for(let i=0;i<=segments;i++){
        const t = i/segments;
        const x = sx + (ex-sx)*t;
        const y = cy + (i%2===0? -12:12);
        if(i===0) ctx.moveTo(x,y);
        else ctx.lineTo(x,y);
      }
      ctx.stroke();

      // draw mass
      ctx.fillStyle = '#2b9df4';
      ctx.fillRect(massX-30, cy-30, 60, 60);

      // draw baseline
      ctx.strokeStyle = '#bbb';
      ctx.beginPath();
      ctx.moveTo(0, cy+40);
      ctx.lineTo(canvas.width, cy+40);
      ctx.stroke();
    }
    else if(mode === 'circuit'){
      // draw simple circuit diagram left and voltage graph to the right
      const cx = 120;
      const cy = canvas.height/2;

      // battery
      ctx.fillStyle = '#f0c674';
      ctx.fillRect(cx-60, cy-40, 40, 80);
      ctx.fillStyle = '#000';
      ctx.fillText('Vin', cx-50, cy-50);

      // resistor
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx-10, cy);
      ctx.lineTo(cx+60, cy);
      ctx.stroke();
      ctx.fillStyle = '#000';
      ctx.fillText('R', cx+30, cy-10);

      // capacitor
      ctx.beginPath();
      ctx.moveTo(cx+80, cy-20);
      ctx.lineTo(cx+80, cy+20);
      ctx.moveTo(cx+100, cy-20);
      ctx.lineTo(cx+100, cy+20);
      ctx.stroke();
      ctx.fillText('C', cx+88, cy+30);

      // draw Vc value
      ctx.fillStyle = '#000';
      ctx.fillText('Vc = ' + circuit.Vc.toFixed(2) + ' V', cx+120, cy-60);

      // graph on right side
      const gx = canvas.width/2 + 40;
      const gy = 40;
      const gw = canvas.width - gx - 20;
      const gh = canvas.height - 80;
      // background
      ctx.fillStyle = '#fff';
      ctx.fillRect(gx, gy, gw, gh);
      ctx.strokeStyle = '#ccc';
      ctx.strokeRect(gx, gy, gw, gh);

      // axes and plot Vc vs t
      if(circuit.data.length>1){
        const maxT = circuit.data[circuit.data.length-1].t || 1;
        const maxV = Math.max(Number(circVin.value), 1);
        ctx.strokeStyle = '#d9534f';
        ctx.beginPath();
        for(let i=0;i<circuit.data.length;i++){
          const p = circuit.data[i];
          const x = gx + (p.t/maxT) * gw;
          const y = gy + gh - (p.Vc/maxV) * gh;
          if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.stroke();
      }
    }
  }

  function cancelAnim(){
    if(rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // ---------- Mode switching ----------
  function switchMode(to){
    mode = to;
    cancelAnim();
    // show/hide controls
    if(mode === 'projectile'){
      projControls.style.display = '';
      shmControls.style.display = 'none';
      if(circuitControls) circuitControls.style.display = 'none';
    } else if(mode === 'shm'){
      projControls.style.display = 'none';
      shmControls.style.display = '';
      if(circuitControls) circuitControls.style.display = 'none';
    } else if(mode === 'circuit'){
      projControls.style.display = 'none';
      shmControls.style.display = 'none';
      if(circuitControls) circuitControls.style.display = '';
    }
    // reset drawing state for the chosen mode
    trajectory = [];
    projectile = null;
    shm.running = false;
    draw();
  }

  navProj.addEventListener('click', (e)=>{e.preventDefault(); switchMode('projectile');});
  navShm.addEventListener('click', (e)=>{e.preventDefault(); switchMode('shm');});

  // wire up buttons
  launchBtn.addEventListener('click', ()=>{ if(mode==='projectile') startLaunch(); });
  resetBtn.addEventListener('click', ()=>{ if(mode==='projectile'){ cancelAnim(); trajectory=[]; projectile=null; draw(); }});

  if(shmStart) shmStart.addEventListener('click', ()=>{ switchMode('shm'); shmStartSim(); });
  if(shmStop) shmStop.addEventListener('click', ()=>{ shmStopSim(); });
  if(shmReset) shmReset.addEventListener('click', ()=>{ shmResetSim(); });

  // circuit nav & buttons
  if(navCircuit) navCircuit.addEventListener('click', (e)=>{ e.preventDefault(); switchMode('circuit'); });
  if(circStart) circStart.addEventListener('click', ()=>{ switchMode('circuit'); circStartSim(); });
  if(circStop) circStop.addEventListener('click', ()=>{ circStopSim(); });
  if(circReset) circReset.addEventListener('click', ()=>{ circResetSim(); });

  // initial draw & fit
  function fitCanvas(){
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.min(1000, Math.max(600, rect.width));
    drawGround();
    draw();
  }
  window.addEventListener('resize', fitCanvas);
  fitCanvas();

})();
