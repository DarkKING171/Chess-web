self.onmessage = function(e) {
  const msg = e.data;
  if (msg === "uci") {
    self.postMessage("id name Stockfish 16");
    self.postMessage("uciok");
  } else if (msg === "isready") {
    self.postMessage("readyok");
  } else if (msg.startsWith("position")) {
    // Ignorar
  } else if (msg.startsWith("go")) {
    setTimeout(() => {
      self.postMessage("bestmove e2e4");
    }, 500);
  }
};