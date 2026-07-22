(function () {
  "use strict";

  var header = document.querySelector("[data-header]");
  var menu = document.querySelector("[data-menu]");
  var menuToggle = document.querySelector("[data-menu-toggle]");
  var year = document.querySelector("[data-year]");
  var projectFilters = Array.from(document.querySelectorAll("[data-project-filter]"));
  var projectRows = Array.from(document.querySelectorAll("[data-project-row]"));
  var projectCount = document.querySelector("[data-project-count]");
  var imageViewer = document.querySelector("[data-image-viewer]");
  var imageViewerOpen = document.querySelector("[data-image-viewer-open]");
  var imageViewerClose = document.querySelector("[data-image-viewer-close]");
  var imageViewerViewport = document.querySelector("[data-image-viewer-viewport]");
  var imageViewerImage = document.querySelector("[data-image-viewer-image]");
  var imageZoomIn = document.querySelector("[data-image-zoom-in]");
  var imageZoomOut = document.querySelector("[data-image-zoom-out]");
  var imageZoomReset = document.querySelector("[data-image-zoom-reset]");
  var imageZoomStatus = document.querySelector("[data-image-zoom-status]");
  var projectButton = document.querySelector(".button-projects");
  var projectLightRegion = projectButton ? projectButton.closest(".hero-copy") : null;

  function setDatasetValue(element, key, value) {
    if (element && element.dataset[key] !== value) {
      element.dataset[key] = value;
    }
  }

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  if (projectButton && projectLightRegion && typeof window.matchMedia === "function") {
    var finePointer = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 761px)");
    var projectLightFrame = 0;
    var projectPointerX = 0;
    var projectPointerY = 0;
    var projectButtonBounds = null;

    function paintProjectLight() {
      projectLightFrame = 0;

      if (!finePointer.matches) {
        projectButton.style.removeProperty("--project-light-x");
        projectButton.style.removeProperty("--project-light-y");
        projectButton.style.removeProperty("--project-light-strength");
        return;
      }

      var buttonBounds = projectButtonBounds || projectButton.getBoundingClientRect();
      projectButtonBounds = buttonBounds;
      var distanceX = Math.max(buttonBounds.left - projectPointerX, 0, projectPointerX - buttonBounds.right);
      var distanceY = Math.max(buttonBounds.top - projectPointerY, 0, projectPointerY - buttonBounds.bottom);
      var distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
      var strength = Math.max(0, Math.min(1, 1 - distance / 145));

      projectButton.style.setProperty("--project-light-x", (projectPointerX - buttonBounds.left).toFixed(1) + "px");
      projectButton.style.setProperty("--project-light-y", (projectPointerY - buttonBounds.top).toFixed(1) + "px");
      projectButton.style.setProperty("--project-light-strength", strength.toFixed(3));
    }

    function requestProjectLight(event) {
      if (!finePointer.matches || event.pointerType === "touch") {
        return;
      }

      projectPointerX = event.clientX;
      projectPointerY = event.clientY;
      if (!projectLightFrame) {
        projectLightFrame = window.requestAnimationFrame(paintProjectLight);
      }
    }

    function clearProjectLight() {
      if (projectLightFrame) {
        window.cancelAnimationFrame(projectLightFrame);
        projectLightFrame = 0;
      }
      if (finePointer.matches) {
        projectButton.style.setProperty("--project-light-strength", "0");
      }
      projectButtonBounds = null;
    }

    projectLightRegion.addEventListener("pointerenter", function () {
      projectButtonBounds = projectButton.getBoundingClientRect();
    }, { passive: true });
    projectLightRegion.addEventListener("pointermove", requestProjectLight, { passive: true });
    projectLightRegion.addEventListener("pointerleave", clearProjectLight, { passive: true });
    window.addEventListener("scroll", function () {
      projectButtonBounds = null;
    }, { passive: true });
    window.addEventListener("resize", function () {
      projectButtonBounds = null;
    });
    finePointer.addEventListener("change", clearProjectLight);
  }

  function closeMenu() {
    if (!menu || !menuToggle) {
      return;
    }

    menu.dataset.open = "false";
    menuToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  }

  if (menu && menuToggle) {
    menuToggle.addEventListener("click", function () {
      var isOpen = menu.dataset.open === "true";
      menu.dataset.open = isOpen ? "false" : "true";
      menuToggle.setAttribute("aria-expanded", isOpen ? "false" : "true");
      document.body.classList.toggle("menu-open", !isOpen);
      if (!isOpen && header) {
        setDatasetValue(header, "hidden", "false");
      }
    });

    menu.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenu();
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 760) {
        closeMenu();
      }
    });
  }

  if (header) {
    var lastHeaderScrollY = 0;
    var headerTravel = 0;
    var headerDirection = 0;
    var headerFrameRequested = false;
    var headerInitialized = false;

    function updateHeader() {
      var currentScrollY = Math.max(0, window.scrollY);
      var scrollDelta = headerInitialized ? currentScrollY - lastHeaderScrollY : 0;
      var direction = scrollDelta > 0.5 ? 1 : scrollDelta < -0.5 ? -1 : 0;
      var menuOpen = menu && menu.dataset.open === "true";

      setDatasetValue(header, "scrolled", currentScrollY > 12 ? "true" : "false");

      if (direction && direction !== headerDirection) {
        headerTravel = 0;
        headerDirection = direction;
      }
      headerTravel += Math.abs(scrollDelta);

      if (currentScrollY <= 80 || menuOpen || header.matches(":focus-within") || direction < 0) {
        setDatasetValue(header, "hidden", "false");
      } else if (direction > 0 && headerTravel >= 12) {
        setDatasetValue(header, "hidden", "true");
      }

      lastHeaderScrollY = currentScrollY;
      headerInitialized = true;
      headerFrameRequested = false;
    }

    function requestHeaderUpdate() {
      if (headerFrameRequested) {
        return;
      }
      headerFrameRequested = true;
      window.requestAnimationFrame(updateHeader);
    }

    requestHeaderUpdate();
    header.addEventListener("focusin", function () {
      setDatasetValue(header, "hidden", "false");
    });
    window.addEventListener("scroll", requestHeaderUpdate, { passive: true });
    window.addEventListener("pageshow", requestHeaderUpdate);
  }

  if (projectFilters.length && projectRows.length) {
    function setProjectFilter(filter) {
      var visibleCount = 0;

      projectRows.forEach(function (row) {
        var tags = (row.dataset.projectTags || "").split(" ");
        var visible = filter === "all" || tags.includes(filter);
        row.hidden = !visible;
        if (visible) {
          visibleCount += 1;
        }
      });

      projectFilters.forEach(function (button) {
        button.setAttribute("aria-pressed", button.dataset.projectFilter === filter ? "true" : "false");
      });

      if (projectCount) {
        projectCount.textContent = String(visibleCount);
      }
    }

    projectFilters.forEach(function (button) {
      button.addEventListener("click", function () {
        setProjectFilter(button.dataset.projectFilter);
      });
    });
  }

  if (
    imageViewer &&
    imageViewerOpen &&
    imageViewerClose &&
    imageViewerViewport &&
    imageViewerImage &&
    imageZoomIn &&
    imageZoomOut &&
    imageZoomReset &&
    imageZoomStatus
  ) {
    var imageZoom = 1;

    function loadImageViewerImage() {
      if (imageViewerImage.getAttribute("src")) {
        return;
      }

      var deferredSource = imageViewerImage.dataset.imageViewerSrc;
      if (!deferredSource) {
        return;
      }

      imageViewerViewport.setAttribute("aria-busy", "true");
      imageViewerImage.addEventListener("load", function () {
        imageViewerViewport.removeAttribute("aria-busy");
      }, { once: true });
      imageViewerImage.addEventListener("error", function () {
        imageViewerViewport.removeAttribute("aria-busy");
      }, { once: true });
      imageViewerImage.src = deferredSource;
    }

    function setImageZoom(nextZoom, preserveCenter) {
      var previousWidth = Math.max(imageViewerViewport.scrollWidth, 1);
      var previousHeight = Math.max(imageViewerViewport.scrollHeight, 1);
      var centerX = (imageViewerViewport.scrollLeft + imageViewerViewport.clientWidth / 2) / previousWidth;
      var centerY = (imageViewerViewport.scrollTop + imageViewerViewport.clientHeight / 2) / previousHeight;

      imageZoom = Math.min(4, Math.max(1, nextZoom));
      imageViewerImage.style.width = String(imageZoom * 100) + "%";
      imageZoomStatus.textContent = String(Math.round(imageZoom * 100)) + "%";
      imageZoomOut.disabled = imageZoom <= 1;
      imageZoomIn.disabled = imageZoom >= 4;

      window.requestAnimationFrame(function () {
        if (!preserveCenter || imageZoom === 1) {
          imageViewerViewport.scrollTo({ top: 0, left: 0 });
          return;
        }
        imageViewerViewport.scrollTo({
          left: centerX * imageViewerViewport.scrollWidth - imageViewerViewport.clientWidth / 2,
          top: centerY * imageViewerViewport.scrollHeight - imageViewerViewport.clientHeight / 2
        });
      });
    }

    function openImageViewer() {
      loadImageViewerImage();
      if (typeof imageViewer.showModal === "function") {
        if (!imageViewer.open) {
          imageViewer.showModal();
        }
      } else {
        imageViewer.setAttribute("open", "");
      }
      document.body.classList.add("image-viewer-open");
      setImageZoom(1, false);
      imageViewerClose.focus();
    }

    function closeImageViewer() {
      if (typeof imageViewer.close === "function" && imageViewer.open) {
        imageViewer.close();
      } else {
        imageViewer.removeAttribute("open");
        document.body.classList.remove("image-viewer-open");
        imageViewerOpen.focus();
      }
    }

    imageViewerOpen.addEventListener("click", openImageViewer);
    imageViewerClose.addEventListener("click", closeImageViewer);
    imageZoomIn.addEventListener("click", function () {
      setImageZoom(imageZoom + 0.25, true);
    });
    imageZoomOut.addEventListener("click", function () {
      setImageZoom(imageZoom - 0.25, true);
    });
    imageZoomReset.addEventListener("click", function () {
      setImageZoom(1, false);
    });

    imageViewerImage.addEventListener("dblclick", function () {
      setImageZoom(imageZoom > 1 ? 1 : 2, true);
    });

    imageViewerViewport.addEventListener("wheel", function (event) {
      if (!event.ctrlKey) {
        return;
      }
      event.preventDefault();
      setImageZoom(imageZoom + (event.deltaY < 0 ? 0.25 : -0.25), true);
    }, { passive: false });

    imageViewer.addEventListener("click", function (event) {
      if (event.target === imageViewer) {
        closeImageViewer();
      }
    });

    imageViewer.addEventListener("close", function () {
      document.body.classList.remove("image-viewer-open");
      imageViewerOpen.focus();
    });

    document.addEventListener("keydown", function (event) {
      if (!imageViewer.open) {
        return;
      }
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        setImageZoom(imageZoom + 0.25, true);
      } else if (event.key === "-") {
        event.preventDefault();
        setImageZoom(imageZoom - 0.25, true);
      } else if (event.key === "0") {
        event.preventDefault();
        setImageZoom(1, false);
      }
    });

    setImageZoom(1, false);
  }

  var revealTargets = Array.from(document.querySelectorAll(
    ".section-heading, .featured-project, .project-row, .now-layout > *, .toolkit-grid article, .story-layout > *, .contact-layout > *"
  ));

  if (revealTargets.length && "IntersectionObserver" in window) {
    document.documentElement.classList.add("reveal-ready");
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) {
          return;
        }
        entry.target.dataset.revealed = "true";
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12 });

    revealTargets.forEach(function (target, index) {
      target.dataset.reveal = "true";
      target.style.setProperty("--reveal-delay", String((index % 4) * 45) + "ms");
      revealObserver.observe(target);
    });
  }

  var sectionLinks = Array.from(document.querySelectorAll('.primary-nav a[href^="#"]'));
  var sectionMap = new Map();

  sectionLinks.forEach(function (link) {
    var section = document.querySelector(link.getAttribute("href"));
    if (section) {
      sectionMap.set(section, link);
    }
  });

  if (sectionMap.size && "IntersectionObserver" in window) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      var visibleEntry = entries.find(function (entry) {
        return entry.isIntersecting;
      });

      if (!visibleEntry) {
        return;
      }

      sectionLinks.forEach(function (link) {
        link.removeAttribute("aria-current");
      });
      sectionMap.get(visibleEntry.target).setAttribute("aria-current", "location");
    }, { rootMargin: "-22% 0px -66% 0px", threshold: 0 });

    sectionMap.forEach(function (link, section) {
      sectionObserver.observe(section);
    });
  }
})();
