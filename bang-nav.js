// ═══ NAV ═══
function goTo(screenElementId) {
  document
    .querySelectorAll(".screen")
    .forEach((screenEl) => screenEl.classList.remove("active"));
  const targetScreen = document.getElementById(screenElementId);
  if (targetScreen) targetScreen.classList.add("active");
}
