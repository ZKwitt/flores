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
  // Añade el offset al tiempo actual
  var time = Math.floor(audio.currentTime) + offset;
  var currentLine = lyricsData.find((line, index) => {
    var nextLineTime = index < lyricsData.length - 1 ? lyricsData[index + 1].time : Infinity;
    return time >= line.time && time < nextLineTime;
  });

  if (currentLine) {
    // Calcula la opacidad basada en el tiempo en la línea actual
    var fadeInDuration = 0.1; // Duración del efecto de aparición en segundos
    var opacity = Math.min(1, (time - currentLine.time) / fadeInDuration);

    // Aplica el efecto de aparición
    lyrics.style.opacity = opacity;
    lyrics.innerHTML = currentLine.text;
  } else {
    // Restablece la opacidad y el contenido si no hay una línea actual
    lyrics.style.opacity = 0;
    lyrics.innerHTML = "";
  }
}

setInterval(updateLyrics, 1000);

// Función para ocultar el título después de 216 segundos
function ocultarTitulo() {
  var titulo = document.querySelector(".titulo");
  titulo.style.animation =
    "fadeOut 3s ease-in-out forwards"; /* Duración y función de temporización de la desaparición */
  setTimeout(function () {
    titulo.style.display = "none";
  }, 3000); // Espera 3 segundos antes de ocultar completamente
}

// Llama a la función después de 216 segundos (216,000 milisegundos)
setTimeout(ocultarTitulo, 216000);
