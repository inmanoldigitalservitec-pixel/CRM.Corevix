// Pega esto en consola para ver si hay layout guardado en localStorage/sessionStorage.
// No modifica nada.

(() => {
  const hits = [];

  function scanStorage(storage, name) {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      const value = storage.getItem(key);
      if (
        key?.toLowerCase().includes("dashboard") ||
        key?.toLowerCase().includes("layout") ||
        value?.includes("agent.autopilot")
      ) {
        hits.push({
          storage: name,
          key,
          valuePreview: value?.slice(0, 1200),
        });
      }
    }
  }

  scanStorage(localStorage, "localStorage");
  scanStorage(sessionStorage, "sessionStorage");

  console.log("Storage hits:");
  console.table(hits);
  console.log(hits);
})();
