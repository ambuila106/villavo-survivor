
<template>
  <div class="wrap">
    <h1>Villavicencio Survivor — 10 segundos</h1>
    <div v-if="topPlayer" class="leaderboard top">
      <h3>Mejor puntaje</h3>
      <p>{{ topPlayer.name }} de {{ topPlayer.barrio }}: {{ topPlayer.score }}</p>
    </div>
    <div id="ui">
      <div class="panel">
        <div>Tiempo: <span id="time">{{ remaining.toFixed(1) }}</span>s</div>
        <div style="width:16px"></div>
        <div>Agua recogida: <span id="collected" class="meter">{{ collected }}</span></div>
      </div>
      <button id="startBtn" @click="startGame">{{ startBtnText }}</button>
      <div class="notice">Mueve la caneca con el dedo o el ratón. Esquiva los derrumbes de tierra. Si te golpean, pierdes 10 puntos.</div>
    </div>

    <canvas ref="gameCanvas" id="gameCanvas" width="720" height="480" @pointerdown="handlePointerDown" @pointermove="handlePointerMove" @pointerup="handlePointerUp" @pointercancel="handlePointerCancel"></canvas>
    <div class="panel" style="margin-top:6px"><small>Consejo: toca y arrastra la caneca. Cada derrumbe te quita puntos.</small></div>

    <GameAlert :show="showForm" :score="collected" @submit="handleSubmit" @close="showForm = false" />

  </div>
</template>

<script>
import { ref, push, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { database } from '../firebase.js';
import GameAlert from './Alert.vue';

export default {
  name: 'VillavicencioGame',
  components: {
    GameAlert
  },
  data() {
    return {
      canvas: null,
      ctx: null,
      W: 720,
      H: 480,
      running: false,
      lastTime: 0,
      GAME_DURATION: 10.0,
      remaining: 10.0,
      collected: 0,
      bucket: { x: 720 / 2 - 40, y: 480 - 80, w: 80, h: 50 },
      rain: [],
      debris: [],
      rainTimer: 0,
      debrisTimer: 0,
      pointerDown: false,
      pointerId: null,
      startBtnText: 'Iniciar',
      showForm: false,
      topPlayer: null
    };
  },
  mounted() {
    this.canvas = this.$refs.gameCanvas;
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas);
    this.loop();

    const scoresRef = ref(database, 'scores');
    const topQuery = query(scoresRef, orderByChild('score'), limitToLast(1));
    onValue(topQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const key = Object.keys(data)[0];
        this.topPlayer = data[key];
      } else {
        this.topPlayer = null;
      }
    });
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.resizeCanvas);
  },
  methods: {
    resizeCanvas() {
      const rect = this.canvas.getBoundingClientRect();
      this.canvas._scaleX = this.canvas.width / rect.width;
      this.canvas._scaleY = this.canvas.height / rect.height;
    },
    spawnRain() {
      const count = Math.random() * 2 + 1;
      for (let i = 0; i < count; i++) {
        this.rain.push({
          x: Math.random() * this.W,
          y: -10,
          r: 3 + Math.random() * 3,
          vy: 250 + Math.random() * 250,
          value: 1
        });
      }
    },
    spawnDebris() {
      const size = 20 + Math.random() * 40;
      this.debris.push({
        x: Math.random() * (this.W - size),
        y: -20,
        w: size,
        h: size,
        vy: 280 + Math.random() * 220
      });
    },
    moveBucketToEvent(e) {
      const rect = this.canvas.getBoundingClientRect();
      const cx = (e.clientX - rect.left) * this.canvas._scaleX;
      const cy = (e.clientY - rect.top) * this.canvas._scaleY;
      this.bucket.x = Math.max(0, Math.min(this.W - this.bucket.w, cx - this.bucket.w / 2));
      this.bucket.y = Math.max(this.H / 2, Math.min(this.H - this.bucket.h - 10, cy - this.bucket.h / 2));
    },
    circleRectCollision(cx, cy, cr, rx, ry, rw, rh) {
      const closestX = Math.max(rx, Math.min(cx, rx + rw));
      const closestY = Math.max(ry, Math.min(cy, ry + rh));
      const dx = cx - closestX;
      const dy = cy - closestY;
      return dx * dx + dy * dy <= cr * cr;
    },
    rectRectCollision(a, b) {
      return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
    },
    update(dt) {
      if (!this.running) return;
      this.remaining -= dt;
      if (this.remaining <= 0) {
        this.remaining = 0;
        this.running = false;
        this.finishGame();
      }

      this.rainTimer += dt;
      if (this.rainTimer > 0.04) {
        this.spawnRain();
        this.rainTimer = 0;
      }
      this.debrisTimer += dt;
      if (this.debrisTimer > 0.07 + Math.random() * 0.8) {
        this.spawnDebris();
        this.debrisTimer = 0;
      }

      for (let i = this.rain.length - 1; i >= 0; i--) {
        const p = this.rain[i];
        p.y += p.vy * dt;
        if (this.circleRectCollision(p.x, p.y, p.r, this.bucket.x, this.bucket.y, this.bucket.w, this.bucket.h)) {
          this.collected += p.value;
          this.rain.splice(i, 1);
          continue;
        }
        if (p.y > this.H + 20) this.rain.splice(i, 1);
      }

      for (let i = this.debris.length - 1; i >= 0; i--) {
        const d = this.debris[i];
        d.y += d.vy * dt;
        if (this.rectRectCollision(d, this.bucket)) {
          this.collected = Math.max(0, this.collected - 10);
          this.debris.splice(i, 1);
          console.log('¡Un derrumbe te golpeó! Pierdes 10 puntos.');
        }
        if (d.y > this.H + 50) this.debris.splice(i, 1);
      }
    },
    draw() {
      this.ctx.clearRect(0, 0, this.W, this.H);
      const g = this.ctx.createLinearGradient(0, 0, 0, this.H);
      g.addColorStop(0, '#0b2a43');
      g.addColorStop(1, '#072032');
      this.ctx.fillStyle = g;
      this.ctx.fillRect(0, 0, this.W, this.H);

      for (const p of this.rain) {
        this.ctx.beginPath();
        this.ctx.fillStyle = 'rgba(170,220,255,0.95)';
        this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        this.ctx.fill();
      }

      for (const d of this.debris) {
        this.ctx.fillStyle = '#8b5a2b';
        this.ctx.beginPath();
        this.ctx.arc(d.x + d.w / 2, d.y + d.h / 2, d.w / 2, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.beginPath();
      this.ctx.fillStyle = '#fff';
      this.roundRect(this.ctx, this.bucket.x, this.bucket.y, this.bucket.w, this.bucket.h, 8);
      this.ctx.fill();

      const capacity = 200;
      const waterH = Math.min(this.bucket.h - 6, (this.collected / capacity) * (this.bucket.h - 6));
      this.ctx.fillStyle = 'rgba(96,165,250,0.95)';
      this.ctx.fillRect(this.bucket.x + 6, this.bucket.y + this.bucket.h - 3 - waterH, this.bucket.w - 12, waterH);

      if (!this.running && this.remaining === 0) {
        /*this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(0, 0, this.W, this.H);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '28px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Tiempo terminado', this.W / 2, this.H / 2 - 20);
        this.ctx.font = '20px sans-serif';
        this.ctx.fillText('Agua recogida: ' + this.collected, this.W / 2, this.H / 2 + 12);
        this.ctx.font = '14px sans-serif';
        this.ctx.fillText('Pulsa Reiniciar para jugar otra vez', this.W / 2, this.H / 2 + 48);*/
      }
    },
    roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    },
    finishGame() {
      this.showForm = true;
    },
    handleSubmit(data) {
      push(ref(database, 'scores'), data);
      this.showForm = false;
      this.startBtnText = 'Reiniciar';
    },
    loop(ts) {
      if (!this.lastTime) this.lastTime = ts;
      const dt = (ts - this.lastTime) / 1000;
      this.lastTime = ts;
      this.update(dt);
      this.draw();
      requestAnimationFrame(this.loop);
    },
    startGame() {
      if (this.running) return;
      this.collected = 0;
      this.rain = [];
      this.debris = [];
      this.remaining = this.GAME_DURATION;
      this.running = true;
      this.lastTime = 0;
      this.startBtnText = 'Jugando...';
    },
    handlePointerDown(e) {
      if (!this.running) {
        this.startGame();
      }
      this.pointerDown = true;
      this.pointerId = e.pointerId;
      this.canvas.setPointerCapture(this.pointerId);
      this.moveBucketToEvent(e);
    },
    handlePointerMove(e) {
      if (this.pointerDown) this.moveBucketToEvent(e);
    },
    handlePointerUp(e) {
      if (e.pointerId === this.pointerId) {
        this.pointerDown = false;
        this.canvas.releasePointerCapture(this.pointerId);
        this.pointerId = null;
      }
    },
    handlePointerCancel() {
      this.pointerDown = false;
      this.pointerId = null;
    }
  }
};
</script>

