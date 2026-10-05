(() => {
  'use strict';
  const projects = window.PORTFOLIO_PROJECTS || [];
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const grid = $('#project-grid');
  const projectDialog = $('#project-dialog');
  const lightbox = $('#lightbox');
  const header = $('#site-header');
  const menu = $('#mobile-menu');
  const menuToggle = $('#menu-toggle');
  let activeProject = null;
  let activeImage = 0;
  let lastTrigger = null;
  let menuOpen = false;
  let dialogWanted = false;

  // A critically damped spring retargets from its current position AND velocity.
  // Rapid reversals never restart from the previous destination.
  function spring(render, initial = 0) {
    let value = initial, velocity = 0, target = initial, frame = 0, previous = 0, onRest;
    const draw = now => {
      const dt = Math.min((now - previous) / 1000 || 1 / 60, 1 / 30);
      previous = now;
      const omega = 22;
      const displacement = value - target;
      const decay = Math.exp(-omega * dt);
      const carried = velocity + omega * displacement;
      value = target + (displacement + carried * dt) * decay;
      velocity = (velocity - omega * carried * dt) * decay;
      if (Math.abs(value - target) < .0005 && Math.abs(velocity) < .005) {
        value = target; velocity = 0; frame = 0; render(value); onRest?.(); return;
      }
      render(value); frame = requestAnimationFrame(draw);
    };
    return {
      to(next, rest) {
        target = next; onRest = rest;
        if (motion.matches) {
          cancelAnimationFrame(frame); frame = 0; value = target; velocity = 0;
          render(value); onRest?.(); return;
        }
        if (!frame) { previous = performance.now(); frame = requestAnimationFrame(draw); }
      },
      finish() { cancelAnimationFrame(frame); frame = 0; value = target; velocity = 0; render(value); onRest?.(); }
    };
  }
  const menuSpring = spring(value => {
    menu.style.opacity = value;
    menu.style.transform = `translateY(${(1 - value) * -12}px)`;
  });
  const dialogSpring = spring(value => {
    projectDialog.style.opacity = value;
    projectDialog.style.transform = `translateY(${(1 - value) * 32}px)`;
  });
  motion.addEventListener('change', () => { if (motion.matches) { menuSpring.finish(); dialogSpring.finish(); } });

  const imageMarkup = (image, options = {}) => {
    const {sizes = '(max-width: 700px) 92vw, 48vw', eager = false} = options;
    const srcset = image.small && image.width > image.smallWidth
      ? ` srcset="${escape(image.small)} ${image.smallWidth}w, ${escape(image.src)} ${image.width}w" sizes="${sizes}"` : '';
    return `<img src="${escape(image.src)}"${srcset} alt="${escape(image.alt)}"${image.width ? ` width="${image.width}" height="${image.height}"` : ''} loading="${eager ? 'eager' : 'lazy'}" decoding="async">`;
  };
  const projectLink = project => `#project/${project.id}`;
  const externalLink = (link, className = 'text-link mono') => `<a class="${className}" href="${escape(link.url)}" target="_blank" rel="noopener noreferrer">${escape(link.label)} <span aria-hidden="true">↗</span><span class="visually-hidden">（另開視窗）</span></a>`;

  grid.innerHTML = projects.map(project => {
    const shandong = project.id === 'shandong';
    const destination = shandong ? project.links[0].url : projectLink(project);
    const external = shandong ? ' target="_blank" rel="noopener noreferrer"' : '';
    const label = shandong ? `${project.titleZh}：觀看紀錄片（另開視窗）` : `查看 ${project.title} ${project.titleZh}`;
    const badge = project.id === 'way-back' ? 'AWARD-WINNING FILM' : shandong ? 'DOCUMENTARY / 2026' : project.status && /Ongoing|進行中|長期/i.test(project.status) ? 'ONGOING' : '';
    const supporting = project.category === 'film' ? project.images.filter(image => image.kind !== 'poster').slice(0, 3) : [];
    return `<article class="project-card" data-category="${escape(project.category)}" data-project="${escape(project.id)}" style="--card-order:${projects.indexOf(project)}">
      <div class="card-copy">
        <div class="card-topline mono"><span>${escape(project.number)} / ${escape(project.type).toUpperCase()}</span><span>${escape(project.year || '')}</span></div>
        <div class="card-heading"><h3><a href="${projectLink(project)}">${escape(project.title)}</a></h3><span class="title-zh">${escape(project.titleZh)}</span></div>
        ${badge ? `<span class="card-tag">${badge}</span>` : ''}
        <div class="card-copy-bottom"><p class="card-description">${escape(project.role || project.description)}</p>
        ${project.awards?.length ? `<p class="card-award">${escape(project.awards[0].event)}<br><strong>${escape(project.awards[0].result)}</strong></p>` : ''}
        ${shandong ? externalLink(project.links[0], 'card-secondary mono') : ''}
        <a class="text-link mono" href="${projectLink(project)}">EXPLORE PROJECT / 項目詳情 <span aria-hidden="true">↗</span></a></div>
      </div>
      <div class="card-media ${supporting.length ? 'has-stills' : ''}">
        <a class="card-image-link" href="${escape(destination)}"${external} aria-label="${escape(label)}">${imageMarkup(project.cover, {sizes:'(max-width: 700px) 88vw, 55vw'})}<span class="card-open" aria-hidden="true">${shandong ? '▷' : '↗'}</span></a>
        ${supporting.length ? `<div class="card-stills">${supporting.map((image,index) => `<a href="${projectLink(project)}" aria-label="查看 ${escape(project.title)} 靜幀 ${index+1}">${imageMarkup(image, {sizes:'(max-width: 700px) 34vw, 25vw'})}</a>`).join('')}<span class="mono">STILLS / 電影靜幀</span></div>` : ''}
      </div>
      <span class="card-scroll-cue mono" aria-hidden="true">SCROLL TO NEXT PERSPECTIVE ↓</span>
    </article>`;
  }).join('');
  $('#project-count').textContent = `${projects.length.toString().padStart(2, '0')} PROJECTS`;
  $('[data-filter="all"] sup').textContent = projects.length;

  // Keyboard navigation should reveal a chapter's natural position, even when
  // later sticky chapters currently cover it. Pointer scrolling stays native.
  let keyboardNavigation = false;
  document.addEventListener('keydown', event => { if (event.key === 'Tab') keyboardNavigation = true; });
  document.addEventListener('pointerdown', () => { keyboardNavigation = false; }, {passive:true});
  grid.addEventListener('focusin', event => {
    const card = event.target.closest('.project-card');
    if (!keyboardNavigation || !card || getComputedStyle(card).position !== 'sticky') return;
    const cards = $$('.project-card').filter(item => !item.hidden);
    const precedingHeight = cards.slice(0, cards.indexOf(card)).reduce((height, item) => height + item.offsetHeight, 0);
    const top = grid.getBoundingClientRect().top + window.scrollY + precedingHeight - header.offsetHeight;
    window.scrollTo({top, behavior:'instant'});
  });

  $$('.filter').forEach(button => button.addEventListener('click', () => {
    const category = button.dataset.filter;
    $$('.filter').forEach(filter => {
      const selected = filter === button;
      filter.classList.toggle('is-active', selected); filter.setAttribute('aria-pressed', String(selected));
    });
    let count = 0;
    $$('.project-card').forEach(card => { card.hidden = category !== 'all' && card.dataset.category !== category; if (!card.hidden) count++; });
    grid.classList.toggle('is-filtered', category !== 'all');
    $('#project-count').textContent = `${String(count).padStart(2, '0')} PROJECTS`;
    $('#filter-status').textContent = `顯示 ${count} 個${category === 'all' ? '' : button.textContent.trim()}作品`;
  }));

  function setMenu(open) {
    menuOpen = open;
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? '關閉導覽選單' : '開啟導覽選單');
    menuToggle.innerHTML = `${open ? 'CLOSE' : 'MENU'} <span aria-hidden="true">${open ? '−' : '+'}</span>`;
    header.classList.toggle('menu-open', open);
    if (open) { menu.hidden = false; menu.inert = false; }
    else { if (menu.contains(document.activeElement)) menuToggle.focus(); menu.inert = true; }
    menuSpring.to(open ? 1 : 0, () => { if (!menuOpen) menu.hidden = true; });
  }
  menuToggle.addEventListener('click', () => setMenu(!menuOpen));
  $$('a', menu).forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menuOpen) { setMenu(false); menuToggle.focus(); } });
  document.addEventListener('click', event => { if (menuOpen && !header.contains(event.target)) setMenu(false); });
  matchMedia('(min-width: 701px)').addEventListener('change', event => { if (event.matches) setMenu(false); });
  const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 70);
  window.addEventListener('scroll', updateHeader, {passive:true}); updateHeader();
  const sections = ['work', 'about', 'awards', 'contact'];
  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) $$('[data-nav]').forEach(link => {
        const current = link.dataset.nav === entry.target.id;
        link.classList.toggle('is-current', current);
        if (current) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
      }); });
    }, {rootMargin: '-15% 0px -70% 0px', threshold: 0});
    sections.forEach(id => sectionObserver.observe(document.getElementById(id)));
  }

  // Frame changes are user-controlled; no autoplay or forced full-screen movement.
  const frames = [
    {projectId:'way-back', src:'assets/way-back-still-01.webp', titleZh:'轉來', title:'The Way Back', type:'AI GENERATED FILM · AWARD WINNER'},
    {projectId:'twelve', src:'assets/twelve-still-03.webp', titleZh:'十二', title:'12 Twelve', type:'SHORT FILM · HONORABLE MENTION'},
    {projectId:'museum', src:'assets/museum-key-visual.webp', titleZh:'博物館文化周', title:'HKU School of Chinese', type:'WEB & VISUAL DESIGN · 香港大學中文學院'}
  ].map(frame => {
    const project = projects.find(project => project.id === frame.projectId);
    return {...frame, project, image:project?.images.find(image => image.src === frame.src)};
  });
  let frameRequest = 0;
  $$('.frame-button').forEach(button => button.addEventListener('click', () => {
    const item = frames[Number(button.dataset.frame)]; if (!item?.image) return;
    const request = ++frameRequest;
    const preload = new Image();
    preload.onload = () => {
      if (request !== frameRequest) return;
      const image = $('#hero-image');
      image.getAnimations().forEach(animation => animation.cancel());
      image.src = item.image.src; image.alt = item.image.alt;
      $('.hero-visual').style.setProperty('--hero-background', `url("${item.image.src}")`);
      const feature = $('.hero-feature');
      feature.href = projectLink(item.project);
      $('.mono', feature).textContent = `IN FOCUS — ${item.project.number}`;
      $('.feature-name', feature).innerHTML = `${escape(item.titleZh)} <i>${escape(item.title)}</i> <span aria-hidden="true">↗</span>`;
      $('.feature-type', feature).textContent = item.type;
      $('.hero-image-caption').textContent = `${item.title.toUpperCase()} / ${item.titleZh}`;
      if (!motion.matches) image.animate([{opacity:.5},{opacity:1}],{duration:250,easing:'ease-out'});
      $$('.frame-button').forEach(frame => { const active = frame === button; frame.classList.toggle('is-active', active); frame.setAttribute('aria-pressed', String(active)); });
    };
    preload.src = item.image.src;
  }));

  function detailMarkup(project) {
    const next = projects[(projects.indexOf(project) + 1) % projects.length];
    const facts = [['TYPE / 類別', project.type], ['PERIOD / 時間', project.period], ['ROLE / 職責', project.role], ['CLIENT / 機構', project.client], ['LOCATION / 地點', project.location], ['STATUS / 狀態', project.status]].filter(([, value]) => value);
    return `<header class="detail-header"><p class="mono">SELECTED WORK / ${escape(project.number)} — ${escape(project.type).toUpperCase()}</p><h2 id="project-title" tabindex="-1">${escape(project.title)}</h2><p class="detail-title-zh">${escape(project.titleZh)}</p></header>
      ${project.id === 'shandong' ? `<a href="${escape(project.links[0].url)}" target="_blank" rel="noopener noreferrer" aria-label="觀看嶺南大學山東交流團紀錄片（另開視窗）">` : ''}<img class="detail-hero" src="${escape(project.cover.src)}" alt="${escape(project.cover.alt)}" width="${project.cover.width}" height="${project.cover.height}">${project.id === 'shandong' ? '</a>' : ''}
      <div class="detail-info"><dl class="detail-facts">${facts.map(([key,value]) => `<div><dt>${key}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl><div class="detail-copy">${project.description ? `<p>${escape(project.description).replace(/\n/g,'<br>')}</p>` : ''}${project.metrics ? `<p class="detail-metric">${escape(project.metrics)}</p>` : ''}${project.awards?.length ? `<ul class="detail-awards">${project.awards.map(award => `<li><strong>${escape(award.event)}</strong><span>${escape(award.result)}</span></li>`).join('')}</ul>` : ''}${project.links?.length ? `<div class="detail-links">${project.links.map(link => externalLink(link)).join('')}</div>` : ''}${project.note ? `<p class="detail-note">${escape(project.note)}</p>` : ''}</div></div>
      <div class="gallery-header mono"><span>PROJECT GALLERY / 作品圖集</span><span>CLICK TO EXPLORE · 點擊放大</span></div>
      <div class="detail-gallery">${project.images.map((image,index) => `<figure class="gallery-item ${image.kind === 'poster' ? 'is-poster' : ''}"><button class="gallery-image-button" data-image="${index}" aria-label="放大：${escape(image.alt)}">${imageMarkup(image)}</button><figcaption>${String(index+1).padStart(2,'0')} / ${escape(image.alt)}</figcaption></figure>`).join('')}</div>
      <a class="next-project" href="${projectLink(next)}"><div><p class="mono">NEXT PERSPECTIVE / 下一件作品</p><h3>${escape(next.title)}</h3></div><span aria-hidden="true">↗</span></a>`;
  }
  function openProject(project) {
    dialogWanted = true;
    if (activeProject?.id !== project.id) {
      activeProject = project;
      $('#project-detail').innerHTML = detailMarkup(project);
      $$('.gallery-image-button', projectDialog).forEach(button => button.addEventListener('click', () => openImage(Number(button.dataset.image))));
      projectDialog.scrollTop = 0;
    }
    setMenu(false);
    if (!projectDialog.open) { document.body.classList.add('is-locked'); projectDialog.showModal(); }
    dialogSpring.to(1);
    $('#project-title').focus({preventScroll:true});
  }
  function hideProject() {
    dialogWanted = false;
    if (lightbox.open) lightbox.close();
    if (!projectDialog.open) return;
    dialogSpring.to(0, () => {
      if (dialogWanted) return;
      projectDialog.close(); document.body.classList.remove('is-locked'); activeProject = null;
      if (lastTrigger?.isConnected) lastTrigger.focus({preventScroll:true});
    });
  }
  function closeProject() {
    if (history.state?.portfolioProject) history.back();
    else { history.replaceState(null, '', '#work'); hideProject(); }
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#project/"]');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const project = projects.find(item => projectLink(item) === link.getAttribute('href'));
    if (!project) return;
    event.preventDefault();
    if (!projectDialog.open) {
      lastTrigger = link;
      history.pushState({portfolioProject:true},'',projectLink(project));
    } else history.replaceState(history.state, '', projectLink(project));
    openProject(project);
  });
  $('#close-project').addEventListener('click', closeProject);
  $('#dialog-back').addEventListener('click', event => { event.preventDefault(); closeProject(); });
  projectDialog.addEventListener('cancel', event => { event.preventDefault(); closeProject(); });
  function readRoute() {
    const project = projects.find(item => projectLink(item) === location.hash);
    if (project) openProject(project); else hideProject();
  }
  window.addEventListener('popstate', readRoute);
  window.addEventListener('hashchange', readRoute);
  readRoute();

  function updateImage() {
    if (!activeProject) return;
    const image = activeProject.images[activeImage];
    $('#lightbox-image').src = image.src; $('#lightbox-image').alt = image.alt;
    $('#lightbox-caption').textContent = image.alt;
    $('#lightbox-count').textContent = `${String(activeImage + 1).padStart(2,'0')} / ${String(activeProject.images.length).padStart(2,'0')}`;
    $('#previous-image').disabled = activeImage === 0;
    $('#next-image').disabled = activeImage === activeProject.images.length - 1;
  }
  function openImage(index) { activeImage = index; updateImage(); lightbox.showModal(); $('#close-lightbox').focus(); }
  function stepImage(step) { if (!activeProject) return; activeImage = Math.max(0, Math.min(activeProject.images.length-1, activeImage+step)); updateImage(); }
  $('#close-lightbox').addEventListener('click', () => lightbox.close());
  $('#previous-image').addEventListener('click', () => stepImage(-1));
  $('#next-image').addEventListener('click', () => stepImage(1));
  lightbox.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); stepImage(event.key === 'ArrowRight' ? 1 : -1); }
  });
})();
