//! ==============================================
//! PPT EMBUTIDO
//! ==============================================

function initPPT() {
  const pptBox = document.getElementById("initialppt-box");
  const pptClose = document.getElementById("pptinitial-close");
  const pptFullscreen = document.getElementById("pptinitial-fullscreen");
  const pptBg = document.querySelector(".ppt-play");
  const iframe = pptBox?.querySelector("iframe") || null;

  pptBg?.addEventListener("click", () => pptBox.classList.remove("hidden"));
  pptClose?.addEventListener("click", () => pptBox.classList.add("hidden"));
  pptFullscreen?.addEventListener("click", () => {
    if (iframe.requestFullscreen) iframe.requestFullscreen();
    else if (iframe.mozRequestFullScreen) iframe.mozRequestFullScreen();
    else if (iframe.webkitRequestFullscreen) iframe.webkitRequestFullscreen();
    else if (iframe.msRequestFullscreen) iframe.msRequestFullscreen();
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initPPT);

// Função auxiliar para mostrar abas de objetivos
function showObjetivosSelect() {
  // Função chamada quando navega para step 2
}

// Função auxiliar para mostrar forms de objetivos
function showObjetivosForm() {
  // Função chamada quando navega para step 3
}
