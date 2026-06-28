// Dream Big Media portfolio — Supabase-backed version
// Same look and interactions as the original, but shoots/photos live in a
// real database instead of being hardcoded, and admin actions require login.

(function () {
  var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  var STORAGE_BUCKET = 'photos';

  var FAQS = [
    { q: 'How far in advance should I book?', a: 'For events and weddings, 2-4 weeks ahead is ideal so we can lock in your date. For portrait or fashion shoots, a few days notice usually works, but earlier is always better, especially for weekends.' },
    { q: 'What happens after the shoot?', a: 'Standard delivery is 3-4 days for photo, 7 days for video. You will get a private online gallery to view and download your edited files. Next-day rush delivery is available for an extra fee.' },
    { q: 'Do you travel outside Nottingham?', a: 'Yes. Prices may change depending on distance and travel time required, this is always discussed and agreed with you beforehand, so there are no surprises.' },
    { q: 'How does payment work?', a: 'A 50% deposit secures your date and is non-refundable, though you can reschedule for free if you give 48 hours notice or more. The remaining balance is due at the end of the session.' },
    { q: 'Can I get the raw, unedited footage?', a: 'Raw footage is available on request. For video projects, raw handover is priced at 2x the hourly shoot rate, since it involves additional file preparation.' },
    { q: 'What kind of work do you take on?', a: 'Events, portraits, and fashion/editorial shoots are my main focus. If you have something a bit different in mind, reach out and we can talk through it.' }
  ];

  function el(id) { return document.getElementById(id); }

  // ---------- State ----------
  var shoots = [];           // [{ id, category, display_order, cover_photo_id, photos: [...] }]
  var currentFilter = 'all';
  var isAdmin = false;
  var organizeMode = false;
  var mergeSelection = [];

  // ---------- Auth ----------
  function refreshAdminUI() {
    el('dbmAdminBar').classList.toggle('show', isAdmin);
    el('dbmUploadBtn').style.display = isAdmin ? 'inline-flex' : 'none';
    el('dbmOrganizeBtn').style.display = isAdmin ? 'inline-block' : 'none';
    el('dbmLoginTrigger').style.display = isAdmin ? 'none' : 'flex';
    if (!isAdmin) {
      organizeMode = false;
      mergeSelection = [];
      el('dbmOrganizeHint').style.display = 'none';
    }
    updateMergeButton();
  }

  supabase.auth.onAuthStateChange(function (event, session) {
    isAdmin = !!session;
    refreshAdminUI();
    renderGallery();
  });

  async function checkSession() {
    var { data } = await supabase.auth.getSession();
    isAdmin = !!data.session;
    refreshAdminUI();
  }

  el('dbmLoginTrigger').addEventListener('click', function () {
    el('dbmLoginOverlay').classList.add('show');
  });
  el('dbmLoginCancel').addEventListener('click', function () {
    el('dbmLoginOverlay').classList.remove('show');
  });
  el('dbmLoginOverlay').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('show');
  });
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
  el('dbmLogoutBtn').addEventListener('click', async function () {
    await supabase.auth.signOut();
  });

  // ---------- Data loading ----------
  function storagePublicUrl(path) {
    var { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async function loadShoots() {
    el('dbmLoading').style.display = 'block';
    var { data: shootRows, error: shootErr } = await supabase
      .from('shoots')
      .select('*')
      .order('display_order', { ascending: true });

    var { data: photoRows, error: photoErr } = await supabase
      .from('photos')
      .select('*')
      .order('display_order', { ascending: true });

    el('dbmLoading').style.display = 'none';

    if (shootErr || photoErr) {
      console.error(shootErr || photoErr);
      el('dbmEmpty').textContent = 'Could not load the gallery. Please refresh.';
      el('dbmEmpty').style.display = 'block';
      return;
    }

    var photosByShoot = {};
    (photoRows || []).forEach(function (p) {
      p.url = storagePublicUrl(p.storage_path);
      if (!photosByShoot[p.shoot_id]) photosByShoot[p.shoot_id] = [];
      photosByShoot[p.shoot_id].push(p);
    });

    shoots = (shootRows || []).map(function (s) {
      var photos = photosByShoot[s.id] || [];
      var cover = photos.find(function (p) { return p.id === s.cover_photo_id; }) || photos[0];
      return {
        id: s.id,
        category: s.category,
        display_order: s.display_order,
        cover_photo_id: s.cover_photo_id,
        cover: cover,
        photos: photos
      };
    }).filter(function (s) { return s.photos.length > 0; });

    renderGallery();
    populateShootSelect();
  }

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

  
  function renderCounts() {
    var counts = { all: shoots.length, events: 0, portraits: 0, fashion: 0 };
    shoots.forEach(function (s) { if (counts[s.category] !== undefined) counts[s.category]++; });
    el('cnt-all').textContent = counts.all;
    el('cnt-events').textContent = counts.events;
    el('cnt-portraits').textContent = counts.portraits;
    el('cnt-fashion').textContent = counts.fashion;
  }

  var dragSrcId = null;

  function renderGallery() {
    var gallery = el('dbmGallery');
    var filtered = currentFilter === 'all' ? shoots : shoots.filter(function (s) { return s.category === currentFilter; });
    gallery.innerHTML = '';
    el('dbmEmpty').style.display = (filtered.length === 0 && shoots.length > 0) ? 'block' : 'none';

    filtered.forEach(function (shoot, idx) {
      var cover = shoot.cover;
      if (!cover) return;
      var card = document.createElement('div');
      card.className = 'dbm-card' + (organizeMode ? ' organize-mode' : '');
      card.setAttribute('data-shoot-id', shoot.id);
      if (mergeSelection.indexOf(shoot.id) !== -1) card.classList.add('merge-selected');

      card.innerHTML =
        '<img src="' + cover.url + '" alt="' + shoot.category + ' photo" loading="lazy">' +
        '<span class="dbm-card-tag">' + shoot.category + '</span>' +
        (organizeMode ? '<button class="dbm-card-cover-btn" aria-label="Change cover photo"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></button>' : '') +
        (organizeMode ? '<div class="dbm-card-move"><button class="dbm-move-left" aria-label="Move earlier" ' + (idx === 0 ? 'disabled' : '') + '>&#8249;</button><button class="dbm-move-right" aria-label="Move later" ' + (idx === filtered.length - 1 ? 'disabled' : '') + '>&#8250;</button></div>' : '');

      var imgEl = card.querySelector('img');
      imgEl.addEventListener('click', function () {
        if (organizeMode) {
          toggleMergeSelection(shoot.id, card);
        } else {
          openLightbox(shoot, cover);
        }
      });

      var coverBtn = card.querySelector('.dbm-card-cover-btn');
      if (coverBtn) {
        coverBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          openCoverPicker(shoot);
        });
      }

      var moveLeftBtn = card.querySelector('.dbm-move-left');
      var moveRightBtn = card.querySelector('.dbm-move-right');
      if (moveLeftBtn) moveLeftBtn.addEventListener('click', function (e) { e.stopPropagation(); moveShoot(shoot.id, -1, filtered); });
      if (moveRightBtn) moveRightBtn.addEventListener('click', function (e) { e.stopPropagation(); moveShoot(shoot.id, 1, filtered); });

      if (organizeMode) {
        card.draggable = true;
        card.addEventListener('dragstart', function () { dragSrcId = shoot.id; card.classList.add('dragging'); });
        card.addEventListener('dragend', function () { card.classList.remove('dragging'); });
        card.addEventListener('dragover', function (e) { e.preventDefault(); card.classList.add('drag-over'); });
        card.addEventListener('dragleave', function () { card.classList.remove('drag-over'); });
        card.addEventListener('drop', function (e) {
          e.preventDefault();
          card.classList.remove('drag-over');
          if (!dragSrcId || dragSrcId === shoot.id) return;
          reorderShoots(dragSrcId, shoot.id, filtered);
        });
      }

      gallery.appendChild(card);
    });

    renderCounts();
  }

  // ---------- Reordering (writes back to Supabase) ----------
  async function persistOrder(orderedShoots) {
    var updates = orderedShoots.map(function (s, idx) {
      return supabase.from('shoots').update({ display_order: idx }).eq('id', s.id);
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

  // ---------- Cover picker ----------
  function openCoverPicker(shoot) {
    var grid = el('dbmCoverGrid');
    grid.innerHTML = '';
    shoot.photos.forEach(function (photo) {
      var pick = document.createElement('div');
      pick.className = 'dbm-cover-pick' + (photo.id === shoot.cover.id ? ' is-current' : '');
      pick.innerHTML = '<img src="' + photo.url + '" alt="cover option">';
      pick.addEventListener('click', async function () {
        shoot.cover = photo;
        shoot.cover_photo_id = photo.id;
        el('dbmCoverModalBackdrop').classList.remove('show');
        renderGallery();
        await supabase.from('shoots').update({ cover_photo_id: photo.id }).eq('id', shoot.id);
      });
      grid.appendChild(pick);
    });
    el('dbmCoverModalBackdrop').classList.add('show');
  }
  el('dbmCancelCover').addEventListener('click', function () { el('dbmCoverModalBackdrop').classList.remove('show'); });
  el('dbmCoverModalBackdrop').addEventListener('click', function (e) { if (e.target === this) this.classList.remove('show'); });

  // ---------- Organize mode + merge ----------
  el('dbmOrganizeBtn').addEventListener('click', function () {
    organizeMode = !organizeMode;
    this.classList.toggle('active', organizeMode);
    el('dbmOrganizeHint').style.display = organizeMode ? 'block' : 'none';
    if (!organizeMode) mergeSelection = [];
    updateMergeButton();
    renderGallery();
  });

  function toggleMergeSelection(id, cardEl) {
    var idx = mergeSelection.indexOf(id);
    if (idx === -1) { mergeSelection.push(id); cardEl.classList.add('merge-selected'); }
    else { mergeSelection.splice(idx, 1); cardEl.classList.remove('merge-selected'); }
    updateMergeButton();
  }

  function updateMergeButton() {
    var btn = el('dbmMergeBtn');
    el('dbmMergeCount').textContent = mergeSelection.length;
    btn.style.display = (isAdmin && organizeMode) ? 'inline-block' : 'none';
    btn.disabled = mergeSelection.length < 2;
  }

  el('dbmMergeBtn').addEventListener('click', async function () {
    if (mergeSelection.length < 2) return;
    var targetId = mergeSelection[0];
    var targetShoot = shoots.find(function (s) { return s.id === targetId; });
    var othersIds = mergeSelection.slice(1);

    // Move every photo from the other shoots into the target shoot, then delete the now-empty shoots.
    for (var i = 0; i < othersIds.length; i++) {
      var otherId = othersIds[i];
      await supabase.from('photos').update({ shoot_id: targetId }).eq('shoot_id', otherId);
      await supabase.from('shoots').delete().eq('id', otherId);
    }

    mergeSelection = [];
    updateMergeButton();
    await loadShoots();
  });

  // ---------- Lightbox ----------
  var lightboxSet = [];
  var lightboxIndex = 0;

  function showLightboxImage() {
    var img = lightboxSet[lightboxIndex];
    el('dbmLightboxImg').src = img.url;
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
  function openLightbox(shoot, photo) {
    lightboxSet = shoot.photos;
    lightboxIndex = lightboxSet.findIndex(function (p) { return p.id === photo.id; });
    if (lightboxIndex < 0) lightboxIndex = 0;
    showLightboxImage();
    el('dbmLightbox').classList.add('show');
  }
  function closeLightbox() {
    el('dbmLightbox').classList.remove('show');
    el('dbmLightboxImg').src = '';
    lightboxSet = [];
    lightboxIndex = 0;
  }
  function lightboxPrev() { if (!lightboxSet.length) return; lightboxIndex = (lightboxIndex - 1 + lightboxSet.length) % lightboxSet.length; showLightboxImage(); }
  function lightboxNext() { if (!lightboxSet.length) return; lightboxIndex = (lightboxIndex + 1) % lightboxSet.length; showLightboxImage(); }

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

  // ---------- Filters ----------
  document.querySelectorAll('.dbm-filter').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.dbm-filter').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter');
      renderGallery();
    });
  });

  // ---------- Sections (Work / FAQ / Contact) ----------
  function dbmShowSection(name) {
    el('dbmWorkSection').style.display = name === 'work' ? 'block' : 'none';
    el('dbmFaqSection').style.display = name === 'faq' ? 'block' : 'none';
    el('dbmContactSection').style.display = name === 'contact' ? 'block' : 'none';
    document.querySelector('.dbm-hero').style.display = name === 'work' ? 'block' : 'none';
    document.querySelectorAll('.dbm-nav button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-section') === name);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  window.dbmShowSection = dbmShowSection;
  document.querySelectorAll('.dbm-nav button').forEach(function (btn) {
    btn.addEventListener('click', function () { dbmShowSection(btn.getAttribute('data-section')); });
  });
  el('dbmBurger').addEventListener('click', function () {
    var nav = document.querySelector('.dbm-nav');
    var open = nav.style.display === 'flex';
    nav.style.display = open ? 'none' : 'flex';
    nav.style.flexDirection = 'column';
    nav.style.position = 'absolute';
    nav.style.top = '60px';
    nav.style.right = '16px';
    nav.style.background = '#f5f5f0';
    nav.style.border = '2px solid #0a0a0a';
    nav.style.padding = '12px 20px';
    nav.style.gap = '12px';
  });

  var faqList = el('dbmFaqList');
  FAQS.forEach(function (item) {
    var div = document.createElement('div');
    div.className = 'dbm-faq-item';
    div.innerHTML = '<button class="dbm-faq-q"><span>' + item.q + '</span><span class="dbm-faq-q-icon">+</span></button><div class="dbm-faq-a"><p>' + item.a + '</p></div>';
    div.querySelector('.dbm-faq-q').addEventListener('click', function () { div.classList.toggle('open'); });
    faqList.appendChild(div);
  });

  // ---------- Upload modal ----------
  var modalBackdrop = el('dbmModalBackdrop');
  el('dbmUploadBtn').addEventListener('click', function () {
    el('dbmUploadStatus').textContent = '';
    populateShootSelect();
    modalBackdrop.classList.add('show');
  });
  el('dbmCancelUpload').addEventListener('click', function () {
    modalBackdrop.classList.remove('show');
    el('dbmFileInput').value = '';
  });
  modalBackdrop.addEventListener('click', function (e) { if (e.target === this) this.classList.remove('show'); });

  function populateShootSelect() {
    var select = el('dbmShootSelect');
    var currentVal = select.value;
    select.innerHTML = '<option value="__new__">+ Create new shoot</option>';
    shoots.forEach(function (s) {
      var opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.category + ' — ' + s.photos.length + ' photo(s)';
      select.appendChild(opt);
    });
    if (currentVal) select.value = currentVal;
  }

  function fileExt(filename) {
    var m = /\.([a-zA-Z0-9]+)$/.exec(filename);
    return m ? m[1].toLowerCase() : 'jpg';
  }

  el('dbmSaveUpload').addEventListener('click', async function () {
    var fileInput = el('dbmFileInput');
    var category = el('dbmCatSelect').value;
    var shootChoice = el('dbmShootSelect').value;
    var status = el('dbmUploadStatus');

    if (!fileInput.files || !fileInput.files.length) {
      status.textContent = 'Choose at least one image.';
      return;
    }
    status.textContent = 'Uploading…';

    try {
      var shootId = shootChoice;
      if (shootChoice === '__new__') {
        var maxOrder = shoots.reduce(function (m, s) { return Math.max(m, s.display_order || 0); }, -1);
        var { data: newShoot, error: shootErr } = await supabase
          .from('shoots')
          .insert({ category: category, display_order: maxOrder + 1 })
          .select()
          .single();
        if (shootErr) throw shootErr;
        shootId = newShoot.id;
      }

      var files = Array.from(fileInput.files);
      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var path = shootId + '/' + Date.now() + '-' + i + '.' + fileExt(file.name);
        var { error: uploadErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file);
        if (uploadErr) throw uploadErr;

        var { data: photoRow, error: photoErr } = await supabase
          .from('photos')
          .insert({ shoot_id: shootId, storage_path: path, display_order: i })
          .select()
          .single();
        if (photoErr) throw photoErr;

        if (shootChoice === '__new__' && i === 0) {
          await supabase.from('shoots').update({ cover_photo_id: photoRow.id }).eq('id', shootId);
        }
      }

      status.textContent = 'Added.';
      await loadShoots();
      setTimeout(function () {
        modalBackdrop.classList.remove('show');
        fileInput.value = '';
        status.textContent = '';
      }, 700);
    } catch (err) {
      console.error(err);
      status.textContent = 'Upload failed: ' + (err.message || 'try a smaller file.');
    }
  });

  // ---------- Boot ----------
  (async function init() {
    await checkSession();
    await loadSiteSettings();
    await loadShoots();
  })();
})();
