
<template>
  <div v-if="show" class="alert-overlay" @click="close">
    <div class="alert-card" @click.stop>
      <h2>¡Juego terminado!</h2>
      <p>Agua recogida: {{ score }}</p>
      <input v-model="playerName" placeholder="Tu nombre" />
      <input v-model="playerBarrio" placeholder="Tu barrio" />
      <button @click="submit">Guardar puntaje</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GameAlert',
  props: {
    show: Boolean,
    score: Number
  },
  data() {
    return {
      playerName: '',
      playerBarrio: ''
    };
  },
  methods: {
    submit() {
      if (this.playerName && this.playerBarrio) {
        this.$emit('submit', {
          name: this.playerName,
          barrio: this.playerBarrio,
          score: this.score
        });
        this.playerName = '';
        this.playerBarrio = '';
      }
    },
    close() {
      this.$emit('close');
    }
  }
};
</script>

<style scoped>
.alert-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.alert-card {
  background: rgba(255,255,255,0.1);
  padding: 20px;
  border-radius: 10px;
  text-align: center;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
}

.alert-card h2 {
  color: white;
  margin-top: 0;
}

.alert-card p {
  color: #cfe8ff;
}

.alert-card input {
  display: block;
  margin: 10px auto;
  padding: 8px;
  border-radius: 5px;
  border: none;
}

.alert-card button {
  background-color: aquamarine;
  color: #04233a;
  border: 0;
  padding: 8px 12px;
  border-radius: 8px;
  font-weight: 600;
  margin-top: 10px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  transition: transform 0.1s;
}

.alert-card button:hover {
  transform: translateY(-2px);
}
</style>