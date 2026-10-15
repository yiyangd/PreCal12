(() => {
  'use strict';
  const catalog = JSON.parse(document.getElementById('course-catalog').textContent);
  const requested = new URLSearchParams(location.search).get('lang');
  let language = requested === 'zh' ? 'zh' : 'en';
  let unitFilter = 'all';
  let query = '';
  const openUnits = new Set(['1']);
  const $ = selector => document.querySelector(selector);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const pick = item => language === 'zh' ? item.title : item.en.title;
  const t = (zh, en) => language === 'zh' ? zh : en;
  const text = {
    en: {
      skip:'Skip to course contents',brand:'STUDY HOME',welcome:'Start here.',
      intro:'Build understanding, one section at a time. Study key concepts, explore the textbook examples, and practise with step-by-step solutions.',
      available:'Ready to study',oneReady:'1 section available',contents:'Textbook course map',mapCaption:'4 units · 11 chapters',
      catalogNote:'The full textbook outline is shown below. Section 3.2 is ready; other sections and review materials are planned.',
      searchLabel:'Find a section',expandAll:'Expand all units',empty:'No matching sections. Try a section number or another keyword.',reset:'Clear filters',
      source:'Course outline checked against the textbook contents, printed pages iv–v (PDF pages 5–6). Page numbers below are printed textbook pages.',
      footer:'Bilingual study notes · Textbook-based',placeholder:'Search title, chapter or section…',clearSearch:'Clear search',unitFilters:'Filter by unit',
      announcement:'Switched to English.',description:'Pre-Calculus 12 bilingual study home. Browse the textbook course map and study Section 3.2, The Remainder Theorem.'
    },
    zh: {
      skip:'跳到课程目录',brand:'学习主页',welcome:'从这里开始。',
      intro:'从一节开始，逐步理解。学习知识点，跟随教材原例题，再通过配套练习与分步解析巩固方法。',
      available:'已完成的学习内容',oneReady:'1 节可学习',contents:'教材课程目录',mapCaption:'4 个单元 · 11 章',
      catalogNote:'下方保留完整教材目录。第 3.2 节已完成；其他章节及复习材料待制作。',
      searchLabel:'查找章节',expandAll:'展开所有单元',empty:'没有找到匹配内容。试试节号或其他关键词。',reset:'清除筛选',
      source:'目录已对照教材印刷页 iv–v（PDF 第 5–6 页）核对。下方页码均为教材印刷页码。',
      footer:'中英文学习笔记 · 依据教材',placeholder:'搜索标题、章号或节号…',clearSearch:'清除搜索',unitFilters:'按单元筛选',
      announcement:'已切换为中文。',description:'微积分预备 12 中英文学习主页。浏览完整教材目录，学习第 3.2 节：余式定理。'
    }
  };
  const unitLabel = number => t(`第 ${number} 单元`, `Unit ${number}`);
  const chapterLabel = number => t(`第 ${number} 章`, `Chapter ${number}`);
  const page = number => t(`第 ${number} 页`, `p. ${number}`);
  const lessonUrl = href => {
    const url = new URL(location.protocol === 'file:' ? `${href}index.html` : href, location.href);
    url.searchParams.set('lang', language);
    return url.href;
  };
  const countsLabel = counts => [
    ['concepts','个知识点','concepts'],['examples','道原例题','examples'],
    ['investigations','道探究题','Investigate questions'],['yourTurn','道 Your Turn','Your Turn problems'],
    ['exercises','道节后习题','exercises']
  ].filter(([key]) => counts[key]).map(([key, zh, en]) => `${counts[key]} ${t(zh, en)}`).join(' · ');
  const searchText = (...items) => items.map(item => typeof item === 'string' ? item : `${item.title} ${item.en.title}`).join(' ').toLocaleLowerCase();
  const matches = (...items) => !query || query.toLocaleLowerCase().split(/\s+/).every(term => searchText(...items).includes(term));

  const renderAvailable = () => {
    const unit = catalog.units.find(u => u.chapters.some(c => c.sections.some(s => s.status === 'ready')));
    const chapter = unit.chapters.find(c => c.sections.some(s => s.status === 'ready'));
    const section = chapter.sections.find(s => s.status === 'ready');
    const pages = section.source.printedPages || [];
    const range = pages.length ? `${Math.min(...pages)}–${Math.max(...pages)}` : '';
    $('#available-lesson').innerHTML = `<article class="lesson-card" aria-labelledby="lesson-3-2-title"><div class="section-number" aria-hidden="true">3.2</div><div class="lesson-content"><p class="lesson-label">${escape(`${unitLabel(unit.number)} · ${chapterLabel(chapter.number)} · ${pick(chapter)}`)}</p><h3 id="lesson-3-2-title">${escape(pick(section))}</h3><p class="lesson-description">${t('先掌握多项式长除法与合成除法，再用余式定理求余数、求值及确定未知系数。','Start with polynomial long division and synthetic division, then use the remainder theorem to find remainders, evaluate polynomials, and determine unknown coefficients.')}</p><p class="lesson-meta">${escape(countsLabel(section.counts))}<br>${escape(t('节后习题含 1–17 与 C1–C3。','Exercises include 1–17 and C1–C3.'))}${range ? ` ${escape(t(`教材第 ${range} 页。`, `Textbook pp. ${range}.`))}` : ''}</p><a class="lesson-link" href="${escape(lessonUrl(section.href))}"><span>${t('开始学习 3.2','Study Section 3.2')}</span><span aria-hidden="true">→</span></a></div></article>`;
  };

  const renderFilters = () => {
    const options = [['all', t('全部单元','All units')], ...catalog.units.map(unit => [String(unit.number), unitLabel(unit.number)])];
    $('#unit-filters').innerHTML = options.map(([value,label]) => `<button type="button" data-unit="${value}" aria-pressed="${value === unitFilter}">${escape(label)}</button>`).join('');
    $('#unit-filters').setAttribute('aria-label', text[language].unitFilters);
  };

  const renderMap = (expandResults = false) => {
    // Snapshot the current disclosure state before replacing bilingual content.
    // Searching/filtering expands matches; changing language keeps manual choices.
    $('#course-map').querySelectorAll('details').forEach(details => {
      if (details.open) openUnits.add(details.dataset.unitNumber);
      else openUnits.delete(details.dataset.unitNumber);
    });
    let visibleSections = 0;
    let visibleReady = 0;
    const units = catalog.units.filter(unit => unitFilter === 'all' || String(unit.number) === unitFilter).map(unit => {
      const unitSearch = `${unitLabel(unit.number)} Unit ${unit.number} 第 ${unit.number} 单元`;
      const chapters = unit.chapters.map(chapter => {
        const chapterSearch = `${chapterLabel(chapter.number)} Chapter ${chapter.number} 第 ${chapter.number} 章`;
        const ancestors = [unit, unitSearch, chapter, chapterSearch];
        const sections = chapter.sections.filter(section => matches(...ancestors, section, section.section));
        const extras = chapter.extras.filter(extra => matches(...ancestors, extra));
        if (!sections.length && !extras.length) return '';
        visibleSections += sections.length;
        visibleReady += sections.filter(section => section.status === 'ready').length;
        const rows = sections.map(section => {
          const ready = section.status === 'ready';
          const title = ready ? `<a href="${escape(lessonUrl(section.href))}">${escape(pick(section))}</a>` : escape(pick(section));
          return `<li class="section-row${ready ? ' is-ready' : ''}"><span class="row-number">${escape(section.section)}</span><div class="row-title">${title}<small>${escape(page(section.printedPage))}</small></div><span class="row-status">${ready ? t('可学习 ↗','Ready ↗') : t('待制作','Planned')}</span></li>`;
        }).join('');
        const reviews = extras.map(extra => `<span>${escape(pick(extra))} · ${escape(page(extra.printedPage))} · ${t('待制作','Planned')}</span>`).join('');
        return `<section class="chapter-group" aria-labelledby="chapter-${chapter.number}-title"><p class="chapter-label">${escape(chapterLabel(chapter.number))}</p><div class="chapter-heading"><h3 id="chapter-${chapter.number}-title">${escape(pick(chapter))}</h3><span class="page-label">${escape(page(chapter.printedPage))}</span></div>${rows ? `<ul class="section-list">${rows}</ul>` : ''}${reviews ? `<div class="review-list">${reviews}</div>` : ''}</section>`;
      }).filter(Boolean).join('');
      const extras = unit.extras.filter(extra => matches(unit,unitSearch,extra));
      if (!chapters && !extras.length) return '';
      const supplemental = extras.length ? `<section class="unit-extras" aria-labelledby="unit-${unit.number}-extras"><h3 id="unit-${unit.number}-extras">${t('单元整理与复习','Unit wrap-up and review')}</h3>${extras.map(extra => `<div class="extra-row"><span>${escape(pick(extra))} · ${escape(page(extra.printedPage))}</span><span class="row-status">${t('待制作','Planned')}</span></div>`).join('')}</section>` : '';
      const sectionCount = unit.chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0);
      const readyCount = unit.chapters.reduce((sum, chapter) => sum + chapter.sections.filter(section => section.status === 'ready').length, 0);
      const meta = t(`${unit.chapters.length} 章 · ${sectionCount} 节 · ${readyCount} 节已完成`,`${unit.chapters.length} chapters · ${sectionCount} sections · ${readyCount} ready`);
      const open = expandResults || openUnits.has(String(unit.number));
      return `<details class="unit-group" data-unit-number="${unit.number}"${open ? ' open' : ''}><summary><span class="unit-summary-text"><span class="unit-number">${escape(unitLabel(unit.number))}</span><span class="unit-title">${escape(pick(unit))}</span><span class="unit-summary-meta">${escape(meta)}</span></span><span class="chevron" aria-hidden="true">›</span></summary><div class="unit-body">${chapters}${supplemental}</div></details>`;
    }).filter(Boolean);
    $('#course-map').innerHTML = units.join('');
    $('#empty-results').hidden = units.length > 0;
    $('#result-count').textContent = t(`显示 ${visibleSections} 节 · ${visibleReady} 节可学习`,`Showing ${visibleSections} sections · ${visibleReady} ready`);
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
      [catalog.counts.sections,t('节教材内容','textbook sections')],[catalog.counts.readySections,t('节已完成','section ready')]
    ].map(([number,label]) => `<span><strong>${number}</strong>${escape(label)}</span>`).join('');
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
