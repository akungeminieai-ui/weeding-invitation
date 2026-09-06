/**
 * MAIN INTERACTION LOGIC - YUSRON & ZIA WEDDING INVITATION
 * Fully restructured: all declarations before any calls.
 */

// Disable automatic browser scroll restoration so refresh/entry always starts at top
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================================
  // ELEMENT REFERENCES
  // ==========================================================================
  const coverScreen    = document.getElementById('cover-screen');
  const bgAudio        = document.getElementById('bg-audio');
  const chatBubble     = document.getElementById('single-chat-bubble');
  const chatTypingText = document.getElementById('chat-typing-text');

  // If cover screen exists (home page), clear any URL hash and force scroll to top
  if (coverScreen) {
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    window.scrollTo(0, 0);
  }

  // ==========================================================================
  // STATE
  // ==========================================================================
  let isPlayingAudio = false;
  let isInvitationOpened = false;

  // Target Event Date: 10 September 2026 17:00:00 CLT (Cairo Local Time / UTC+3)
  const eventTargetDate = new Date('2026-09-10T17:00:00+03:00').getTime();

  // Session storage keys
  const STORAGE_TIME_KEY = 'wedding_audio_current_time';
  const STORAGE_PLAY_KEY = 'wedding_audio_is_playing';
  const STORAGE_NAV_KEY  = 'wedding_is_internal_nav';

  // ==========================================================================
  // UTILITY FUNCTIONS
  // ==========================================================================

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function typeText(text, speed) {
    return new Promise(resolve => {
      if (!chatTypingText || isInvitationOpened) { resolve(); return; }
      let i = 0;
      chatTypingText.textContent = '';
      const timer = setInterval(() => {
        if (isInvitationOpened) {
          clearInterval(timer);
          resolve();
          return;
        }
        if (i < text.length) {
          chatTypingText.textContent += text.charAt(i);
          i++;
        } else {
          clearInterval(timer);
          resolve();
        }
      }, speed);
    });
  }

  function unTypeText(speed) {
    return new Promise(resolve => {
      if (!chatTypingText || isInvitationOpened) { resolve(); return; }
      const timer = setInterval(() => {
        if (isInvitationOpened) {
          clearInterval(timer);
          resolve();
          return;
        }
        const cur = chatTypingText.textContent;
        if (cur.length > 0) {
          chatTypingText.textContent = cur.substring(0, cur.length - 1);
        } else {
          clearInterval(timer);
          resolve();
        }
      }, speed);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ==========================================================================
  // AUDIO FUNCTIONS (AUTOMATIC PLAYBACK & CROSS-PAGE CONTINUITY)
  // ==========================================================================

  let gestureListenersAttached = false;

  function enablePlayOnFirstInteraction() {
    if (gestureListenersAttached) return; // Prevent duplicate listeners
    gestureListenersAttached = true;

    const gestureEvents = ['click', 'touchstart', 'pointerdown', 'keydown'];
    const abortController = new AbortController();

    const startAudioOnGesture = () => {
      abortController.abort(); // Remove all listeners immediately
      if (bgAudio) {
        bgAudio.muted = false;
        bgAudio.play().then(() => {
          isPlayingAudio = true;
          sessionStorage.setItem(STORAGE_PLAY_KEY, 'true');
        }).catch(() => {
          // Still can't play — user will need to tap again
          gestureListenersAttached = false;
          enablePlayOnFirstInteraction();
        });
      }
    };

    gestureEvents.forEach(evt => {
      window.addEventListener(evt, startAudioOnGesture, {
        capture: true,
        passive: true,
        signal: abortController.signal
      });
    });
  }

  function playAudio() {
    if (!bgAudio) return;
    const savedTime = sessionStorage.getItem(STORAGE_TIME_KEY);
    if (savedTime !== null && (bgAudio.currentTime === 0 || isNaN(bgAudio.currentTime))) {
      const parsedTime = parseFloat(savedTime);
      if (!isNaN(parsedTime)) {
        try { bgAudio.currentTime = parsedTime; } catch (e) {}
      }
    }

    bgAudio.muted = false;
    const playPromise = bgAudio.play();

    if (playPromise !== undefined) {
      playPromise.then(() => {
        isPlayingAudio = true;
        sessionStorage.setItem(STORAGE_PLAY_KEY, 'true');
      }).catch(() => {
        // Autoplay blocked — set up one-time gesture unlock
        enablePlayOnFirstInteraction();
      });
    }
  }

  function saveAudioState() {
    if (!bgAudio || isNaN(bgAudio.currentTime)) return;
    sessionStorage.setItem(STORAGE_TIME_KEY, bgAudio.currentTime.toString());
    sessionStorage.setItem(STORAGE_PLAY_KEY, 'true');
  }

  function restoreAudioState() {
    if (!bgAudio) return;
    const savedTime = sessionStorage.getItem(STORAGE_TIME_KEY);
    if (savedTime !== null) {
      const parsedTime = parseFloat(savedTime);
      if (!isNaN(parsedTime)) {
        try { bgAudio.currentTime = parsedTime; } catch (e) {}
      }
    } else {
      try { bgAudio.currentTime = 0; } catch (e) {}
    }
    playAudio();
  }

  if (bgAudio) {
    bgAudio.addEventListener('timeupdate', () => {
      if (!bgAudio.paused && bgAudio.currentTime > 0) {
        sessionStorage.setItem(STORAGE_TIME_KEY, bgAudio.currentTime.toString());
      }
    });
  }

  // Handle embedded gallery videos: ensure unmuted sound & pause bg audio during playback
  document.querySelectorAll('video').forEach(vid => {
    // Explicitly unmute video
    vid.muted = false;

    vid.addEventListener('play', () => {
      vid.muted = false;
      if (bgAudio && !bgAudio.paused) {
        bgAudio.pause();
      }
    });

    vid.addEventListener('pause', () => {
      if (bgAudio && bgAudio.paused) {
        playAudio();
      }
    });

    vid.addEventListener('ended', () => {
      if (bgAudio && bgAudio.paused) {
        playAudio();
      }
    });
  });

  // ==========================================================================
  // SCROLL REVEAL
  // ==========================================================================

  function activateAllReveals() {
    document.querySelectorAll('.reveal').forEach(el => {
      el.classList.add('active');
    });
  }

  function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.01, rootMargin: '0px 0px 100px 0px' });
    reveals.forEach(el => observer.observe(el));
  }

  // ==========================================================================
  // WELCOME SCREEN / COVER LOGIC
  // ==========================================================================

  function openInvitation() {
    if (!coverScreen || isInvitationOpened) return;
    isInvitationOpened = true;

    // Scroll to top exactly once when invitation opens
    window.scrollTo(0, 0);
    coverScreen.classList.add('opened');
    setTimeout(() => { coverScreen.style.display = 'none'; }, 900);
    document.body.classList.remove('lock-scroll');
    activateAllReveals();
    initScrollReveal();
    playAudio();
  }

  async function runWelcomeAnimationSequence() {
    if (!chatBubble || !chatTypingText) {
      // No chat elements - just open immediately
      openInvitation();
      return;
    }

    await sleep(600);
    if (isInvitationOpened) return;

    // BUBBLE 1: "Wedding"
    chatBubble.classList.add('visible');
    await typeText('Wedding', 160);
    if (isInvitationOpened) return;
    await sleep(500);
    if (isInvitationOpened) return;
    await unTypeText(75);
    if (isInvitationOpened) return;
    chatBubble.classList.remove('visible');

    await sleep(80);
    if (isInvitationOpened) return;

    // BUBBLE 2: "Invitation"
    chatBubble.classList.add('visible');
    await typeText('Invitation', 85);
    if (isInvitationOpened) return;
    await sleep(500);
    if (isInvitationOpened) return;
    await unTypeText(65);
    if (isInvitationOpened) return;
    chatBubble.classList.remove('visible');

    await sleep(350);
    if (isInvitationOpened) return;

    // Auto-open invitation
    openInvitation();
  }

  // ==========================================================================
  // PAGE LOAD BOOT SEQUENCE
  // ==========================================================================

  // Check if this load is a page refresh
  let isPageReload = false;
  try {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries && navEntries.length > 0) {
      isPageReload = (navEntries[0].type === 'reload');
    }
  } catch (e) { /* ignore */ }

  // Check if user navigated here via an internal link (not refresh)
  const isInternalNav = (sessionStorage.getItem(STORAGE_NAV_KEY) === 'true') && !isPageReload;
  sessionStorage.removeItem(STORAGE_NAV_KEY);

  // RULE 3: Refresh or fresh entry -> start song from 0. Page navigation -> keep playing.
  if (!isInternalNav) {
    sessionStorage.removeItem(STORAGE_TIME_KEY);
  }

  // Track future internal navigation clicks across links
  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (href && (href.includes('gallery.html') || href.includes('index.html') || href.startsWith('#'))) {
      link.addEventListener('click', () => {
        sessionStorage.setItem(STORAGE_NAV_KEY, 'true');
        saveAudioState();
      });
    }
  });

  // Persist audio state continuously
  window.addEventListener('beforeunload', saveAudioState);
  window.addEventListener('pagehide', saveAudioState);

  // MAIN BOOT LOGIC
  if (coverScreen) {
    if (isInternalNav) {
      // Internal navigation — skip welcome screen
      isInvitationOpened = true;
      coverScreen.classList.add('opened');
      coverScreen.style.display = 'none';
      document.body.classList.remove('lock-scroll');
      activateAllReveals();
      initScrollReveal();
      restoreAudioState();
    } else {
      // First visit OR refresh — show welcome screen & ensure top position
      window.scrollTo(0, 0);
      coverScreen.classList.remove('opened');
      coverScreen.style.display = 'flex';
      document.body.classList.add('lock-scroll');
      restoreAudioState();
      runWelcomeAnimationSequence();
    }
  } else {
    // Gallery page — no cover screen
    document.body.classList.remove('lock-scroll');
    activateAllReveals();
    initScrollReveal();
    restoreAudioState();
  }

  // Click anywhere on cover screen to open invitation & trigger audio play
  coverScreen?.addEventListener('click', () => {
    openInvitation();
  });

  const coverClickHint = document.getElementById('cover-click-hint');
  if (coverClickHint) {
    coverClickHint.addEventListener('click', (e) => {
      e.stopPropagation();
      openInvitation();
    });
    coverClickHint.addEventListener('touchend', (e) => {
      e.stopPropagation();
      openInvitation();
    });
  }

  // Eagerly set up gesture unlock so music starts on first user interaction
  enablePlayOnFirstInteraction();



  // ==========================================================================
  // COUNTDOWN TIMER
  // ==========================================================================

  function updateCountdown() {
    const now      = new Date().getTime();
    const distance = eventTargetDate - now;
    const liveEl   = document.getElementById('live-countdown-timer');

    if (distance < 0) {
      if (liveEl) liveEl.innerText = '00D : 00:00:00';
      return;
    }

    const days    = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours   = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    const dStr = String(days).padStart(2, '0');
    const hStr = String(hours).padStart(2, '0');
    const mStr = String(minutes).padStart(2, '0');
    const sStr = String(seconds).padStart(2, '0');

    if (liveEl) liveEl.innerText = `${dStr}D : ${hStr}:${mStr}:${sStr}`;
  }

  setInterval(updateCountdown, 1000);
  updateCountdown();

  // ==========================================================================
  // LIGHTBOX GALLERY
  // ==========================================================================

  const lightboxModal = document.getElementById('lightbox-modal');
  const lightboxImg   = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');

  document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      if (img && lightboxImg && lightboxModal) {
        lightboxImg.src = img.src;
        lightboxModal.classList.add('active');
      }
    });
  });

  lightboxClose?.addEventListener('click', () => {
    lightboxModal?.classList.remove('active');
  });

  lightboxModal?.addEventListener('click', e => {
    if (e.target === lightboxModal) lightboxModal.classList.remove('active');
  });

  // ==========================================================================
  // WISHES & RSVP
  // ==========================================================================

  const wishForm   = document.getElementById('wish-form');
  const wishesFeed = document.getElementById('wishes-feed');

  // ---- Dummy seed wishes (always shown until real data arrives) ----
  const DUMMY_WISHES = [
    {
      id: 'dummy-1',
      name: 'Budi & Keluarga',
      message: 'Selamat menempuh hidup baru untuk Yusron & Zia! Semoga menjadi keluarga yang sakinah, mawaddah, warahmah. Bahagia selalu sampai kakek nenek! 🤍✨',
      status: 'Hadir',
      timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    {
      id: 'dummy-2',
      name: 'Siti Rahma',
      message: 'Happy Wedding Yusron & Zia! Ikut terharu dan bahagia banget melihat perjalanan kalian. Lancar-lancar acaranya yaa! 🎉',
      status: 'Hadir',
      timestamp: new Date(Date.now() - 3600000 * 7).toISOString()
    }
  ];

  const WA_PHOTO_LEFT  = encodeURI('assets/ChatGPT Image Sep 6, 2026, 03_31_24 PM.png');
  const WA_PHOTO_RIGHT = encodeURI('assets/ChatGPT Image Sep 3, 2026, 12_09_47 PM.png');

  function formatWaTime(isoString) {
    if (!isoString) return '12.15 AM';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '12.15 AM';
    const hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}.${minutes} ${ampm}`;
  }

  function renderWishes(wishes) {
    if (!wishesFeed) return;
    if (!wishes || !Array.isArray(wishes) || wishes.length === 0) {
      wishes = DUMMY_WISHES;
    }

    wishesFeed.innerHTML = wishes.map((w, index) => {
      const isRight = index % 2 === 1;
      const rowClass    = isRight ? 'wa-row-right'    : 'wa-row-left';
      const bubbleClass = isRight ? 'wa-bubble-right' : 'wa-bubble-left';
      const avatarSrc   = isRight ? WA_PHOTO_RIGHT    : WA_PHOTO_LEFT;
      const avatarAlt   = isRight ? 'Zia'             : 'Yusron';
      const avatarStyle = isRight ? 'object-position: center 20%;' : 'object-position: center;';

      let badgeClass = 'wa-badge-hadir', statusText = 'Hadir';
      if (w.status === 'Ragu-ragu')    { badgeClass = 'wa-badge-ragu';   statusText = 'Ragu-ragu'; }
      if (w.status === 'Tidak Hadir') { badgeClass = 'wa-badge-absent'; statusText = 'Tidak Hadir'; }

      const timeStr = formatWaTime(w.timestamp);

      return `
        <div class="wa-chat-row ${rowClass}">
          <div class="wa-avatar">
            <img src="${avatarSrc}" alt="${avatarAlt}" class="wa-avatar-img" style="${avatarStyle}" loading="lazy">
          </div>
          <div class="wa-bubble ${bubbleClass}">
            <div class="wa-bubble-header">
              <span class="wa-sender-name">${escapeHtml(w.name)}</span>
              <span class="wa-badge ${badgeClass}">${statusText}</span>
            </div>
            <div class="wa-message">${escapeHtml(w.message)}</div>
            <div class="wa-meta">
              <span class="wa-time">${timeStr}</span>
              ${isRight ? '<span class="wa-checkmarks" title="Terkirim">✓✓</span>' : ''}
            </div>
          </div>
        </div>`;
    }).join('');
  }

  // Immediately render dummy wishes so feed is never empty
  renderWishes(DUMMY_WISHES);

  if (window.WishesService) {
    window.WishesService.init();
    window.WishesService.subscribe(wishes => {
      if (wishes && Array.isArray(wishes) && wishes.length > 0) {
        renderWishes(wishes);
      } else {
        renderWishes(DUMMY_WISHES);
      }
    });
  }

  // ==========================================================================
  // NAVBAR SCROLLSPY
  // ==========================================================================

  const navItems       = document.querySelectorAll('.nav-item');
  const trackedSections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    let currentId = '';
    const scrollPos = window.scrollY + 100;
    trackedSections.forEach(sec => {
      if (scrollPos >= sec.offsetTop && scrollPos < sec.offsetTop + sec.offsetHeight) {
        currentId = sec.id;
      }
    });
    if (currentId) {
      navItems.forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-target') === currentId);
      });
    }
  });

  // ==========================================================================
  // HAMBURGER MENU
  // ==========================================================================

  const hamburgerToggle = document.getElementById('hamburger-toggle');
  const navbarMenu      = document.getElementById('navbar-menu');

  hamburgerToggle?.addEventListener('click', e => {
    e.stopPropagation();
    hamburgerToggle.classList.toggle('active');
    navbarMenu?.classList.toggle('open');
  });

  document.addEventListener('click', e => {
    if (!hamburgerToggle?.contains(e.target) && !navbarMenu?.contains(e.target)) {
      hamburgerToggle?.classList.remove('active');
      navbarMenu?.classList.remove('open');
    }
  });

  // Smooth scroll for in-page anchor links
  document.querySelectorAll('.nav-link, .navbar-logo').forEach(link => {
    link.addEventListener('click', e => {
      hamburgerToggle?.classList.remove('active');
      navbarMenu?.classList.remove('open');
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          window.scrollTo({
            top: target.getBoundingClientRect().top + window.pageYOffset - 54,
            behavior: 'smooth'
          });
        }
      }
    });
  });

  // ==========================================================================
  // DRAGGABLE POLAROID CARDS
  // ==========================================================================

  const polaroidCards = document.querySelectorAll('.polaroid-card');
  let topZIndex = 100;

  polaroidCards.forEach(card => {
    let isDragging = false;
    let startX = 0, startY = 0, currentX = 0, currentY = 0;

    function onPointerDown(e) {
      if (e.type === 'mousedown' && e.button !== 0) return;
      isDragging = true;
      topZIndex++;
      card.style.zIndex = topZIndex;
      card.classList.add('is-dragging');
      const cx = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
      const cy = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
      startX = cx - currentX;
      startY = cy - currentY;
      document.addEventListener('mousemove', onPointerMove);
      document.addEventListener('mouseup', onPointerUp);
      document.addEventListener('touchmove', onPointerMove, { passive: false });
      document.addEventListener('touchend', onPointerUp);
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      if (e.cancelable && e.type.includes('touch')) e.preventDefault();
      const cx = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
      const cy = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
      currentX = cx - startX;
      currentY = cy - startY;
      const r = card.classList.contains('polaroid-left') ? -6 : 6;
      card.style.transform = `translate3d(${currentX}px,${currentY}px,0) rotate(${r}deg) scale(1.05)`;
    }

    function onPointerUp() {
      if (!isDragging) return;
      isDragging = false;
      card.classList.remove('is-dragging');
      const r = card.classList.contains('polaroid-left') ? -6 : 6;
      card.style.transform = `translate3d(${currentX}px,${currentY}px,0) rotate(${r}deg) scale(1)`;
      document.removeEventListener('mousemove', onPointerMove);
      document.removeEventListener('mouseup', onPointerUp);
      document.removeEventListener('touchmove', onPointerMove);
      document.removeEventListener('touchend', onPointerUp);
    }

    card.addEventListener('mousedown', onPointerDown);
    card.addEventListener('touchstart', onPointerDown, { passive: true });
  });

}); // END DOMContentLoaded
