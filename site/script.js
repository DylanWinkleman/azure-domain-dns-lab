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

  if (year) {
    year.textContent = String(new Date().getFullYear());
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
        header.dataset.hidden = "false";
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
    var lastHeaderScrollY = Math.max(0, window.scrollY);
    var headerTravel = 0;
    var headerDirection = 0;
    var headerFrameRequested = false;

    function updateHeader() {
      var currentScrollY = Math.max(0, window.scrollY);
      var scrollDelta = currentScrollY - lastHeaderScrollY;
      var direction = scrollDelta > 0.5 ? 1 : scrollDelta < -0.5 ? -1 : 0;
      var menuOpen = menu && menu.dataset.open === "true";

      header.dataset.scrolled = currentScrollY > 12 ? "true" : "false";

      if (direction && direction !== headerDirection) {
        headerTravel = 0;
        headerDirection = direction;
      }
      headerTravel += Math.abs(scrollDelta);

      if (currentScrollY <= 80 || menuOpen || header.matches(":focus-within") || direction < 0) {
        header.dataset.hidden = "false";
      } else if (direction > 0 && headerTravel >= 12) {
        header.dataset.hidden = "true";
      }

      lastHeaderScrollY = currentScrollY;
      headerFrameRequested = false;
    }

    function requestHeaderUpdate() {
      if (headerFrameRequested) {
        return;
      }
      headerFrameRequested = true;
      window.requestAnimationFrame(updateHeader);
    }

    updateHeader();
    header.addEventListener("focusin", function () {
      header.dataset.hidden = "false";
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
