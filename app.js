// Dream Big Media portfolio — Supabase-backed version
// Photos and videos both use the same generic gallery controller below,
// configured with their own tables/elements. Site settings, testimonials,
// contact form, and section navigation are handled separately.

(function () {
  var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  var FAQS = [
    { q: 'How far in advance should I book?', a: 'For events and weddings, 2-4 weeks ahead is ideal so we can lock in your date. For portrait or fashion shoots, a few days notice usually works, but earlier is always better, especially for weekends.' },
    { q: 'What happens after the shoot?', a: 'Standard delivery is 3-4 days for photo, 7 days for video. You will get a private online gallery to view and download your edited files. Next-day rush delivery is available for an extra fee.' },
    { q: 'Do you travel outside Nottingham?', a: 'Yes. Prices may change depending on distance and travel time required, this is always discussed and agreed with you beforehand, so there are no surprises.' },
    { q: 'How does payment work?', a: 'A 50% deposit secures your date and is non-refundable, though you can reschedule for free if you give 48 hours notice or more. The remaining balance is due at the end of the session.' },
    { q: 'Can I get the raw, unedited footage?', a: 'Raw footage is available on request. For video projects, raw handover is priced at 2x the hourly shoot rate, since it involves additional file preparation.' },
    { q: 'What kind of work do you take on?', a: 'Events, portraits, and fashion/editorial shoots are my main focus. If you have something a bit different in mind, reach out and we can talk through it.' }
  ];

  function el(id) { return document.getElementById(id); }

  var isAdmin = false;
  var adminUIRefreshers = [];

  function refreshAdminUI() {
    el('dbmAdminBar').classList.toggle('show', isAdmin);
    el('dbmLoginTrigger').style.display = isAdmin ? 'none' : 'flex';
    adminUIRefreshers.forEach(function (fn) { fn(); });
  }

  supabase.auth.onAuthStateChange(function (event, session) {
    isAdmin = !!session;
    refreshAdminUI();
  });

  async function checkSession() {
    var { data } = await supabase.auth.getSession();
    isAdmin = !!data.session;
    refreshAdminUI();
  }

  el('dbmLoginTrigger').addEventListener('click', function () { el('dbmLoginOverlay').classList.add('show'); });
  el('dbmLoginCancel').addEventListener('click', function () { el('dbmLoginOverlay').classList.remove('show'); });
  el('dbmLoginOverlay').addEventListener('click', function (e) { if (e.target === this) this.classList.remove('show'); });
  el('dbmLoginSubmit').addEventListener('click', async function () {
    var email = el('dbmLoginEmail').value.trim();
    var password = el('dbmLoginPassword').value;
    var status = el('dbmLoginStatus');
    if (!email || !password) { status.textContent = 'Enter email and password.'; return; }
    status.textContent = 'Logging in…';
    var { error } = await supabase.auth.signInWithPassword({ email: email, password: password });
    if (error) {
      status.textContent = 'Login failed: ' + error.message;
    } else {
      status.textContent = '';
      el('dbmLoginOverlay').classList.remove('show');
      el('dbmLoginEmail').value = '';
      el('dbmLoginPassword').value = '';
    }
  });
  el('dbmLogoutBtn').addEventListener('click', async function () { await supabase.auth.signOut(); });

  // ===================================================================
  // Generic gallery controller — used once for photos, once for videos
  // ===================================================================
  function createGalleryController(cfg) {
    var state = {
      shoots: [],
      currentFilter: 'all',
      organizeMode: false,
      mergeSelection: [],
      dragSrcId: null
    };

    function storagePublicUrl(path) {
      var { data } = supabase.storage.from(cfg.bucket).getPublicUrl(path);
      return data.publicUrl;
    }

    async function loadShoots() {
      el(cfg.els.loading).style.display = 'block';
      var { data: shootRows, error: shootErr } = await supabase
        .from(cfg.shootTable).select('*').order('display_order', { ascending: true });
      var { data: itemRows, error: itemErr } = await supabase
        .from(cfg.itemTable).select('*').order('display_order', { ascending: true });

      el(cfg.els.loading).style.display = 'none';

      if (shootErr || itemErr) {
        console.error(shootErr || itemErr);
        el(cfg.els.empty).textContent = 'Could not load this gallery. Please refresh.';
        el(cfg.els.empty).style.display = 'block';
        return;
      }

      var itemsByShoot = {};
      (itemRows || []).forEach(function (it) {
        it.url = storagePublicUrl(it.storage_path);
        if (!itemsByShoot[it[cfg.itemShootFk]]) itemsByShoot[it[cfg.itemShootFk]] = [];
        itemsByShoot[it[cfg.itemShootFk]].push(it);
      });

      state.shoots = (shootRows || []).map(function (s) {
        var items = itemsByShoot[s.id] || [];
        var cover = items.find(function (it) { return it.id === s[cfg.coverFk]; }) || items[0];
        var shoot = { id: s.id, category: s.category, display_order: s.display_order, cover: cover, items: items };
        shoot[cfg.coverFk] = s[cfg.coverFk];
        return shoot;
      }).filter(function (s) { return s.items.length > 0; });

      renderGallery();
      populateShootSelect();
    }

    function renderCounts() {
      var counts = { all: state.shoots.length, events: 0, portraits: 0, fashion: 0 };
      state.shoots.forEach(function (s) { if (counts[s.category] !== undefined) counts[s.category]++; });
      Object.keys(counts).forEach(function (key) {
        var node = el(cfg.els.countPrefix + key);
        if (node) node.textContent = counts[key];
      });
    }

    function mediaTag(item, extraAttrs) {
      if (cfg.mediaType === 'video') {
        return '<video src="' + item.url + '" ' + (extraAttrs || '') + ' muted playsinline preload="metadata"></video>';
      }
      return '<img src="' + item.url + '" alt="' + cfg.sectionName + ' media" loading="lazy" ' + (extraAttrs || '') + '>';
    }

    function renderGallery() {
      var gallery = el(cfg.els.gallery);
      var filtered = state.currentFilter === 'all' ? state.shoots : state.shoots.filter(function (s) { return s.category === state.currentFilter; });
      gallery.innerHTML = '';
      el(cfg.els.empty).style.display = (filtered.length === 0 && state.shoots.length > 0) ? 'block' : 'none';

      filtered.forEach(function (shoot, idx) {
        var cover = shoot.cover;
        if (!cover) return;
        var card = document.createElement('div');
        card.className = 'dbm-card' + (state.organizeMode ? ' organize-mode' : '');
        card.setAttribute('data-shoot-id', shoot.id);
        if (state.mergeSelection.indexOf(shoot.id) !== -1) card.classList.add('merge-selected');

        card.innerHTML =
          mediaTag(cover) +
          '<span class="dbm-card-tag">' + shoot.category + '</span>' +
          (state.organizeMode ? '<button class="dbm-card-cover-btn" aria-label="Manage media"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></button>' : '') +
          (state.organizeMode ? '<div class="dbm-card-move"><button class="dbm-move-left" aria-label="Move earlier" ' + (idx === 0 ? 'disabled' : '') + '>&#8249;</button><button class="dbm-move-right" aria-label="Move later" ' + (idx === filtered.length - 1 ? 'disabled' : '') + '>&#8250;</button></div>' : '');

        var mediaEl = card.querySelector(cfg.mediaType === 'video' ? 'video' : 'img');
        mediaEl.addEventListener('click', function () {
          if (state.organizeMode) {
            toggleMergeSelection(shoot.id, card);
          } else {
            openLightbox(shoot, cover, cfg.mediaType);
          }
        });

        var coverBtn = card.querySelector('.dbm-card-cover-btn');
        if (coverBtn) coverBtn.addEventListener('click', function (e) { e.stopPropagation(); openCoverPicker(shoot); });

        var moveLeftBtn = card.querySelector('.dbm-move-left');
        var moveRightBtn = card.querySelector('.dbm-move-right');
        if (moveLeftBtn) moveLeftBtn.addEventListener('click', function (e) { e.stopPropagation(); moveShoot(shoot.id, -1, filtered); });
        if (moveRightBtn) moveRightBtn.addEventListener('click', function (e) { e.stopPropagation(); moveShoot(shoot.id, 1, filtered); });

        if (state.organizeMode) {
          card.draggable = true;
          card.addEventListener('dragstart', function () { state.dragSrcId = shoot.id; card.classList.add('dragging'); });
          card.addEventListener('dragend', function () { card.classList.remove('dragging'); });
          card.addEventListener('dragover', function (e) { e.preventDefault(); card.classList.add('drag-over'); });
          card.addEventListener('dragleave', function () { card.classList.remove('drag-over'); });
          card.addEventListener('drop', function (e) {
            e.preventDefault();
            card.classList.remove('drag-over');
            if (!state.dragSrcId || state.dragSrcId === shoot.id) return;
            reorderShoots(state.dragSrcId, shoot.id, filtered);
          });
        }

        gallery.appendChild(card);
      });

      renderCounts();
    }

    async function persistOrder(orderedShoots) {
      var updates = orderedShoots.map(function (s, idx) {
        return supabase.from(cfg.shootTable).update({ display_order: idx }).eq('id', s.id);
      });
      await Promise.all(updates);
    }

    async function moveShoot(id, offset, currentList) {
      var idx = currentList.findIndex(function (s) { return s.id === id; });
      var newIdx = idx + offset;
      if (idx === -1 || newIdx < 0 || newIdx >= currentList.length) return;
      var reordered = currentList.slice();
      var moved = reordered.splice(idx, 1)[0];
      reordered.splice(newIdx, 0, moved);
      reordered.forEach(function (s, i) { s.display_order = i; });
      renderGallery();
      await persistOrder(reordered);
    }

    async function reorderShoots(srcId, targetId, currentList) {
      var srcIdx = currentList.findIndex(function (s) { return s.id === srcId; });
      var targetIdx = currentList.findIndex(function (s) { return s.id === targetId; });
      if (srcIdx === -1 || targetIdx === -1) return;
      var reordered = currentList.slice();
      var moved = reordered.splice(srcIdx, 1)[0];
      reordered.splice(targetIdx, 0, moved);
      reordered.forEach(function (s, i) { s.display_order = i; });
      renderGallery();
      await persistOrder(reordered);
    }

    function openCoverPicker(shoot) {
      var grid = el(cfg.els.coverGrid);
      grid.innerHTML = '';
      shoot.items.forEach(function (item) {
        var pick = document.createElement('div');
        pick.className = 'dbm-cover-pick' + (item.id === shoot.cover.id ? ' is-current' : '');
        pick.innerHTML =
          mediaTag(item) +
          '<button class="dbm-cover-delete" aria-label="Delete this item" title="Delete">&times;</button>';

        pick.querySelector(cfg.mediaType === 'video' ? 'video' : 'img').addEventListener('click', async function () {
          shoot.cover = item;
          shoot[cfg.coverFk] = item.id;
          el(cfg.els.coverModal).classList.remove('show');
          renderGallery();
          var patch = {}; patch[cfg.coverFk] = item.id;
          await supabase.from(cfg.shootTable).update(patch).eq('id', shoot.id);
        });

        pick.querySelector('.dbm-cover-delete').addEventListener('click', async function (e) {
          e.stopPropagation();
          if (shoot.items.length <= 1) {
            alert('This is the only item in this shoot. Delete the whole shoot from Organize mode instead, or add another item first.');
            return;
          }
          var confirmed = confirm('Delete this permanently? This cannot be undone.');
          if (!confirmed) return;

          await supabase.storage.from(cfg.bucket).remove([item.storage_path]);
          await supabase.from(cfg.itemTable).delete().eq('id', item.id);

          shoot.items = shoot.items.filter(function (p) { return p.id !== item.id; });
          if (shoot.cover.id === item.id) {
            shoot.cover = shoot.items[0];
            shoot[cfg.coverFk] = shoot.items[0].id;
            var patch2 = {}; patch2[cfg.coverFk] = shoot.cover.id;
            await supabase.from(cfg.shootTable).update(patch2).eq('id', shoot.id);
          }
          renderGallery();
          openCoverPicker(shoot);
        });

        grid.appendChild(pick);
      });
      el(cfg.els.coverModal).classList.add('show');
    }
    el(cfg.els.cancelCover).addEventListener('click', function () { el(cfg.els.coverModal).classList.remove('show'); });
    el(cfg.els.coverModal).addEventListener('click', function (e) { if (e.target === this) this.classList.remove('show'); });

    el(cfg.els.organizeBtn).addEventListener('click', function () {
      state.organizeMode = !state.organizeMode;
      this.classList.toggle('active', state.organizeMode);
      el(cfg.els.organizeHint).style.display = state.organizeMode ? 'block' : 'none';
      if (!state.organizeMode) state.mergeSelection = [];
      updateMergeButton();
      renderGallery();
    });

    function toggleMergeSelection(id, cardEl) {
      var idx = state.mergeSelection.indexOf(id);
      if (idx === -1) { state.mergeSelection.push(id); cardEl.classList.add('merge-selected'); }
      else { state.mergeSelection.splice(idx, 1); cardEl.classList.remove('merge-selected'); }
      updateMergeButton();
    }

    function updateMergeButton() {
      var btn = el(cfg.els.mergeBtn);
      el(cfg.els.mergeCount).textContent = state.mergeSelection.length;
      btn.style.display = (isAdmin && state.organizeMode) ? 'inline-block' : 'none';
      btn.disabled = state.mergeSelection.length < 2;
    }

    el(cfg.els.mergeBtn).addEventListener('click', async function () {
      if (state.mergeSelection.length < 2) return;
      var targetId = state.mergeSelection[0];
      var othersIds = state.mergeSelection.slice(1);

      for (var i = 0; i < othersIds.length; i++) {
        var patch = {}; patch[cfg.itemShootFk] = targetId;
        await supabase.from(cfg.itemTable).update(patch).eq(cfg.itemShootFk, othersIds[i]);
        await supabase.from(cfg.shootTable).delete().eq('id', othersIds[i]);
      }

      state.mergeSelection = [];
      updateMergeButton();
      await loadShoots();
    });

    function refreshGalleryAdminUI() {
      el(cfg.els.uploadBtn).style.display = isAdmin ? 'inline-flex' : 'none';
      el(cfg.els.organizeBtn).style.display = isAdmin ? 'inline-block' : 'none';
      if (!isAdmin) {
        state.organizeMode = false;
        state.mergeSelection = [];
        el(cfg.els.organizeHint).style.display = 'none';
      }
      updateMergeButton();
      renderGallery();
    }
    adminUIRefreshers.push(refreshGalleryAdminUI);

    document.querySelectorAll('[' + cfg.els.filterAttr + ']').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('[' + cfg.els.filterAttr + ']').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        state.currentFilter = btn.getAttribute(cfg.els.filterAttr);
        renderGallery();
      });
    });

    var uploadModal = el(cfg.els.uploadModal);
    el(cfg.els.uploadBtn).addEventListener('click', function () {
      el(cfg.els.uploadStatus).textContent = '';
      populateShootSelect();
      uploadModal.classList.add('show');
    });
    el(cfg.els.cancelUpload).addEventListener('click', function () {
      uploadModal.classList.remove('show');
      el(cfg.els.fileInput).value = '';
    });
    uploadModal.addEventListener('click', function (e) { if (e.target === this) this.classList.remove('show'); });

    function populateShootSelect() {
      var select = el(cfg.els.shootSelect);
      var currentVal = select.value;
      select.innerHTML = '<option value="__new__">+ Create new shoot</option>';
      state.shoots.forEach(function (s) {
        var opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.category + ' — ' + s.items.length + ' item(s)';
        select.appendChild(opt);
      });
      if (currentVal) select.value = currentVal;
    }

    function fileExt(filename, fallback) {
      var m = /\.([a-zA-Z0-9]+)$/.exec(filename);
      return m ? m[1].toLowerCase() : fallback;
    }

    el(cfg.els.saveUpload).addEventListener('click', async function () {
      var fileInput = el(cfg.els.fileInput);
      var category = el(cfg.els.catSelect).value;
      var shootChoice = el(cfg.els.shootSelect).value;
      var status = el(cfg.els.uploadStatus);

      if (!fileInput.files || !fileInput.files.length) {
        status.textContent = 'Choose at least one file.';
        return;
      }
      status.textContent = 'Uploading…';

      try {
        var shootId = shootChoice;
        if (shootChoice === '__new__') {
          var maxOrder = state.shoots.reduce(function (m, s) { return Math.max(m, s.display_order || 0); }, -1);
          var { data: newShoot, error: shootErr } = await supabase
            .from(cfg.shootTable).insert({ category: category, display_order: maxOrder + 1 }).select().single();
          if (shootErr) throw shootErr;
          shootId = newShoot.id;
        }

        var files = Array.from(fileInput.files);
        for (var i = 0; i < files.length; i++) {
          var file = files[i];
          var path = shootId + '/' + Date.now() + '-' + i + '.' + fileExt(file.name, cfg.mediaType === 'video' ? 'mp4' : 'jpg');
          var { error: uploadErr } = await supabase.storage.from(cfg.bucket).upload(path, file);
          if (uploadErr) throw uploadErr;

          var itemPayload = { storage_path: path, display_order: i };
          itemPayload[cfg.itemShootFk] = shootId;
          var { data: itemRow, error: itemErr } = await supabase
            .from(cfg.itemTable).insert(itemPayload).select().single();
          if (itemErr) throw itemErr;

          if (shootChoice === '__new__' && i === 0) {
            var patch = {}; patch[cfg.coverFk] = itemRow.id;
            await supabase.from(cfg.shootTable).update(patch).eq('id', shootId);
          }
        }

        status.textContent = 'Added.';
        await loadShoots();
        setTimeout(function () {
          uploadModal.classList.remove('show');
          fileInput.value = '';
          status.textContent = '';
        }, 700);
      } catch (err) {
        console.error(err);
        status.textContent = 'Upload failed: ' + (err.message || 'try a smaller file.');
      }
    });

    return { loadShoots: loadShoots, renderGallery: renderGallery };
  }

  // ---------- Lightbox (shared by photos and videos) ----------
  var lightboxSet = [];
  var lightboxIndex = 0;
  var lightboxMediaType = 'image';

  function showLightboxItem() {
    var item = lightboxSet[lightboxIndex];
    var imgEl = el('dbmLightboxImg');
    var videoEl = el('dbmLightboxVideo');
    if (lightboxMediaType === 'video') {
      imgEl.style.display = 'none';
      videoEl.style.display = 'block';
      videoEl.src = item.url;
      videoEl.muted = false;
    } else {
      videoEl.pause();
      videoEl.style.display = 'none';
      imgEl.style.display = 'block';
      imgEl.src = item.url;
    }
    var counter = el('dbmLightboxCounter');
    var prevBtn = el('dbmLightboxPrev');
    var nextBtn = el('dbmLightboxNext');
    if (lightboxSet.length > 1) {
      counter.textContent = (lightboxIndex + 1) + ' / ' + lightboxSet.length;
      counter.style.display = 'block';
      prevBtn.style.display = 'flex';
      nextBtn.style.display = 'flex';
    } else {
      counter.style.display = 'none';
      prevBtn.style.display = 'none';
      nextBtn.style.display = 'none';
    }
  }
  function openLightbox(shoot, item, mediaType) {
    lightboxSet = shoot.items;
    lightboxMediaType = mediaType;
    lightboxIndex = lightboxSet.findIndex(function (p) { return p.id === item.id; });
    if (lightboxIndex < 0) lightboxIndex = 0;
    showLightboxItem();
    el('dbmLightbox').classList.add('show');
  }
  function closeLightbox() {
    el('dbmLightbox').classList.remove('show');
    el('dbmLightboxImg').src = '';
    el('dbmLightboxVideo').pause();
    el('dbmLightboxVideo').src = '';
    lightboxSet = [];
    lightboxIndex = 0;
  }
  function lightboxPrev() { if (!lightboxSet.length) return; lightboxIndex = (lightboxIndex - 1 + lightboxSet.length) % lightboxSet.length; showLightboxItem(); }
  function lightboxNext() { if (!lightboxSet.length) return; lightboxIndex = (lightboxIndex + 1) % lightboxSet.length; showLightboxItem(); }

  el('dbmLightboxClose').addEventListener('click', closeLightbox);
  el('dbmLightboxPrev').addEventListener('click', function (e) { e.stopPropagation(); lightboxPrev(); });
  el('dbmLightboxNext').addEventListener('click', function (e) { e.stopPropagation(); lightboxNext(); });
  el('dbmLightbox').addEventListener('click', function (e) { if (e.target === this) closeLightbox(); });
  document.addEventListener('keydown', function (e) {
    if (!el('dbmLightbox').classList.contains('show')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') lightboxPrev();
    if (e.key === 'ArrowRight') lightboxNext();
  });

  // ---------- Instantiate the two galleries ----------
  var photoGallery = createGalleryController({
    shootTable: 'shoots', itemTable: 'photos', itemShootFk: 'shoot_id', coverFk: 'cover_photo_id',
    bucket: 'photos', mediaType: 'image', sectionName: 'photo',
    els: {
      gallery: 'dbmGallery', loading: 'dbmLoading', empty: 'dbmEmpty', filterAttr: 'data-filter',
      countPrefix: 'cnt-', uploadBtn: 'dbmUploadBtn', organizeBtn: 'dbmOrganizeBtn', organizeHint: 'dbmOrganizeHint',
      mergeBtn: 'dbmMergeBtn', mergeCount: 'dbmMergeCount', uploadModal: 'dbmModalBackdrop', fileInput: 'dbmFileInput',
      catSelect: 'dbmCatSelect', shootSelect: 'dbmShootSelect', saveUpload: 'dbmSaveUpload', cancelUpload: 'dbmCancelUpload',
      uploadStatus: 'dbmUploadStatus', coverModal: 'dbmCoverModalBackdrop', coverGrid: 'dbmCoverGrid', cancelCover: 'dbmCancelCover'
    }
  });

  var videoGallery = createGalleryController({
    shootTable: 'video_shoots', itemTable: 'videos', itemShootFk: 'shoot_id', coverFk: 'cover_video_id',
    bucket: 'videos', mediaType: 'video', sectionName: 'video',
    els: {
      gallery: 'dbmVideoGallery', loading: 'dbmVideoLoading', empty: 'dbmVideoEmpty', filterAttr: 'data-vfilter',
      countPrefix: 'vcnt-', uploadBtn: 'dbmUploadVideoBtn', organizeBtn: 'dbmOrganizeVideoBtn', organizeHint: 'dbmOrganizeVideoHint',
      mergeBtn: 'dbmMergeVideoBtn', mergeCount: 'dbmMergeVideoCount', uploadModal: 'dbmVideoModalBackdrop', fileInput: 'dbmVideoFileInput',
      catSelect: 'dbmVideoCatSelect', shootSelect: 'dbmVideoShootSelect', saveUpload: 'dbmSaveVideoUpload', cancelUpload: 'dbmCancelVideoUpload',
      uploadStatus: 'dbmVideoUploadStatus', coverModal: 'dbmVideoCoverModalBackdrop', coverGrid: 'dbmVideoCoverGrid', cancelCover: 'dbmCancelVideoCover'
    }
  });

  // ---------- Site settings (editable text + colors) ----------
  var siteSettings = {};

  async function loadSiteSettings() {
    var { data, error } = await supabase.from('site_settings').select('*');
    if (error) { console.error('Could not load site settings', error); return; }
    siteSettings = {};
    (data || []).forEach(function (row) { siteSettings[row.key] = row.value; });
    applySiteSettings();
  }

  function applySiteSettings() {
    if (siteSettings.hero_eyebrow) el('dbmHeroEyebrow').textContent = siteSettings.hero_eyebrow;
    if (siteSettings.hero_heading) {
      var parts = siteSettings.hero_heading.split('|');
      el('dbmHeroHeading').innerHTML = parts.map(function (p) { return p.trim(); }).join('<br>');
    }
    if (siteSettings.hero_body) el('dbmHeroBody').textContent = siteSettings.hero_body;
    if (siteSettings.contact_heading) el('dbmContactHeading').textContent = siteSettings.contact_heading;
    if (siteSettings.contact_body) el('dbmContactBody').textContent = siteSettings.contact_body;

    if (siteSettings.color_paper) document.body.style.setProperty('--paper', siteSettings.color_paper);
    if (siteSettings.color_ink) document.body.style.setProperty('--ink', siteSettings.color_ink);
    if (siteSettings.color_accent) document.body.style.setProperty('--accent', siteSettings.color_accent);

    if (siteSettings.social_instagram) {
      el('dbmContactInstagram').href = siteSettings.social_instagram;
      el('dbmFollowInstagram').href = siteSettings.social_instagram;
      el('dbmSocialInstagram').href = siteSettings.social_instagram;
    }
    if (siteSettings.social_tiktok) el('dbmSocialTiktok').href = siteSettings.social_tiktok;
    if (siteSettings.social_facebook) el('dbmSocialFacebook').href = siteSettings.social_facebook;
  }

  function openSettingsModal() {
    el('dbmSetHeroEyebrow').value = siteSettings.hero_eyebrow || '';
    el('dbmSetHeroHeading').value = siteSettings.hero_heading || '';
    el('dbmSetHeroBody').value = siteSettings.hero_body || '';
    el('dbmSetContactHeading').value = siteSettings.contact_heading || '';
    el('dbmSetContactBody').value = siteSettings.contact_body || '';
    el('dbmSetColorPaper').value = siteSettings.color_paper || '#f5f5f0';
    el('dbmSetColorInk').value = siteSettings.color_ink || '#0a0a0a';
    el('dbmSetColorAccent').value = siteSettings.color_accent || '#8c1d18';
    el('dbmSetSocialInstagram').value = siteSettings.social_instagram || '';
    el('dbmSetSocialTiktok').value = siteSettings.social_tiktok || '';
    el('dbmSetSocialFacebook').value = siteSettings.social_facebook || '';
    el('dbmSettingsStatus').textContent = '';
    el('dbmSettingsModalBackdrop').classList.add('show');
  }

  el('dbmSiteSettingsBtn').addEventListener('click', openSettingsModal);
  el('dbmCancelSettings').addEventListener('click', function () { el('dbmSettingsModalBackdrop').classList.remove('show'); });
  el('dbmSettingsModalBackdrop').addEventListener('click', function (e) { if (e.target === this) this.classList.remove('show'); });

  el('dbmSaveSettings').addEventListener('click', async function () {
    var status = el('dbmSettingsStatus');
    status.textContent = 'Saving…';

    var updates = {
      hero_eyebrow: el('dbmSetHeroEyebrow').value,
      hero_heading: el('dbmSetHeroHeading').value,
      hero_body: el('dbmSetHeroBody').value,
      contact_heading: el('dbmSetContactHeading').value,
      contact_body: el('dbmSetContactBody').value,
      color_paper: el('dbmSetColorPaper').value,
      color_ink: el('dbmSetColorInk').value,
      color_accent: el('dbmSetColorAccent').value,
      social_instagram: el('dbmSetSocialInstagram').value,
      social_tiktok: el('dbmSetSocialTiktok').value,
      social_facebook: el('dbmSetSocialFacebook').value
    };

    try {
      var rows = Object.keys(updates).map(function (key) { return { key: key, value: updates[key] }; });
      var { error } = await supabase.from('site_settings').upsert(rows);
      if (error) throw error;
      siteSettings = Object.assign({}, siteSettings, updates);
      applySiteSettings();
      status.textContent = 'Saved.';
      setTimeout(function () { el('dbmSettingsModalBackdrop').classList.remove('show'); status.textContent = ''; }, 700);
    } catch (err) {
      console.error(err);
      status.textContent = 'Could not save: ' + (err.message || 'unknown error');
    }
  });

  // ---------- Testimonials ----------
  var testimonialsCache = [];

  async function loadTestimonials() {
    var { data, error } = await supabase.from('testimonials').select('*').order('display_order', { ascending: true });
    if (error) { console.error(error); return; }
    testimonialsCache = data || [];

    var list = el('dbmTestimonialsList');
    if (list) {
      list.innerHTML = '';
      testimonialsCache.forEach(function (t) {
        var card = document.createElement('div');
        card.className = 'dbm-testimonial-card';
        card.innerHTML = '<p class="dbm-testimonial-quote">&ldquo;' + t.quote + '&rdquo;</p><p class="dbm-testimonial-name">' + t.client_name + '</p>';
        list.appendChild(card);
      });
    }
  }

  function renderTestimonialsEditList() {
    var container = el('dbmTestimonialsEditList');
    container.innerHTML = '';
    testimonialsCache.forEach(function (t, idx) {
      var row = document.createElement('div');
      row.className = 'dbm-testimonial-edit-row';
      row.innerHTML =
        '<label>Client name</label>' +
        '<input type="text" class="dbm-t-name" value="' + (t.client_name || '').replace(/"/g, '&quot;') + '">' +
        '<label>Quote</label>' +
        '<textarea class="dbm-t-quote" rows="3">' + (t.quote || '') + '</textarea>' +
        '<div class="dbm-testimonial-row-actions">' +
          '<button class="dbm-testimonial-move-btn dbm-t-up" ' + (idx === 0 ? 'disabled' : '') + '>&#8593; Move up</button>' +
          '<button class="dbm-testimonial-move-btn dbm-t-down" ' + (idx === testimonialsCache.length - 1 ? 'disabled' : '') + '>&#8595; Move down</button>' +
          '<button class="dbm-testimonial-save-btn dbm-t-save">Save</button>' +
          '<button class="dbm-testimonial-delete-btn dbm-t-delete">Delete</button>' +
        '</div>';

      row.querySelector('.dbm-t-save').addEventListener('click', async function () {
        var name = row.querySelector('.dbm-t-name').value.trim();
        var quote = row.querySelector('.dbm-t-quote').value.trim();
        if (!name || !quote) { el('dbmTestimonialsStatus').textContent = 'Name and quote cannot be empty.'; return; }
        el('dbmTestimonialsStatus').textContent = 'Saving…';
        var { error } = await supabase.from('testimonials').update({ client_name: name, quote: quote }).eq('id', t.id);
        if (error) { el('dbmTestimonialsStatus').textContent = 'Could not save: ' + error.message; return; }
        t.client_name = name; t.quote = quote;
        el('dbmTestimonialsStatus').textContent = 'Saved.';
        await loadTestimonials();
        setTimeout(function () { el('dbmTestimonialsStatus').textContent = ''; }, 1200);
      });

      row.querySelector('.dbm-t-delete').addEventListener('click', async function () {
        var confirmed = confirm('Delete this testimonial permanently?');
        if (!confirmed) return;
        await supabase.from('testimonials').delete().eq('id', t.id);
        await loadTestimonials();
        renderTestimonialsEditList();
      });

      row.querySelector('.dbm-t-up').addEventListener('click', async function () {
        await moveTestimonial(idx, -1);
      });
      row.querySelector('.dbm-t-down').addEventListener('click', async function () {
        await moveTestimonial(idx, 1);
      });

      container.appendChild(row);
    });
  }

  async function moveTestimonial(idx, offset) {
    var newIdx = idx + offset;
    if (newIdx < 0 || newIdx >= testimonialsCache.length) return;
    var reordered = testimonialsCache.slice();
    var moved = reordered.splice(idx, 1)[0];
    reordered.splice(newIdx, 0, moved);
    var updates = reordered.map(function (t, i) {
      return supabase.from('testimonials').update({ display_order: i }).eq('id', t.id);
    });
    await Promise.all(updates);
    await loadTestimonials();
    renderTestimonialsEditList();
  }

  el('dbmTestimonialsBtn').addEventListener('click', function () {
    el('dbmTestimonialsStatus').textContent = '';
    renderTestimonialsEditList();
    el('dbmTestimonialsModalBackdrop').classList.add('show');
  });
  el('dbmCancelTestimonials').addEventListener('click', function () { el('dbmTestimonialsModalBackdrop').classList.remove('show'); });
  el('dbmTestimonialsModalBackdrop').addEventListener('click', function (e) { if (e.target === this) this.classList.remove('show'); });

  el('dbmAddTestimonialBtn').addEventListener('click', async function () {
    var maxOrder = testimonialsCache.reduce(function (m, t) { return Math.max(m, t.display_order || 0); }, -1);
    var { error } = await supabase.from('testimonials').insert({
      client_name: 'New client',
      quote: 'Edit this quote…',
      display_order: maxOrder + 1
    });
    if (error) { el('dbmTestimonialsStatus').textContent = 'Could not add: ' + error.message; return; }
    await loadTestimonials();
    renderTestimonialsEditList();
  });

  // ---------- Contact form ----------
  el('dbmContactForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var status = el('dbmContactFormStatus');
    var submitBtn = el('dbmContactSubmit');
    var name = el('dbmContactName').value.trim();
    var email = el('dbmContactEmail').value.trim();
    var message = el('dbmContactMessage').value.trim();

    if (!name || !email || !message) {
      status.textContent = 'Please fill in every field.';
      return;
    }

    submitBtn.disabled = true;
    status.textContent = 'Sending…';

    try {
      var { data, error } = await supabase.functions.invoke('send-contact-email', {
        body: { name: name, email: email, message: message }
      });
      if (error) throw error;
      status.textContent = "Thanks — I'll get back to you soon.";
      el('dbmContactForm').reset();
    } catch (err) {
      console.error(err);
      status.textContent = 'Something went wrong sending that. Please try emailing directly instead.';
    } finally {
      submitBtn.disabled = false;
    }
  });

  // ---------- Sections (Work / Videos / FAQ / Contact) ----------
  function dbmShowSection(name) {
    el('dbmWorkSection').style.display = name === 'work' ? 'block' : 'none';
    el('dbmVideosSection').style.display = name === 'videos' ? 'block' : 'none';
    el('dbmFaqSection').style.display = name === 'faq' ? 'block' : 'none';
    el('dbmContactSection').style.display = name === 'contact' ? 'block' : 'none';
    document.querySelector('.dbm-hero').style.display = name === 'work' ? 'block' : 'none';
    document.querySelectorAll('.dbm-nav button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-section') === name);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  window.dbmShowSection = dbmShowSection;

  el('dbmLogoHome').addEventListener('click', function () { dbmShowSection('work'); });
  el('dbmLogoHome').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dbmShowSection('work'); }
  });
  document.querySelectorAll('.dbm-nav button').forEach(function (btn) {
    btn.addEventListener('click', function () { dbmShowSection(btn.getAttribute('data-section')); });
  });
  el('dbmBurger').addEventListener('click', function () {
    document.querySelector('.dbm-nav').classList.toggle('mobile-open');
  });
  document.querySelectorAll('.dbm-nav button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelector('.dbm-nav').classList.remove('mobile-open');
    });
  });

  var faqList = el('dbmFaqList');
  FAQS.forEach(function (item) {
    var div = document.createElement('div');
    div.className = 'dbm-faq-item';
    div.innerHTML = '<button class="dbm-faq-q"><span>' + item.q + '</span><span class="dbm-faq-q-icon">+</span></button><div class="dbm-faq-a"><p>' + item.a + '</p></div>';
    div.querySelector('.dbm-faq-q').addEventListener('click', function () { div.classList.toggle('open'); });
    faqList.appendChild(div);
  });

  // ---------- Boot ----------
  (async function init() {
    await checkSession();
    await loadSiteSettings();
    await loadTestimonials();
    await photoGallery.loadShoots();
    await videoGallery.loadShoots();
  })();
})();
