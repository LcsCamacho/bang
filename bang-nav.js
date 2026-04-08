// ═══ NAV ═══
function goTo(screenElementId) {
  document
    .querySelectorAll(".screen")
    .forEach((screenEl) => screenEl.classList.remove("is-active"));
  const targetScreen = document.getElementById(screenElementId);
  if (targetScreen) targetScreen.classList.add("is-active");
}
