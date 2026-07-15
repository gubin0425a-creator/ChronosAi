    let socketUrl = '';
    if (window.location.protocol === 'file:') {
      socketUrl = 'http://127.0.0.1:3000';
    } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      if (window.location.port !== '3000') {
        socketUrl = 'http://127.0.0.1:3000';
      }
    } else if (window.location.protocol.startsWith('http') && window.location.port !== '3000') {
      socketUrl = window.location.protocol + '//' + window.location.hostname + ':3000';
    }
    const socket = socketUrl ? io(socketUrl) : io();

    // ----------------------------------------------------
    // GLOBAL STATE & SETUP
    // ----------------------------------------------------
    const PEXELS_API_KEY = 'LH59shPdj1xO0lolnHPsClH23qsnHE4NjkCFBhKEXvR0CbqwkrXbqBnw';
    let quranData = null;
    let lastGerakan = '';
    let totalTransitions = 0;
    let activePoseKey = 'Berdiri';
    let transitionTimeout = null;

    const poseMapping = {
      'Berdiri': { audio: 'audio/berdiri.mp3' },
      "Takbir/I'tidal": { audio: 'audio/takbir.mp3' },
      "Ruku'": { audio: 'audio/rukuk.mp3' },
      'Sujud': { audio: 'audio/sujud.mp3' },
      'Duduk/Tasyahud': { audio: 'audio/duduk_diantara_sujud.mp3' }
    };

    // ================= VARIABEL TASBIH =================
    let tasbihCount = 0;
    let tasbihTarget = 33;
    const tasbihProgressCircle = document.getElementById('tasbihProgress');
    const tasbihCountDisplay = document.getElementById('tasbihCount');
    const tasbihTargetLabel = document.getElementById('tasbihTargetLabel');
    const tasbihDzikirText = document.getElementById('tasbihDzikirText');
    const circumference = 2 * Math.PI * 100;

    const dzikirData = {
      pagi: [
        { arab: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ', latin: "Ashbahnaa wa ashbahal mulku lillaah", count: 1 },
        { arab: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ', latin: "Subhaanallaahi wabihamdih", count: 100 },
        { arab: 'لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ', latin: "Laa ilaaha illallaahu wahdahuu laa syariikalah", count: 10 }
      ],
      malam: [
        { arab: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ', latin: "Amsainaa wa amsal mulku lillaah", count: 1 },
        { arab: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ', latin: "Subhaanallaahi wabihamdih", count: 100 },
        { arab: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا', latin: "Allahumma bika amsainaa, wa bika ashbahnaa", count: 1 }
      ]
    };

    // ================= FUNGSI TASBIH =================
    function updateTasbihUI() {
      tasbihCountDisplay.innerText = tasbihCount;
      if (tasbihTarget > 0) {
        tasbihTargetLabel.innerText = `dari ${tasbihTarget}`;
        const progress = Math.min(tasbihCount / tasbihTarget, 1);
        tasbihProgressCircle.style.strokeDashoffset = circumference - (progress * circumference);
        if (tasbihCount >= tasbihTarget) {
          tasbihProgressCircle.style.stroke = 'var(--google-green)';
          tasbihCountDisplay.style.color = 'var(--google-green)';
        } else {
          tasbihProgressCircle.style.stroke = 'var(--md-sys-color-primary)';
          tasbihCountDisplay.style.color = 'var(--md-sys-color-primary)';
        }
      } else {
        tasbihTargetLabel.innerText = 'Tanpa Batas';
        tasbihProgressCircle.style.strokeDashoffset = circumference;
      }
    }

    document.getElementById('btnTapTasbih').addEventListener('click', function () {
      this.style.transform = 'scale(0.9)';
      setTimeout(() => this.style.transform = 'scale(1)', 100);
      tasbihCount++;
      if (navigator.vibrate) navigator.vibrate(30);
      if (tasbihTarget > 0 && tasbihCount === tasbihTarget) {
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      }
      updateTasbihUI();
    });

    document.getElementById('btnResetTasbih').addEventListener('click', function () {
      tasbihCount = 0;
      updateTasbihUI();
    });

    document.querySelectorAll('.target-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.target-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        tasbihTarget = parseInt(this.dataset.target);
        tasbihCount = 0;
        updateTasbihUI();
      });
    });

    document.getElementById('btnSaveTasbih').addEventListener('click', function () {
      if (tasbihCount === 0) return;
      const tbody = document.getElementById('tasbihHistoryBody');
      const emptyRow = document.getElementById('emptyTasbihHistoryRow');
      if (emptyRow) emptyRow.remove();
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${timeStr}</td><td>${tasbihDzikirText.innerText}</td><td>${tasbihCount}</td>`;
      tbody.prepend(tr);
      tasbihCount = 0;
      updateTasbihUI();
    });

    // ================= FUNGSI DZIKIR =================
    function renderDzikir(type) {
      const container = document.getElementById('dzikirListContainer');
      container.innerHTML = '';
      dzikirData[type].forEach(item => {
        const div = document.createElement('div');
        div.className = 'metric-card';
        div.style.cursor = 'pointer';
        div.innerHTML = `
          <div style="font-size:20px; text-align:right; margin-bottom:8px; direction:rtl; line-height:1.6;">${item.arab}</div>
          <div style="font-size:12px; color:var(--md-sys-color-outline); margin-bottom:4px;">${item.latin}</div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
            <span class="material-symbols-outlined" style="font-size:16px; color:var(--google-blue);">fingerprint</span>
            <span style="font-size:12px; font-weight:600; background:var(--md-sys-color-surface-variant); padding:4px 8px; border-radius:12px;">${item.count}x</span>
          </div>`;
        div.addEventListener('click', () => {
          tasbihDzikirText.innerText = item.arab;
          if (item.count !== 100) {
            tasbihTarget = item.count;
            document.querySelectorAll('.target-btn').forEach(b => b.classList.remove('active'));
          }
          tasbihCount = 0;
          updateTasbihUI();
        });
        container.appendChild(div);
      });
    }

    document.querySelectorAll('.dzikir-tab-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.dzikir-tab-btn').forEach(b => {
          b.classList.remove('active');
          b.className = 'btn btn-secondary dzikir-tab-btn';
        });
        this.className = 'btn btn-primary dzikir-tab-btn active';
        renderDzikir(this.dataset.dzikir);
      });
    });

    // ================= JAM REALTIME =================
    function updateClock() {
      const now = new Date();
      document.getElementById('liveClock').innerText = now.toLocaleTimeString('id-ID');
      document.getElementById('liveDate').innerText = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    setInterval(updateClock, 1000);
    updateClock();
    renderDzikir('pagi');
    updateTasbihUI();

    // ----------------------------------------------------
    // TABS SPA NAVIGATION LOGIC
    // ----------------------------------------------------
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetTabId = item.getAttribute('data-tab');
        navItems.forEach(nav => nav.classList.remove('active'));
        tabContents.forEach(tab => tab.classList.remove('active'));
        item.classList.add('active');
        document.getElementById(targetTabId).classList.add('active');

        // Lazy loads
        if (targetTabId === 'tab-quran' && !quranData) loadQuranData();
        if (targetTabId === 'tab-gallery' && galleryState.photos.length === 0) fetchMosquePhotos('mosque');
      });
    });

    // ----------------------------------------------------
    // DARK/LIGHT THEME LOGIC
    // ----------------------------------------------------
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');
    themeToggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-theme');
      const isDark = document.body.classList.contains('dark-theme');
      themeIcon.textContent = isDark ? 'light_mode' : 'dark_mode';
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
    if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.body.classList.add('dark-theme');
      themeIcon.textContent = 'light_mode';
    }

    // ----------------------------------------------------
    // REAL-TIME SENSOR DASHBOARD LOGIC (Optimized)
    // ----------------------------------------------------
    const statusBadge = document.getElementById('statusBadge');
    const statusText = document.getElementById('statusText');
    const poseText = document.getElementById('poseText');
    const pitchVal = document.getElementById('pitchVal');
    const counterText = document.getElementById('counterText');
    const stabilityText = document.getElementById('stabilityText');
    const voiceGuideToggle = document.getElementById('voiceGuideToggle');
    const historyTableBody = document.getElementById('historyTableBody');
    const emptyHistoryRow = document.getElementById('emptyHistoryRow');
    
    // Animasi Sholat
    const prayerAnim = document.getElementById('prayerAnim');
    const bacaanContainer = document.getElementById('bacaanContainer');
    const bacaanArab = document.getElementById('bacaanArab');
    const bacaanLatin = document.getElementById('bacaanLatin');
    const bacaanArti = document.getElementById('bacaanArti');

    // Statistik Elements
    const statRakaat = document.getElementById('statRakaat');
    const statSujud = document.getElementById('statSujud');
    const statWaktu = document.getElementById('statWaktu');

    let sessionTotalSujud = 0;
    let sessionTotalRakaat = 0;
    let sessionStartTime = null;
    let isSessionActive = false;
    let sessionTimer = null;

    // Initialize 3D Engine
    init3D();

    const readingMapping = {
      'Berdiri': {
        arab: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ... اَللَّهُ أَكْبَرُ',
        latin: 'Allahu Akbar / Bismillahir-rahmanir-rahim',
        arti: 'Allah Maha Besar / Dengan nama Allah Yang Maha Pengasih lagi Maha Penyayang'
      },
      "Takbir/I'tidal": {
        arab: 'سَمِعَ اللهُ لِمَنْ حَمِدَهُ',
        latin: "Sami'allaahu liman hamidah",
        arti: 'Allah Maha Mendengar pujian orang yang memuji-Nya'
      },
      "Ruku'": {
        arab: 'سُبْحَانَ رَبِّيَ الْعَظِيمِ وَبِحَمْدِهِ',
        latin: "Subhaana rabbiyal 'adziimi wa bihamdih",
        arti: 'Maha Suci Tuhanku Yang Maha Agung dan memujilah aku kepada-Nya'
      },
      'Sujud': {
        arab: 'سُبْحَانَ رَبِّيَ الأَعْلَى وَبِحَمْدِهِ',
        latin: "Subhaana rabbiyal a'laa wa bihamdih",
        arti: 'Maha Suci Tuhanku Yang Maha Tinggi dan memujilah aku kepada-Nya'
      },
      'Duduk/Tasyahud': {
        arab: 'رَبِّ اغْفِرْ لِي وَارْحَمْنِي وَاجْبُرْنِي وَارْفَعْنِي وَارْزُقْنِي وَاهْدِنِي وَعَافِنِي',
        latin: "Rabbighfirlii warhamnii wajburnii warfa'nii warzuqnii wahdinii wa'aafinii",
        arti: 'Ya Allah ampunilah aku, rahmatilah aku, cukupkanlah aku, angkatlah derajatku, berikanlah rezeki kepadaku, tunjukkanlah aku, dan sehatkanlah aku'
      }
    };

    const poseClassMapping = {
      'Berdiri': 'pose-berdiri',
      "Takbir/I'tidal": 'pose-berdiri', 
      "Ruku'": 'pose-ruku',
      'Sujud': 'pose-sujud',
      'Duduk/Tasyahud': 'pose-duduk'
    };

    function updateSessionTime() {
      if (!isSessionActive) return;
      const diff = Math.floor((Date.now() - sessionStartTime) / 1000);
      const m = Math.floor(diff / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      statWaktu.textContent = `${m}:${s}`;
    }

    socket.on('wokwi-status', (data) => {
      statusBadge.className = 'status-badge ' + data.status;
      if (data.status === 'connected') statusText.textContent = 'Active';
      else if (data.status === 'connecting') statusText.textContent = 'Check';
      else statusText.textContent = 'Terputus';
    });

    async function saveToApiJson(dataPayload) {
      try {
        await fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataPayload) });
      } catch (error) { console.error('Error fetch API save:', error); }
    }

    socket.on('sensor-data', (data) => {
      const pitch = data.sudut;
      const gerakan = data.gerakan;

      pitchVal.textContent = pitch.toFixed(1) + '°';

      // Update timer when valid pose detected
      if (!isSessionActive && gerakan !== 'Transisi') {
        isSessionActive = true;
        sessionStartTime = Date.now();
        if(sessionTimer) clearInterval(sessionTimer);
        sessionTimer = setInterval(updateSessionTime, 1000);
      }

      if (gerakan === 'Transisi') {
        stabilityText.textContent = 'Transisional';
        stabilityText.style.color = 'var(--google-yellow)';
      } else {
        stabilityText.textContent = 'Stabil';
        stabilityText.style.color = 'var(--google-green)';
      }

      if (gerakan !== 'Transisi') {
        if (transitionTimeout) { clearTimeout(transitionTimeout); transitionTimeout = null; }
        if (activePoseKey !== gerakan) {
          activePoseKey = gerakan;
          poseText.textContent = gerakan;
          
          update3DPose(gerakan);

          if (bacaanContainer && readingMapping[gerakan]) {
            bacaanContainer.style.display = 'block';
            bacaanArab.textContent = readingMapping[gerakan].arab;
            bacaanLatin.textContent = readingMapping[gerakan].latin;
            bacaanArti.textContent = readingMapping[gerakan].arti;
          }
          
          if (gerakan === 'Sujud' && lastGerakan !== 'Sujud') {
             sessionTotalSujud++;
             statSujud.textContent = sessionTotalSujud;
             // Estimate rakaat (2 sujuds per rakaat)
             statRakaat.textContent = Math.floor(sessionTotalSujud / 2);
          }
        }
      } else {
        if (!transitionTimeout && activePoseKey !== 'Transisi') {
          transitionTimeout = setTimeout(() => { 
            activePoseKey = 'Transisi'; 
            poseText.textContent = 'Transisi...'; 
            update3DPose('Transisi');
            if (bacaanContainer) {
              bacaanArab.textContent = '';
              bacaanLatin.textContent = 'Menuju gerakan selanjutnya...';
              bacaanArti.textContent = '';
            }
          }, 800);
        }
      }

      if (gerakan !== 'Transisi' && gerakan !== lastGerakan) {
        saveToApiJson({ waktu: new Date().toISOString(), sudut: pitch, gerakan: gerakan });
        if (lastGerakan !== '') {
          totalTransitions++;
          counterText.textContent = totalTransitions;
          if (voiceGuideToggle.checked && poseMapping[gerakan]) {
            const audio = new Audio(poseMapping[gerakan].audio);
            audio.play().catch(e => console.log('Audio prevented:', e));
          }
        }
        lastGerakan = gerakan;

        if (emptyHistoryRow) emptyHistoryRow.style.display = 'none';
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${new Date().toLocaleTimeString()}</td>
          <td><span class="badge badge-sholat">${gerakan}</span></td>
          <td><span class="badge badge-angle">${pitch.toFixed(1)}°</span></td>`;
        historyTableBody.insertBefore(row, historyTableBody.firstChild);
        if (historyTableBody.children.length > 15) historyTableBody.removeChild(historyTableBody.lastChild);
      }
    });

    // ----------------------------------------------------
    // AL-QURAN READER LOGIC
    // ----------------------------------------------------
    const surahGrid = document.getElementById('surahGrid');
    const quranSearchInput = document.getElementById('quran-search');
    const quranListPanel = document.getElementById('quran-list-panel');
    const quranReaderPanel = document.getElementById('quran-reader-panel');
    const btnBackToQuranList = document.getElementById('btnBackToQuranList');
    const readerSurahName = document.getElementById('readerSurahName');
    const readerSurahDesc = document.getElementById('readerSurahDesc');
    const versesContainer = document.getElementById('versesContainer');

    async function loadQuranData() {
      try {
        const res = await fetch('api/api.json');
        if (!res.ok) throw new Error('Gagal memuat api.json');
        quranData = await res.json();
        renderSurahList(quranData);
      } catch (err) {
        surahGrid.innerHTML = `<div style="grid-column:1/-1; color:var(--md-sys-color-error); text-align:center;">Error: ${err.message}</div>`;
      }
    }

    function renderSurahList(data) {
      surahGrid.innerHTML = '';
      if (data.length === 0) {
        surahGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--md-sys-color-outline);">Tidak ditemukan</div>`;
        return;
      }
      data.forEach(surah => {
        const card = document.createElement('div');
        card.className = 'surah-card';
        card.innerHTML = `
          <div class="surah-info-left">
            <div class="surah-num-badge">${surah.id}</div>
            <div class="surah-meta">
              <span class="surah-name-ind">${surah.transliteration}</span>
              <span class="surah-desc-ind">${surah.translation} &bull; ${surah.total_verses} Ayat</span>
            </div>
          </div>
          <div class="surah-name-ara">${surah.name}</div>`;
        card.addEventListener('click', () => openSurahReader(surah));
        surahGrid.appendChild(card);
      });
    }

    function openSurahReader(surah) {
      quranListPanel.style.display = 'none';
      quranReaderPanel.style.display = 'block';
      readerSurahName.textContent = surah.transliteration;
      readerSurahDesc.textContent = `${surah.translation} • ${surah.total_verses} Ayat • ${surah.type === 'meccan' ? 'Makkiyah' : 'Madaniyah'}`;
      versesContainer.innerHTML = '';
      surah.verses.forEach(verse => {
        const item = document.createElement('div');
        item.className = 'verse-item';
        item.innerHTML = `
          <div class="verse-number">AYAT ${verse.id}</div>
          <div class="verse-text">${verse.text}</div>
          <div class="verse-translation">${verse.translation}</div>`;
        versesContainer.appendChild(item);
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    btnBackToQuranList.addEventListener('click', () => {
      quranReaderPanel.style.display = 'none';
      quranListPanel.style.display = 'block';
    });

    quranSearchInput.addEventListener('input', (e) => {
      if (!quranData) return;
      const term = e.target.value.toLowerCase().trim();
      renderSurahList(quranData.filter(s => s.transliteration.toLowerCase().includes(term) || s.translation.toLowerCase().includes(term)));
    });

    // ----------------------------------------------------
    // LIVE MOSQUE GALLERY LOGIC (WITH INFINITY SCROLL)
    // ----------------------------------------------------
    const galleryGrid = document.getElementById('galleryGrid');
    const gallerySearchInput = document.getElementById('gallery-search');
    const btnSearchGallery = document.getElementById('btnSearchGallery');
    const loadMoreSentinel = document.getElementById('loadMoreSentinel');

    // Lightbox elements
    const lightboxModal = document.getElementById('lightboxModal');
    const modalImg = document.getElementById('modalImg');
    const modalPhotographer = document.getElementById('modalPhotographer');
    const modalDesc = document.getElementById('modalDesc');
    const modalPexelsUrl = document.getElementById('modalPexelsUrl');
    const btnModalClose = document.getElementById('btnModalClose');

    // State for pagination
    const galleryState = {
      query: 'mosque',
      page: 1,
      isLoading: false,
      hasMore: true,
      photos: []
    };

    async function fetchMosquePhotos(query, page = 1) {
      if (galleryState.isLoading) return;

      // Jika pencarian baru, reset state
      if (query !== galleryState.query) {
        galleryState.query = query;
        galleryState.page = 1;
        galleryState.hasMore = true;
        galleryState.photos = [];
        galleryGrid.innerHTML = '';
      }

      galleryState.isLoading = true;
      loadMoreSentinel.innerText = 'Memuat gambar...';

      try {
        const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=12&page=${page}`, {
          headers: { 'Authorization': PEXELS_API_KEY }
        });
        if (!res.ok) throw new Error('Gagal menghubungi Pexels');
        const data = await res.json();

        if (data.photos.length === 0) {
          galleryState.hasMore = false;
          loadMoreSentinel.innerText = 'Tidak ada gambar lagi.';
          if (page === 1) galleryGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--md-sys-color-outline);">Tidak ditemukan foto.</div>`;
          return;
        }

        renderGalleryGrid(data.photos);
        galleryState.page++;
        loadMoreSentinel.innerText = '';
      } catch (err) {
        loadMoreSentinel.innerText = 'Gagal memuat.';
        galleryGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--md-sys-color-error);">Error: ${err.message}</div>`;
      } finally {
        galleryState.isLoading = false;
      }
    }

    function renderGalleryGrid(photos) {
      photos.forEach(photo => {
        galleryState.photos.push(photo);
        const card = document.createElement('div');
        card.className = 'gallery-card';
        card.innerHTML = `
          <img src="${photo.src.medium}" alt="${photo.alt || 'Mosque'}" loading="lazy">
          <div class="gallery-info">
            <span class="photographer-name">${photo.photographer}</span>
            <span class="photo-desc">${photo.alt || 'Masjid Indah'}</span>
          </div>`;
        card.addEventListener('click', () => openLightbox(photo));
        galleryGrid.appendChild(card);
      });
    }

    // Infinity Scroll Observer
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !galleryState.isLoading && galleryState.hasMore) {
        fetchMosquePhotos(galleryState.query, galleryState.page);
      }
    }, { rootMargin: "200px" });

    observer.observe(loadMoreSentinel);

    // Lightbox Functions
    function openLightbox(photo) {
      modalImg.src = photo.src.large;
      modalPhotographer.textContent = `Fotografer: ${photo.photographer}`;
      modalDesc.textContent = photo.alt || 'Arsitektur Masjid';
      modalPexelsUrl.href = photo.url;
      lightboxModal.style.display = 'flex';
    }

    btnModalClose.addEventListener('click', () => lightboxModal.style.display = 'none');
    lightboxModal.addEventListener('click', (e) => { if (e.target === lightboxModal) lightboxModal.style.display = 'none'; });

    btnSearchGallery.addEventListener('click', () => {
      const q = gallerySearchInput.value.trim();
      if (q) fetchMosquePhotos(q);
    });

    gallerySearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const q = gallerySearchInput.value.trim();
        if (q) fetchMosquePhotos(q);
      }
    });

    // ----------------------------------------------------
    // DEVELOPER AUTH & PLAN MANAGER LOGIC
    // ----------------------------------------------------
    let authKey = localStorage.getItem('authKey') || '';
    let authExpiry = parseInt(localStorage.getItem('authExpiry')) || 0;
    let activePlan = localStorage.getItem('activePlan') || 'free';

    const quranLockOverlay = document.getElementById('quran-lock-overlay');
    const tasbihLockOverlay = document.getElementById('tasbih-lock-overlay');
    const galleryLockOverlay = document.getElementById('gallery-lock-overlay');
    const voiceLockBadge = document.getElementById('voice-lock-badge');
    const voiceGuideToggleCheckbox = document.getElementById('voiceGuideToggle');

    const licenseKeyInput = document.getElementById('license-key-input');
    const btnAuthLicense = document.getElementById('btn-auth-license');
    const btnDeauthLicense = document.getElementById('btn-deauth-license');
    const authInputContainer = document.getElementById('auth-input-container');
    const authStatusContainer = document.getElementById('auth-status-container');
    const licenseExpiryDate = document.getElementById('license-expiry-date');
    const authErrorMsg = document.getElementById('auth-error-msg');
    
    const planLockWarning = document.getElementById('plan-lock-warning');
    const planCards = document.querySelectorAll('.plan-card');

    function checkAuthValidity() {
      if (authKey && authExpiry) {
        if (Date.now() > authExpiry) {
          // Expired!
          deauthenticate(true); // silent / force
          return false;
        }
        return true;
      }
      return false;
    }

    function applyActivePlan() {
      const isAuthActive = checkAuthValidity();
      
      // If not authenticated, active plan is strictly Free
      const currentPlan = isAuthActive ? activePlan : 'free';

      // 1. Highlight the active plan card
      planCards.forEach(card => {
        card.classList.remove('active-plan');
        const check = card.querySelector('.plan-check');
        if (check) check.style.display = 'none';
      });
      const activeCard = document.getElementById(`plan-card-${currentPlan}`);
      if (activeCard) {
        activeCard.classList.add('active-plan');
        const check = activeCard.querySelector('.plan-check');
        if (check) check.style.display = 'block';
      }

      // 2. Tab lock overlays
      if (currentPlan === 'free') {
        quranLockOverlay.style.display = 'flex';
        tasbihLockOverlay.style.display = 'flex';
        galleryLockOverlay.style.display = 'flex';
        
        voiceGuideToggleCheckbox.checked = false;
        voiceGuideToggleCheckbox.disabled = true;
        voiceLockBadge.style.display = 'inline';
      } else if (currentPlan === 'standard') {
        quranLockOverlay.style.display = 'none';
        tasbihLockOverlay.style.display = 'none';
        galleryLockOverlay.style.display = 'flex';
        
        voiceGuideToggleCheckbox.checked = false;
        voiceGuideToggleCheckbox.disabled = true;
        voiceLockBadge.style.display = 'inline';
      } else if (currentPlan === 'premium') {
        quranLockOverlay.style.display = 'none';
        tasbihLockOverlay.style.display = 'none';
        galleryLockOverlay.style.display = 'none';
        
        voiceGuideToggleCheckbox.disabled = false;
        voiceLockBadge.style.display = 'none';
      }

      // 3. Plan switching lock state
      if (isAuthActive) {
        planLockWarning.style.display = 'none';
        planCards.forEach(card => {
          card.classList.remove('disabled-plan');
        });
      } else {
        planLockWarning.style.display = 'flex';
        planCards.forEach(card => {
          if (card.dataset.plan !== 'free') {
            card.classList.add('disabled-plan');
          }
        });
      }
    }

    function authenticate(key) {
      if (key.trim().toUpperCase() === 'DEV-6M-PASS') {
        authKey = 'DEV-6M-PASS';
        // 6 months in milliseconds (180 days)
        authExpiry = Date.now() + 180 * 24 * 60 * 60 * 1000;
        activePlan = 'premium'; // Default to Premium once authenticated
        
        localStorage.setItem('authKey', authKey);
        localStorage.setItem('authExpiry', authExpiry);
        localStorage.setItem('activePlan', activePlan);

        showAuthenticatedUI();
        applyActivePlan();
        authErrorMsg.style.display = 'none';
        licenseKeyInput.value = '';
      } else {
        authErrorMsg.style.display = 'block';
      }
    }

    function deauthenticate(silent = false) {
      authKey = '';
      authExpiry = 0;
      activePlan = 'free';

      localStorage.removeItem('authKey');
      localStorage.removeItem('authExpiry');
      localStorage.setItem('activePlan', 'free');

      showUnauthenticatedUI();
      applyActivePlan();
      if (!silent) {
        authErrorMsg.style.display = 'none';
        licenseKeyInput.value = '';
      }
    }

    function showAuthenticatedUI() {
      authInputContainer.style.display = 'none';
      authStatusContainer.style.display = 'flex';
      
      const expiryDateObj = new Date(authExpiry);
      const dateString = expiryDateObj.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      licenseExpiryDate.textContent = `만료일: ${dateString}`;
    }

    function showUnauthenticatedUI() {
      authInputContainer.style.display = 'flex';
      authStatusContainer.style.display = 'none';
    }

    // Set up Settings Tab Listeners
    btnAuthLicense.addEventListener('click', () => {
      authenticate(licenseKeyInput.value);
    });

    licenseKeyInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        authenticate(licenseKeyInput.value);
      }
    });

    btnDeauthLicense.addEventListener('click', () => {
      deauthenticate();
    });

    // Plan Switching Click Listeners
    planCards.forEach(card => {
      card.addEventListener('click', () => {
        if (!checkAuthValidity()) {
          // Warning already shown
          return;
        }
        const selectedPlan = card.dataset.plan;
        activePlan = selectedPlan;
        localStorage.setItem('activePlan', activePlan);
        applyActivePlan();
      });
    });

    // "Go to Settings" overlay buttons
    document.querySelectorAll('.btn-go-settings').forEach(btn => {
      btn.addEventListener('click', () => {
        const settingsNavItem = document.querySelector('.nav-item[data-tab="tab-settings"]');
        if (settingsNavItem) {
          settingsNavItem.click();
        }
      });
    });

    // Initialize UI on page load
    if (checkAuthValidity()) {
      showAuthenticatedUI();
    } else {
      showUnauthenticatedUI();
    }
    applyActivePlan();

    // ----------------------------------------------------
    // GOOGLE LOGIN STATE MACHINE
    // ----------------------------------------------------
    const googleLoginScreen = document.getElementById('google-login-screen');
    const googleOauthModal = document.getElementById('google-oauth-modal');
    const btnGoogleLogin = document.getElementById('btn-google-login');
    const oauthAccountList = document.getElementById('oauth-account-list');
    const oauthLoading = document.getElementById('oauth-loading');
    const oauthAccountItems = document.querySelectorAll('.oauth-account-item');
    
    const userProfilePic = document.getElementById('user-profile-pic');
    const userProfileName = document.getElementById('user-profile-name');
    const userProfileEmail = document.getElementById('user-profile-email');
    const btnGoogleLogout = document.getElementById('btn-google-logout');

    const appHeader = document.querySelector('header');
    const appBottomNav = document.querySelector('.bottom-nav');

    let isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    let userProfile = JSON.parse(localStorage.getItem('userProfile')) || null;

    function updateLoginLayout() {
      if (isLoggedIn && userProfile) {
        // Logged In
        googleLoginScreen.style.opacity = '0';
        setTimeout(() => {
          googleLoginScreen.style.display = 'none';
        }, 400);

        appHeader.style.display = 'flex';
        appBottomNav.style.display = 'flex';

        // Update settings profile card
        userProfilePic.src = userProfile.picture;
        userProfileName.textContent = userProfile.name;
        userProfileEmail.textContent = userProfile.email;
      } else {
        // Logged Out
        googleLoginScreen.style.display = 'flex';
        googleLoginScreen.style.opacity = '1';

        appHeader.style.display = 'none';
        appBottomNav.style.display = 'none';
        
        // Reset tab to dashboard so when they log in next time they see the dashboard
        const dashboardNavItem = document.querySelector('.nav-item[data-tab="tab-dashboard"]');
        if (dashboardNavItem) dashboardNavItem.click();
      }
    }

    // Google Login button opens account selector
    btnGoogleLogin.addEventListener('click', () => {
      googleOauthModal.style.display = 'flex';
    });

    // Close picker modal if clicking outside
    googleOauthModal.addEventListener('click', (e) => {
      if (e.target === googleOauthModal) {
        googleOauthModal.style.display = 'none';
      }
    });

    // Account select handler
    oauthAccountItems.forEach(item => {
      item.addEventListener('click', () => {
        const name = item.dataset.name;
        const email = item.dataset.email;
        const picture = item.dataset.pic;

        // Show spinner simulation
        oauthAccountList.style.display = 'none';
        oauthLoading.style.display = 'block';

        setTimeout(() => {
          // Complete login after 1.2 seconds spinner
          isLoggedIn = true;
          userProfile = { name, email, picture };

          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('userProfile', JSON.stringify(userProfile));

          // Reset OAuth modal state
          googleOauthModal.style.display = 'none';
          oauthAccountList.style.display = 'block';
          oauthLoading.style.display = 'none';

          updateLoginLayout();
        }, 1200);
      });
    });

    // Logout handler
    btnGoogleLogout.addEventListener('click', () => {
      isLoggedIn = false;
      userProfile = null;
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userProfile');
      
      // Also clear developer authorization on logout to keep sandbox clean
      deauthenticate(true); 

      updateLoginLayout();
    });

    // Run login check
    updateLoginLayout();
