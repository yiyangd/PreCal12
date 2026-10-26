(() => {
  'use strict';
  const catalog = JSON.parse(document.getElementById('course-catalog').textContent);
  const requested = new URLSearchParams(location.search).get('lang');
  let language = requested === 'zh' ? 'zh' : 'en';
  let unitFilter = 'all';
  let query = '';
  const $ = selector => document.querySelector(selector);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const pick = item => language === 'zh' ? item.title : item.en.title;
  const t = (zh, en) => language === 'zh' ? zh : en;
  const chapterPages = chapter => [
    ...chapter.extras.filter(page => page.kind === 'overview'), ...chapter.sections,
    ...chapter.extras.filter(page => page.kind !== 'overview')
  ];
  const readyItems = catalog.units.flatMap(unit => unit.chapters.flatMap(chapter =>
    chapterPages(chapter).filter(page => page.status === 'ready').map(page => ({unit, chapter, page}))
  ));
  const openUnits = new Set(readyItems.length ? readyItems.map(item => String(item.unit.number)) : ['1']);
  const text = {
    en: {
      skip:'Skip to course contents',brand:'STUDY HOME',welcome:'Start here.',
      intro:'Build understanding, one section at a time. Study key concepts, explore the textbook examples, and practise with step-by-step solutions.',
      available:'Ready to study',contents:'Textbook course map',
      catalogNote:'The full textbook outline is shown below. Open pages marked Ready; materials marked Planned will be added as their reviews are completed.',
      searchLabel:'Find a section or chapter material',expandAll:'Expand all units',empty:'No matching sections or chapter materials. Try a section number or another keyword.',reset:'Clear filters',
      source:'Course outline checked against the textbook contents, printed pages iv–v (PDF pages 5–6). Page numbers below are printed textbook pages.',
      footer:'Bilingual study notes · Textbook-based',placeholder:'Search title, chapter, section or review…',clearSearch:'Clear search',unitFilters:'Filter by unit',
      announcement:'Switched to English.',description:'Pre-Calculus 12 bilingual study home. Browse the textbook course map and open the reviewed learning pages available below.'
    },
    zh: {
      skip:'跳到课程目录',brand:'学习主页',welcome:'从这里开始。',
      intro:'从一节开始，逐步理解。学习知识点，跟随教材原例题，再通过配套练习与分步解析巩固方法。',
      available:'已完成的学习内容',contents:'教材课程目录',
      catalogNote:'下方保留完整教材目录。标为“可学习”的页面已经审核；标为“待制作”的内容将在完成审核后加入。',
      searchLabel:'查找章节或章末资料',expandAll:'展开所有单元',empty:'没有找到匹配的章节或资料。试试节号或其他关键词。',reset:'清除筛选',
      source:'目录已对照教材印刷页 iv–v（PDF 第 5–6 页）核对。下方页码均为教材印刷页码。',
      footer:'中英文学习笔记 · 依据教材',placeholder:'搜索标题、章号、节号或复习…',clearSearch:'清除搜索',unitFilters:'按单元筛选',
      announcement:'已切换为中文。',description:'微积分预备 12 中英文学习主页。浏览完整教材目录，打开已完成审核的学习页面。'
    }
  };
  const unitLabel = number => t(`第 ${number} 单元`, `Unit ${number}`);
  const chapterLabel = number => t(`第 ${number} 章`, `Chapter ${number}`);
  const kindLabel = page => ({
    overview:t('章开篇','Overview'),review:t('章复习','Review'),'practice-test':t('练习测试','Practice test')
  })[page.kind] || t('章内资料','Chapter material');
  const pageLocation = page => {
    const source = page.source || {};
    const validPages = value => Array.isArray(value) ? value.filter(number => Number.isInteger(number) && number > 0) : [];
    const printed = validPages(source.printedPages || [page.printedPage]);
    const pdf = validPages(source.pdfPages || [page.pdfPage]);
    const pages = printed.length ? printed : pdf;
    if (!pages.length) return '';
    const first = Math.min(...pages), last = Math.max(...pages);
    const span = first === last ? String(first) : `${first}–${last}`;
    return printed.length ? t(`第 ${span} 页`, `${first === last ? 'p.' : 'pp.'} ${span}`) : t(`PDF 第 ${span} 页`, `PDF pp. ${span}`);
  };
  const lessonUrl = href => {
    const url = new URL(location.protocol === 'file:' ? `${href}index.html` : href, location.href);
    url.searchParams.set('lang', language);
    return url.href;
  };
  const countsLabel = counts => [
    ['concepts','个知识点','concept','concepts'],['examples','道原例题','example','examples'],
    ['investigations','道探究题','Investigate question','Investigate questions'],['yourTurn','道 Your Turn','Your Turn problem','Your Turn problems'],
    ['otherPractice','道其他学习题','other learning question','other learning questions'],['exercises','道教材习题','textbook exercise','textbook exercises']
  ].filter(([key]) => counts[key]).map(([key, zh, singular, plural]) => `${counts[key]} ${t(zh, counts[key] === 1 ? singular : plural)}`).join(' · ');
  const searchText = (...items) => items.map(item => typeof item === 'string' ? item : `${item.title} ${item.en.title}`).join(' ').toLocaleLowerCase();
  const matches = (...items) => !query || query.toLocaleLowerCase().split(/\s+/).every(term => searchText(...items).includes(term));
  const pageTitle = page => page.status === 'ready'
    ? `<a href="${escape(lessonUrl(page.href))}">${escape(pick(page))}</a>` : escape(pick(page));

  const renderAvailable = () => {
    $('#available-lesson').classList.toggle('has-many', readyItems.length > 1);
    $('#ready-count').textContent = t(`${readyItems.length} 个页面可学习`, `${readyItems.length} learning ${readyItems.length === 1 ? 'page' : 'pages'} available`);
    if (!readyItems.length) {
      $('#available-lesson').innerHTML = `<p class="catalog-note">${t('完成审核的学习页面将在这里显示。','Reviewed learning pages will appear here when they are available.')}</p>`;
      return;
    }
    $('#available-lesson').innerHTML = catalog.units.map(unit => unit.chapters.map(chapter => {
      const pages = chapterPages(chapter).filter(page => page.status === 'ready');
      if (!pages.length) return '';
      const cards = pages.map(page => {
        const regular = page.kind === 'section';
        const badge = regular ? page.section : kindLabel(page);
        const localized = language === 'zh' ? page : page.en;
        const description = localized.description || '';
        const action = regular ? t(`开始学习 ${page.section}`, `Study Section ${page.section}`) : t('打开学习页面','Open learning page');
        return `<article class="lesson-card" aria-labelledby="lesson-${escape(page.slug)}-title"><div class="section-number${regular ? '' : ' section-word'}" aria-hidden="true">${escape(badge)}</div><div class="lesson-content"><p class="lesson-label">${escape(`${unitLabel(unit.number)} · ${chapterLabel(chapter.number)}`)}${regular ? '' : ` · ${escape(kindLabel(page))}`}</p><h4 id="lesson-${escape(page.slug)}-title">${escape(pick(page))}</h4>${description ? `<p class="lesson-description">${escape(description)}</p>` : ''}<p class="lesson-meta">${escape(countsLabel(page.counts))}${pageLocation(page) ? `<br>${escape(pageLocation(page))}` : ''}</p><a class="lesson-link" href="${escape(lessonUrl(page.href))}"><span>${escape(action)}</span><span aria-hidden="true">→</span></a></div></article>`;
      }).join('');
      return `<section class="ready-chapter" aria-labelledby="ready-chapter-${chapter.number}-title"><h3 id="ready-chapter-${chapter.number}-title">${escape(`${chapterLabel(chapter.number)} · ${pick(chapter)}`)}</h3><div class="ready-page-list">${cards}</div></section>`;
    }).join('')).join('');
  };

  const renderFilters = () => {
    const options = [['all', t('全部单元','All units')], ...catalog.units.map(unit => [String(unit.number), unitLabel(unit.number)])];
    $('#unit-filters').innerHTML = options.map(([value,label]) => `<button type="button" data-unit="${value}" aria-pressed="${value === unitFilter}">${escape(label)}</button>`).join('');
    $('#unit-filters').setAttribute('aria-label', text[language].unitFilters);
  };
  const materialRow = page => `<li class="material-row${page.status === 'ready' ? ' is-ready' : ''}"><span>${pageTitle(page)}${pageLocation(page) ? ` <small>· ${escape(pageLocation(page))}</small>` : ''}</span><span class="row-status">${page.status === 'ready' ? t('可学习 ↗','Ready ↗') : t('待制作','Planned')}</span></li>`;

  const renderMap = (expandResults = false) => {
    // Only search/filter changes expand results. Language changes preserve the
    // student's current search, Unit filter and manual disclosure choices.
    $('#course-map').querySelectorAll('details').forEach(details => {
      if (details.open) openUnits.add(details.dataset.unitNumber);
      else openUnits.delete(details.dataset.unitNumber);
    });
    let visibleSections = 0, visibleExtras = 0, visibleReady = 0;
    const units = catalog.units.filter(unit => unitFilter === 'all' || String(unit.number) === unitFilter).map(unit => {
      const unitSearch = `${unitLabel(unit.number)} Unit ${unit.number} 第 ${unit.number} 单元`;
      const chapters = unit.chapters.map(chapter => {
        const chapterSearch = `${chapterLabel(chapter.number)} Chapter ${chapter.number} 第 ${chapter.number} 章`;
        const ancestors = [unit, unitSearch, chapter, chapterSearch];
        const sections = chapter.sections.filter(page => matches(...ancestors, page, page.section, page.slug));
        const extras = chapter.extras.filter(page => matches(...ancestors, page, page.slug || ''));
        if (!sections.length && !extras.length) return '';
        visibleSections += sections.length;
        visibleExtras += extras.length;
        visibleReady += [...sections,...extras].filter(page => page.status === 'ready').length;
        const rows = sections.map(page => `<li class="section-row${page.status === 'ready' ? ' is-ready' : ''}"><span class="row-number">${escape(page.section)}</span><div class="row-title">${pageTitle(page)}<small>${escape(pageLocation(page))}</small></div><span class="row-status">${page.status === 'ready' ? t('可学习 ↗','Ready ↗') : t('待制作','Planned')}</span></li>`).join('');
        const overview = extras.filter(page => page.kind === 'overview').map(materialRow).join('');
        const reviews = extras.filter(page => page.kind !== 'overview').map(materialRow).join('');
        return `<section class="chapter-group" aria-labelledby="chapter-${chapter.number}-title"><p class="chapter-label">${escape(chapterLabel(chapter.number))}</p><div class="chapter-heading"><h3 id="chapter-${chapter.number}-title">${escape(pick(chapter))}</h3><span class="page-label">${escape(pageLocation(chapter))}</span></div>${overview ? `<ul class="review-list overview-list">${overview}</ul>` : ''}${rows ? `<ul class="section-list">${rows}</ul>` : ''}${reviews ? `<ul class="review-list">${reviews}</ul>` : ''}</section>`;
      }).filter(Boolean).join('');
      const extras = unit.extras.filter(page => matches(unit,unitSearch,page));
      if (!chapters && !extras.length) return '';
      visibleExtras += extras.length;
      visibleReady += extras.filter(page => page.status === 'ready').length;
      const supplemental = extras.length ? `<section class="unit-extras" aria-labelledby="unit-${unit.number}-extras"><h3 id="unit-${unit.number}-extras">${t('单元整理与复习','Unit wrap-up and review')}</h3><ul class="unit-extra-list">${extras.map(materialRow).join('')}</ul></section>` : '';
      const sectionCount = unit.chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0);
      const readyCount = unit.chapters.reduce((sum, chapter) => sum + chapterPages(chapter).filter(page => page.status === 'ready').length, 0);
      const meta = t(`${unit.chapters.length} 章 · ${sectionCount} 节 · ${readyCount} 个页面可学习`,`${unit.chapters.length} chapters · ${sectionCount} sections · ${readyCount} learning ${readyCount === 1 ? 'page' : 'pages'} ready`);
      const open = expandResults || openUnits.has(String(unit.number));
      return `<details class="unit-group" data-unit-number="${unit.number}"${open ? ' open' : ''}><summary><span class="unit-summary-text"><span class="unit-number">${escape(unitLabel(unit.number))}</span><span class="unit-title">${escape(pick(unit))}</span><span class="unit-summary-meta">${escape(meta)}</span></span><span class="chevron" aria-hidden="true">›</span></summary><div class="unit-body">${chapters}${supplemental}</div></details>`;
    }).filter(Boolean);
    $('#course-map').innerHTML = units.join('');
    $('#empty-results').hidden = units.length > 0;
    $('#result-count').textContent = t(`显示 ${visibleSections} 节及 ${visibleExtras} 项资料 · ${visibleReady} 个页面可学习`,`Showing ${visibleSections} sections and ${visibleExtras} materials · ${visibleReady} learning ${visibleReady === 1 ? 'page' : 'pages'} ready`);
    $('#clear-search').hidden = !$('#course-search').value;
    $('#expand-units').hidden = units.length === 0;
    $('#course-map').querySelectorAll('details').forEach(details => {
      details.addEventListener('toggle', () => {
        if (!details.isConnected) return;
        if (details.open) openUnits.add(details.dataset.unitNumber);
        else openUnits.delete(details.dataset.unitNumber);
        updateExpandLabel();
      });
    });
    updateExpandLabel();
  };
  const updateExpandLabel = () => {
    const all = [...$('#course-map').querySelectorAll('details')];
    const expanded = all.length > 0 && all.every(details => details.open);
    $('#expand-units').textContent = expanded ? t('收起所有单元','Collapse all units') : text[language].expandAll;
    $('#expand-units').setAttribute('aria-expanded', String(expanded));
  };
  const render = () => {
    document.documentElement.lang = language === 'zh' ? 'zh-Hans' : 'en';
    document.title = `${language === 'zh' ? catalog.course.title : catalog.course.en.title} · ${t('学习主页','Study home')}`;
    $('meta[name="description"]').content = text[language].description;
    document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = text[language][element.dataset.i18n]; });
    document.querySelectorAll('[data-language]').forEach(button => {
      const active = button.dataset.language === language;
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-pressed',String(active));
    });
    $('#course-search').placeholder = text[language].placeholder;
    $('#clear-search').setAttribute('aria-label',text[language].clearSearch);
    $('#course-stats').innerHTML = [
      [catalog.counts.units,t('个单元','units')],[catalog.counts.chapters,t('章','chapters')],
      [catalog.counts.sections,t('节教材内容','textbook sections')],[catalog.counts.readySections,t('节可学习',`${catalog.counts.readySections === 1 ? 'section' : 'sections'} ready`)],
      [catalog.counts.readyExtras,t('个章内资料页可学习',`${catalog.counts.readyExtras === 1 ? 'chapter page' : 'chapter pages'} ready`)]
    ].map(([number,label]) => `<span><strong>${number}</strong>${escape(label)}</span>`).join('');
    $('#map-caption').textContent = t(`${catalog.counts.units} 个单元 · ${catalog.counts.chapters} 章`,`${catalog.counts.units} units · ${catalog.counts.chapters} chapters`);
    $('#course-stats').setAttribute('aria-label',t('课程概览','Course overview'));
    const home = new URL(location.protocol === 'file:' ? 'index.html' : './',location.href);
    home.searchParams.set('lang',language);
    $('#home-link').href = home.href;
    renderAvailable();
    renderFilters();
    renderMap();
  };
  document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => {
    if (language === button.dataset.language) return;
    language = button.dataset.language;
    const url = new URL(location.href);
    url.searchParams.set('lang',language);
    try { history.replaceState(null,'',url.href); } catch (_) {}
    render();
    $('#announcement').textContent = text[language].announcement;
  }));
  $('#course-search').addEventListener('input', event => { query = event.target.value.trim(); renderMap(true); });
  $('#clear-search').addEventListener('click', () => { $('#course-search').value = ''; query = ''; renderMap(); $('#course-search').focus(); });
  $('#unit-filters').addEventListener('click', event => {
    const button = event.target.closest('[data-unit]');
    if (!button) return;
    unitFilter = button.dataset.unit;
    $('#unit-filters').querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed',String(item.dataset.unit === unitFilter)));
    renderMap(true);
  });
  $('#reset-filters').addEventListener('click', () => { unitFilter = 'all'; query = ''; $('#course-search').value = ''; renderFilters(); renderMap(); $('#course-search').focus(); });
  $('#expand-units').addEventListener('click', () => {
    const details = [...$('#course-map').querySelectorAll('details')];
    const next = !details.every(item => item.open);
    details.forEach(item => { item.open = next; if (next) openUnits.add(item.dataset.unitNumber); else openUnits.delete(item.dataset.unitNumber); });
    updateExpandLabel();
  });
  render();
})();
