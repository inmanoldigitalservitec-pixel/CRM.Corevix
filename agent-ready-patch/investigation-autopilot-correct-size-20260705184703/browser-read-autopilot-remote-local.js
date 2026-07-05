// Pega esto en consola. Lee el layout local actual de agent.autopilot.
// No modifica nada.

(() => {
  const target = "agent.autopilot";

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    const raw = localStorage.getItem(key);

    if (!raw || !raw.includes(target)) continue;

    const parsed = JSON.parse(raw);
    const agent = parsed.find((item) => item?.widgetId === target);

    console.log("LOCAL STORAGE KEY:", key);
    console.log(JSON.stringify(agent, null, 2));
  }
})();