<style scoped>
:root {
  --bg: #0b1221;
  --panel: #0f1724;
  --accent: #22c55e;
}

html,
body {
  height: 100%;
  margin: 0;
  font-family: Inter, system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
}

.wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: linear-gradient(180deg, #071024 0%, #0a1830 100%);
  min-height: 100vh;
  box-sizing: border-box;
  max-width: 800px;
  margin: 0 auto;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.1);
}

h1 {
  color: white;
  margin: 0;
  font-size: 32px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  background: linear-gradient(45deg, #60a5fa, #22c55e);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

#ui {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}

button {
  background: var(--accent);
  color: #04233a;
  border: 0;
  padding: 8px 12px;
  border-radius: 8px;
  font-weight: 600;
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  transition: transform 0.1s;
}

button:hover {
  transform: translateY(-2px);
}

canvas {
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(2, 6, 23, 0.6);
  touch-action: none;
  background: linear-gradient(to bottom, #FFFF00 0% 33%, #0033A0 33% 66%, #FFFF00 66% 100%);
}

.panel {
  background: rgba(255, 255, 255, 0.03);
  padding: 8px 12px;
  border-radius: 10px;
  color: #cfe8ff;
  display: flex;
  gap: 12px;
  align-items: center;
}

.meter {
  font-weight: 700;
}

.notice {
  font-size: 13px;
  color: #9fbfe8;
  max-width: 480px;
  text-align: center;
}

@media (min-width: 900px) {
  canvas {
    width: 720px;
    height: 480px;
  }
}

@media (max-width: 899px) {
  canvas {
    width: 360px;
    height: 320px;
  }
}


.leaderboard {
  background: rgba(255,255,255,0.05);
  padding: 10px;
  border-radius: 10px;
  text-align: center;
  margin-top: 20px;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.leaderboard.top {
  margin-bottom: 20px;
}

.leaderboard h3 {
  margin: 0 0 10px 0;
  color: white;
}

.leaderboard p {
  margin: 0;
  color: #cfe8ff;
}
</style>