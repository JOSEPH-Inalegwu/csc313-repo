document.addEventListener('DOMContentLoaded', () => {

    const materialsGrid = document.getElementById('materials-grid');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const paginationContainer = document.getElementById('pagination');
    const pageNumbersContainer = document.getElementById('page-numbers');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const progressFill = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    // The actual voice notes provided by the user
    const voiceNoteFiles = [
        "AUD-20260303-WA0035.opus", "AUD-20260303-WA0036.opus", "AUD-20260303-WA0037.opus", "AUD-20260303-WA0038.opus",
        "AUD-20260303-WA0039.opus", "AUD-20260303-WA0040.opus", "AUD-20260303-WA0041.opus", "AUD-20260303-WA0042.opus",
        "AUD-20260303-WA0043.opus", "AUD-20260303-WA0044.opus", "AUD-20260303-WA0045.opus", "AUD-20260303-WA0046.opus",
        "AUD-20260303-WA0047.opus", "AUD-20260303-WA0048.opus", "AUD-20260303-WA0054.opus", "AUD-20260303-WA0055.opus",
        "AUD-20260303-WA0056.opus", "AUD-20260303-WA0057.opus", "AUD-20260303-WA0058.opus", "AUD-20260303-WA0059.opus",
        "AUD-20260303-WA0060.opus", "AUD-20260303-WA0061.opus", "AUD-20260303-WA0062.opus", "AUD-20260303-WA0063.opus",
        "AUD-20260303-WA0064.opus", "AUD-20260303-WA0065.opus", "AUD-20260303-WA0066.opus", "AUD-20260303-WA0067.opus",
        "AUD-20260303-WA0068.opus", "AUD-20260303-WA0069.opus", "AUD-20260303-WA0070.opus", "AUD-20260303-WA0071.opus",
        "AUD-20260303-WA0072.opus"
    ];

    const videoNoteFiles = [
        { name: "A Star Search.mp4", title: "A* (A Star) Search" },
        { name: "AI Search Algorithm.mp4", title: "AI Search Algorithm" },
        { name: "Uniform Cost Search.mp4", title: "Uniform Cost Search Algorithm" }
    ];

    // Pagination state
    const totalVoiceNotes = voiceNoteFiles.length;
    let itemsPerPage = 6;
    let currentPage = 1;
    let currentFilter = 'all';

    // DOM element arrays
    let audioCards = [];
    let videoCards = [];
    const staticCards = Array.from(document.querySelectorAll('.static-item'));

    // ── Persistence ────────────────────────────────────────────────────────────
    const LISTENED_KEY = 'csc313_listened_indices';
    // Set of audio indices the user has fully listened to
    const listenedSet = new Set(JSON.parse(localStorage.getItem(LISTENED_KEY) || '[]'));

    function saveListenedState() {
        localStorage.setItem(LISTENED_KEY, JSON.stringify([...listenedSet]));
    }

    function updateProgressBar() {
        const pct = Math.min(Math.floor((listenedSet.size / totalVoiceNotes) * 100), 100);
        progressFill.style.width = `${pct}%`;
        progressText.textContent = `${pct}%`;
    }

    // Stamp a "Listened" tick badge on an audio card (idempotent)
    function addTickToCard(card) {
        if (card.querySelector('.listened-tick')) return;
        const tick = document.createElement('div');
        tick.className = 'listened-tick';
        tick.innerHTML = "<i class='bx bx-check-circle'></i> Listened";
        card.appendChild(tick);
    }

    // Re-apply ticks to any audio cards currently in the DOM
    function applyListenedTicks() {
        audioCards.forEach((card, idx) => {
            if (listenedSet.has(idx)) addTickToCard(card);
        });
    }
    // ──────────────────────────────────────────────────────────────────────────

    // 1. Generate Audio Cards dynamically
    voiceNoteFiles.forEach((filename, index) => {
        const num = (index + 1).toString().padStart(2, '0');
        const article = document.createElement('article');
        article.className = 'resource-card audio-item';
        article.setAttribute('data-category', 'audio');
        article.setAttribute('data-index', index);

        article.innerHTML = `
            <div class="resource-type-badge audio-badge">
                <i class='bx bx-headphone'></i> Audio Lecture
                <span class="audio-duration" style="margin-left: auto; font-weight: 600; font-size: 0.85rem; background: rgba(0,0,0,0.05); padding: 2px 8px; border-radius: 12px;">Duration: Loading...</span>
            </div>
            <div class="card-details">
                <h3>Lecture Segment ${num}</h3>

                <div class="audio-controls-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; font-size: 0.85rem; color: var(--text-secondary);">
                    <div style="display: flex; align-items: center; gap: 0.25rem;">
                        <i class='bx bx-volume-full'></i>
                        <label for="vol-${num}">Vol:</label>
                        <input type="range" id="vol-${num}" class="volume-slider" min="0" max="2" step="0.1" value="1" style="width: 60px;">
                        <span class="vol-display">100%</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.25rem;">
                        <i class='bx bx-fast-forward'></i>
                        <select class="playback-rate" style="padding: 2px; border-radius: 4px; border: 1px solid var(--border-color); background: #fff; font-size: 0.8rem;">
                            <option value="0.5">0.5x</option>
                            <option value="1" selected>1.0x (Normal)</option>
                            <option value="1.5">1.5x (Fast)</option>
                            <option value="2">2.0x (High)</option>
                        </select>
                    </div>
                </div>

                <div class="custom-audio-container">
                    <audio controls preload="metadata" class="lecture-audio">
                        <source src="materials/audio/${filename}" type="audio/ogg">
                        Your browser does not support the audio element.
                    </audio>
                </div>
            </div>
        `;

        const audioEl = article.querySelector('.lecture-audio');
        const durationEl = article.querySelector('.audio-duration');
        const speedSelect = article.querySelector('.playback-rate');
        const volumeSlider = article.querySelector('.volume-slider');
        const volumeDisplay = article.querySelector('.vol-display');

        let audioCtx, track, gainNode;

        // Init Web Audio API on first play (avoids autoplay restrictions)
        audioEl.addEventListener('play', () => {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                track = audioCtx.createMediaElementSource(audioEl);
                gainNode = audioCtx.createGain();
                track.connect(gainNode).connect(audioCtx.destination);
                gainNode.gain.value = volumeSlider.value;
            }
        }, { once: true });

        volumeSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            volumeDisplay.textContent = Math.round(val * 100) + '%';
            if (gainNode) {
                gainNode.gain.value = val;
            } else {
                audioEl.volume = Math.min(val, 1);
            }
            if (val > 1) {
                volumeDisplay.style.color = 'var(--doc-color)';
                volumeDisplay.style.fontWeight = 'bold';
            } else {
                volumeDisplay.style.color = 'inherit';
                volumeDisplay.style.fontWeight = 'normal';
            }
        });

        audioEl.addEventListener('loadedmetadata', () => {
            const min = Math.floor(audioEl.duration / 60);
            const sec = Math.floor(audioEl.duration % 60).toString().padStart(2, '0');
            durationEl.textContent = `Duration: ${min}:${sec}`;
        });

        speedSelect.addEventListener('change', (e) => {
            audioEl.playbackRate = parseFloat(e.target.value);
        });

        // ── Mark as listened when audio finishes ──────────────────────────────
        audioEl.addEventListener('ended', () => {
            if (!listenedSet.has(index)) {
                listenedSet.add(index);
                saveListenedState();
                updateProgressBar();
            }
            addTickToCard(article); // also safe if already ticked
        });
        // ──────────────────────────────────────────────────────────────────────

        audioCards.push(article);
    });

    // 2. Generate Video Cards dynamically
    videoNoteFiles.forEach((video) => {
        const article = document.createElement('article');
        article.className = 'resource-card video-item';
        article.setAttribute('data-category', 'video');

        article.innerHTML = `
            <div class="resource-image">
                <video src="materials/video/${video.name}#t=1" preload="metadata" muted playsinline></video>
                <div class="video-overlay">
                    <i class='bx bx-play-circle play-icon-overlay'></i>
                </div>
            </div>
            <div class="resource-type-badge video-badge">Video Module</div>
            <div class="card-details">
                <h3>${video.title}</h3>
                <p class="meta-info"><i class='bx bx-time-five'></i> MP4 Video • Educational Content</p>
                <a href="materials/video/${video.name}" class="btn-action" target="_blank">
                    <i class='bx bx-play-circle'></i> Watch Video
                </a>
            </div>
        `;
        videoCards.push(article);
    });

    // ── Render ─────────────────────────────────────────────────────────────────
    function renderContent() {
        materialsGrid.innerHTML = '';
        materialsGrid.classList.remove('focus-reading');

        // Strip any focused-note state so note cards reset when re-appended
        staticCards.forEach(card => {
            card.classList.remove('focused-note');
            const badge = card.querySelector('.reading-mode-badge');
            if (badge) badge.remove();
        });

        if (currentFilter === 'all') {
            paginationContainer.style.display = 'none';
            const notes = staticCards.filter(c => c.getAttribute('data-category') === 'note').slice(0, 3);
            const videos = videoCards.slice(0, 3);
            const audios = audioCards.slice(0, 3);
            const documents = staticCards.filter(c => c.getAttribute('data-category') === 'document').slice(0, 3);

            notes.forEach(card => materialsGrid.appendChild(card));
            videos.forEach(card => materialsGrid.appendChild(card));
            audios.forEach(card => materialsGrid.appendChild(card));
            documents.forEach(card => materialsGrid.appendChild(card));

        } else if (currentFilter === 'audio') {
            itemsPerPage = 6;
            paginationContainer.style.display = 'flex';
            renderAudioPage(currentPage);
            renderPagination(Math.ceil(totalVoiceNotes / itemsPerPage));

        } else if (currentFilter === 'note') {
            materialsGrid.classList.add('focus-reading');
            paginationContainer.style.display = 'flex';
            itemsPerPage = 1;
            renderStaticPage('note', currentPage);

            const totalNotes = staticCards.filter(c => c.getAttribute('data-category') === 'note').length;
            renderPagination(Math.ceil(totalNotes / itemsPerPage));

            const currentNote = materialsGrid.querySelector('.resource-card');
            if (currentNote) {
                currentNote.classList.add('focused-note');
                const badge = document.createElement('div');
                badge.className = 'reading-mode-badge';
                badge.innerHTML = '<i class="bx bx-book-reader"></i> FOCUSED READING';
                currentNote.appendChild(badge);
            }

        } else if (currentFilter === 'video') {
            paginationContainer.style.display = 'none';
            videoCards.forEach(card => materialsGrid.appendChild(card));

        } else {
            // Document / other filters
            itemsPerPage = 6;
            paginationContainer.style.display = 'none';
            staticCards.forEach(card => {
                if (card.getAttribute('data-category') === currentFilter) {
                    materialsGrid.appendChild(card);
                }
            });
        }

        // Animate newly added cards
        materialsGrid.querySelectorAll('.resource-card').forEach((card, i) => {
            card.style.animation = 'none';
            card.offsetHeight; // force reflow
            card.style.animation = `fadeIn 0.3s ease-out forwards ${i * 0.05}s`;
            card.style.opacity = '0';
        });

        // Restore green ticks on any audio cards now visible
        applyListenedTicks();
    }

    function renderStaticPage(category, page) {
        const items = staticCards.filter(c => c.getAttribute('data-category') === category);
        const start = (page - 1) * itemsPerPage;
        items.slice(start, start + itemsPerPage).forEach(card => materialsGrid.appendChild(card));
    }

    function renderAudioPage(page) {
        const start = (page - 1) * itemsPerPage;
        audioCards.slice(start, start + itemsPerPage).forEach(card => materialsGrid.appendChild(card));
    }

    function renderPagination(totalPages) {
        pageNumbersContainer.innerHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.className = `page-num ${i === currentPage ? 'active' : ''}`;
            btn.textContent = i;
            btn.addEventListener('click', () => { currentPage = i; renderContent(); });
            pageNumbersContainer.appendChild(btn);
        }
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
    }

    // Pagination listeners
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) { currentPage--; renderContent(); }
    });

    nextBtn.addEventListener('click', () => {
        let totalItems;
        if (currentFilter === 'audio' || currentFilter === 'all') {
            totalItems = totalVoiceNotes;
        } else if (currentFilter === 'video') {
            totalItems = videoCards.length;
        } else {
            totalItems = staticCards.filter(c => c.getAttribute('data-category') === currentFilter).length;
        }
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (currentPage < totalPages) { currentPage++; renderContent(); }
    });

    // Filter listeners
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            currentPage = 1;
            renderContent();
        });
    });

    // Pause other audios when one starts playing
    document.addEventListener('play', (e) => {
        if (e.target.tagName.toLowerCase() === 'audio') {
            document.querySelectorAll('audio').forEach(a => { if (a !== e.target) a.pause(); });
        }
    }, true);

    // ── Bootstrap ──────────────────────────────────────────────────────────────
    updateProgressBar(); // restore saved progress immediately
    renderContent();
});
