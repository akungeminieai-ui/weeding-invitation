/**
 * INTERACTIVE INFINITE CANVAS BOARD (PAN, 2-FINGER PINCH ZOOM, DRAGGABLE PHOTOS & VIDEOS)
 * Yusron & Zizi Wedding Gallery
 */

document.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.getElementById('canvas-wrapper');
  const stage = document.getElementById('canvas-stage');
  if (!wrapper || !stage) return;

  // Zoom & Pan state
  let scale = 1.0;
  const minScale = 0.35;
  const maxScale = 3.0;
  let translateX = 0;
  let translateY = 0;

  let isPanning = false;
  let startX = 0;
  let startY = 0;
  let initialTx = 0;
  let initialTy = 0;

  // Cards State
  let highestZ = 100;
  let activeCard = null;
  let cardOffsetX = 0;
  let cardOffsetY = 0;

  // UI Control Elements
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnZoomReset = document.getElementById('btn-zoom-reset');
  const zoomDisplay = document.getElementById('zoom-display');

  function updateStageTransform() {
    stage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    if (zoomDisplay) {
      zoomDisplay.textContent = `${Math.round(scale * 100)}%`;
    }
  }

  // Set initial canvas view focused on Moments & Tasyakkuran & Tiny moments (matching reference)
  function setInitialCanvasView() {
    const isMobile = window.innerWidth <= 768;
    // The center coordinate of Card 2 (Tasyakkuran) and Card 5 (Tiny moments)
    const focusX = 2015;
    const focusY = 1860;
    const stageCenterX = 1800;
    const stageCenterY = 1800;

    if (isMobile) {
      // Responsive scale for mobile devices (~0.70) to show center column with peek of left & right cards
      const viewportW = window.innerWidth || 390;
      scale = Math.min(0.74, Math.max(0.62, viewportW / 550));
    } else {
      scale = 0.88;
    }

    translateX = (stageCenterX - focusX) * scale;
    translateY = (stageCenterY - focusY) * scale;

    updateStageTransform();
  }

  // Initialize canvas view on load
  setInitialCanvasView();

  // -------------------------------------------------------------
  // 1. CANVAS PANNING (1-FINGER TOUCH / MOUSE DRAG BACKGROUND)
  // -------------------------------------------------------------
  wrapper.addEventListener('pointerdown', (e) => {
    // If clicking on a card or button, ignore background pan
    if (e.target.closest('.canvas-card') || e.target.closest('.canvas-controls-bar') || e.target.closest('.site-navbar')) {
      return;
    }

    isPanning = true;
    startX = e.clientX;
    startY = e.clientY;
    initialTx = translateX;
    initialTy = translateY;
    wrapper.style.cursor = 'grabbing';
  });

  window.addEventListener('pointermove', (e) => {
    // Canvas panning
    if (isPanning) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      translateX = initialTx + dx;
      translateY = initialTy + dy;
      updateStageTransform();
      return;
    }

    // Card dragging
    if (activeCard) {
      const stageRect = stage.getBoundingClientRect();
      const currentStageX = (e.clientX - stageRect.left) / scale;
      const currentStageY = (e.clientY - stageRect.top) / scale;

      const newLeft = currentStageX - cardOffsetX;
      const newTop = currentStageY - cardOffsetY;

      activeCard.style.left = `${newLeft}px`;
      activeCard.style.top = `${newTop}px`;
    }
  });

  window.addEventListener('pointerup', () => {
    if (isPanning) {
      isPanning = false;
      wrapper.style.cursor = 'grab';
    }

    if (activeCard) {
      activeCard.classList.remove('dragging');
      activeCard = null;
    }
  });

  // -------------------------------------------------------------
  // 2. TWO-FINGER PINCH TO ZOOM FOR MOBILE & TOUCH DEVICES
  // -------------------------------------------------------------
  let touchStartDist = 0;
  let initialPinchScale = 1.0;
  let pinchMidX = 0;
  let pinchMidY = 0;

  function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  function getTouchCenter(touches, containerRect) {
    const cx = (touches[0].clientX + touches[1].clientX) / 2;
    const cy = (touches[0].clientY + touches[1].clientY) / 2;
    return {
      x: cx - containerRect.left - containerRect.width / 2,
      y: cy - containerRect.top - containerRect.height / 2
    };
  }

  wrapper.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      isPanning = false;
      if (activeCard) {
        activeCard.classList.remove('dragging');
        activeCard = null;
      }
      touchStartDist = getTouchDistance(e.touches);
      initialPinchScale = scale;

      const rect = wrapper.getBoundingClientRect();
      const mid = getTouchCenter(e.touches, rect);
      pinchMidX = mid.x;
      pinchMidY = mid.y;
    }
  }, { passive: false });

  wrapper.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && touchStartDist > 0) {
      e.preventDefault();
      const currentDist = getTouchDistance(e.touches);
      const ratio = currentDist / touchStartDist;
      const newScale = Math.min(Math.max(initialPinchScale * ratio, minScale), maxScale);

      if (newScale !== scale) {
        const factor = newScale / scale;
        translateX -= (pinchMidX - translateX) * (factor - 1);
        translateY -= (pinchMidY - translateY) * (factor - 1);
        scale = newScale;
        updateStageTransform();
      }
    }
  }, { passive: false });

  wrapper.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
      touchStartDist = 0;
    }
  });

  // -------------------------------------------------------------
  // 3. MOUSE WHEEL & TRACKPAD ZOOMING
  // -------------------------------------------------------------
  wrapper.addEventListener('wheel', (e) => {
    e.preventDefault();

    let zoomFactor;
    if (e.ctrlKey) {
      // Trackpad pinch-zoom gesture (Chrome/Safari)
      zoomFactor = Math.pow(1.01, -e.deltaY);
    } else {
      // Standard mouse wheel
      zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    }

    const newScale = Math.min(Math.max(scale * zoomFactor, minScale), maxScale);
    if (newScale === scale) return;

    const rect = wrapper.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;

    const factor = newScale / scale;
    translateX -= (mouseX - translateX) * (factor - 1);
    translateY -= (mouseY - translateY) * (factor - 1);
    scale = newScale;

    updateStageTransform();
  }, { passive: false });

  // Zoom Control Buttons (+ / - / Reset)
  btnZoomIn?.addEventListener('click', () => {
    scale = Math.min(scale * 1.25, maxScale);
    updateStageTransform();
  });

  btnZoomOut?.addEventListener('click', () => {
    scale = Math.max(scale / 1.25, minScale);
    updateStageTransform();
  });

  btnZoomReset?.addEventListener('click', () => {
    setInitialCanvasView();
  });

  // Double tap to toggle zoom level on canvas
  let lastTapTime = 0;
  wrapper.addEventListener('touchend', (e) => {
    if (e.touches.length === 0 && !e.target.closest('.canvas-card')) {
      const now = Date.now();
      if (now - lastTapTime < 300) {
        // Double tap detected
        scale = scale > 1.2 ? 1.0 : 1.5;
        updateStageTransform();
      }
      lastTapTime = now;
    }
  });

  // -------------------------------------------------------------
  // 4. DRAGGABLE CARDS LOGIC
  // -------------------------------------------------------------
  const cards = document.querySelectorAll('.canvas-card');

  cards.forEach((card) => {
    card.addEventListener('pointerdown', (e) => {
      // Don't intercept video controls or video buttons
      if (e.target.tagName === 'VIDEO' || e.target.tagName === 'BUTTON' || e.target.closest('button')) {
        highestZ += 1;
        card.style.zIndex = highestZ;
        return;
      }

      e.stopPropagation();
      activeCard = card;
      card.classList.add('dragging');

      highestZ += 1;
      card.style.zIndex = highestZ;

      const cardRect = card.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();

      const cardStageX = (cardRect.left - stageRect.left) / scale;
      const cardStageY = (cardRect.top - stageRect.top) / scale;

      const cursorStageX = (e.clientX - stageRect.left) / scale;
      const cursorStageY = (e.clientY - stageRect.top) / scale;

      cardOffsetX = cursorStageX - cardStageX;
      cardOffsetY = cursorStageY - cardStageY;
    });
  });
});
