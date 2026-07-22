(function () {
  var sceneRoot = document.querySelector("[data-infra-scene]");
  if (!sceneRoot) {
    return;
  }

  var started = false;
  sceneRoot.dataset.sceneLoading = "waiting";

  function startScene() {
    if (started) {
      return;
    }
    started = true;
    sceneRoot.dataset.sceneLoading = "loading";
    import("./scene.bundle.min.js?v=20260721-adaptive-scene3").catch(function (error) {
      sceneRoot.dataset.sceneError = "true";
      console.error("Project journey scene failed to load", error);
    });
  }

  function startAfterFirstPaint() {
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        if ("requestIdleCallback" in window) {
          window.requestIdleCallback(startScene, { timeout: 650 });
          return;
        }
        window.setTimeout(startScene, 80);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startAfterFirstPaint, { once: true });
  } else {
    startAfterFirstPaint();
  }
}());
