// Sincronizar las letras con la canción
var audio = document.querySelector("audio");
var lyrics = document.querySelector("#lyrics");

// Offset inicial en segundos
var offset = 50; // Cambia este número para ajustar el tiempo inicial

// Array de objetos que contiene cada línea y su tiempo de aparición en segundos
var lyricsData = [
  { text: "I'm lying on the moon", time: 9 },
  { text: "My dear, I'll be there soon", time: 19 },
  { text: "It's a quiet starry place", time: 28 },
  { text: "Time's we're swallowed up", time: 37 },
  { text: "In space, we're here a million miles away", time: 43 },
  { text: "There's things I wish I knew", time: 52 },
  { text: "There's no thing I'd keep from you", time: 60 },
  { text: "It's a dark and shiny place", time: 70 },
  { text: "But with you my dear", time: 79 },
  { text: "I'm safe and we're a million miles away", time: 84 },
  { text: "We're lying on the moon", time: 93 },
  { text: "It's a perfect afternoon", time: 103 },
  { text: "Your shadow follows me all day", time: 113 },
  { text: "Making sure that I'm", time: 123 },
  { text: "Okay and we're a million miles away", time: 129 },
];

// Animar las letras
function updateLyrics() {
  var time = Math.floor(audio.currentTime) + offset;
  var currentLine = lyricsData.find((line, index) => {
    var nextLineTime = index < lyricsData.length - 1 ? lyricsData[index + 1].time : Infinity;
    return time >= line.time && time < nextLineTime;
  });

  if (currentLine) {
    var fadeInDuration = 0.1; // Duración del efecto de aparición en segundos
    var opacity = Math.min(1, (time - currentLine.time) / fadeInDuration);

    lyrics.style.opacity = opacity;
    lyrics.innerHTML = currentLine.text;
  } else {
    lyrics.style.opacity = 0;
    lyrics.innerHTML = "";
  }
}

setInterval(updateLyrics, 100);

// Función para ocultar el título después de 216 segundos
function ocultarTitulo() {
  var titulo = document.querySelector(".titulo");
  titulo.style.animation = "fadeOut 3s ease-in-out forwards";
  setTimeout(function () {
    titulo.style.display = "none";
  }, 3000);
}

setTimeout(ocultarTitulo, 216000);

// Partículas interactivas
const canvas = document.getElementById('particlesCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const particles = [];
const colors = ['rgba(173, 216, 230, 0.8)', 'rgba(255, 182, 193, 0.8)', 'rgba(216, 191, 216, 0.8)'];

const mouse = { x: null, y: null };

window.addEventListener('mousemove', (event) => {
  mouse.x = event.x;
  mouse.y = event.y;
});

class Particle {
  constructor(x, y, size, color) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.color = color;
    this.velocityX = (Math.random() - 0.5) * 2;
    this.velocityY = (Math.random() - 0.5) * 2;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();
  }

  update() {
    if (this.x + this.size > canvas.width || this.x - this.size < 0) {
      this.velocityX = -this.velocityX;
    }
    if (this.y + this.size > canvas.height || this.y - this.size < 0) {
      this.velocityY = -this.velocityY;
    }
    this.x += this.velocityX;
    this.y += this.velocityY;

    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 100) {
      this.x -= dx / 10;
      this.y -= dy / 10;
    }

    this.draw();
  }
}

function initParticles() {
  for (let i = 0; i < 100; i++) {
    const size = Math.random() * 5 + 2;
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push(new Particle(x, y, size, color));
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach((particle) => particle.update());
  requestAnimationFrame(animateParticles);
}

initParticles();
animateParticles();

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  particles.length = 0;
  initParticles();
});
