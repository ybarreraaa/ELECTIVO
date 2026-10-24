/**
 * CONTROLADOR PRINCIPAL DE LA REVISTA DIGITAL INTERACTIVA (Flipbook 3D & Renderizador Editorial)
 * Cumple con las Secciones 2, 3 y 4:
 * - Conservación 100% intacta de Portada (pág. 1) y Contraportada (última pág.)
 * - Dos páginas visibles enfrentadas en escritorio (>=1024px) y una página en móvil
 * - Animación realista de apertura y paso de páginas con sonido de papel opcional
 * - Navegación con flechas, teclado, barra de progreso, índice interactivo y pantalla completa
 */
(function () {
  const STORAGE_KEY_DATA = "revista_cientifica_v1_data";

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  class EditorialMagazineApp {
    constructor() {
      this.data = this.loadInitialData();
      this.currentPage = 1; // 1-indexed
      this.isDesktopSpread = window.innerWidth >= 1024;
      this.isTurning = false;
    }

    loadInitialData() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_DATA);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.pages) && parsed.pages.length >= 4) {
            return parsed;
          }
        }
      } catch (e) {}
      return JSON.parse(JSON.stringify(window.INITIAL_MAGAZINE_DATA));
    }

    getData() {
      return this.data;
    }

    setData(newData) {
      this.data = newData;
    }

    resetToFactoryData() {
      this.data = JSON.parse(JSON.stringify(window.INITIAL_MAGAZINE_DATA));
      this.currentPage = 1;
      this.renderCurrentSpread("prev");
    }

    totalPages() {
      return this.data.pages.length;
    }

    /* Calcula qué páginas se muestran en el spread actual */
    getSpreadPageNumbers(targetPage = this.currentPage) {
      const total = this.totalPages();
      const p = Math.max(1, Math.min(total, targetPage));

      // En dispositivos móviles (<1024px), siempre 1 página
      if (!this.isDesktopSpread) {
        return [p];
      }

      // En escritorio: Portada (pág. 1) y Contraportada (última pág.) se muestran como cubierta individual centrada
      if (p === 1) return [1];
      if (p === total) return [total];

      // Páginas interiores en pares (2-3, 4-5, 6-7, ..., 36-37)
      const left = p % 2 === 0 ? p : p - 1;
      const right = left + 1;
      if (right < total) {
        return [left, right];
      }
      return [left];
    }

    getVisiblePages() {
      const nums = this.getSpreadPageNumbers(this.currentPage);
      return nums.map((n) => this.data.pages[n - 1]).filter(Boolean);
    }

    /* Avanzar / Retroceder / Ir a página */
    nextSpread(fromCoverButton = false) {
      if (this.isTurning) return;
      const total = this.totalPages();
      const visible = this.getSpreadPageNumbers(this.currentPage);
      const lastVisible = visible[visible.length - 1];
      if (lastVisible >= total) return;

      if (fromCoverButton && window.EditorialAudio && !window.EditorialAudio.isPlaying) {
        window.EditorialAudio.startWithFadeIn();
      }
      if (window.EditorialAudio) {
        window.EditorialAudio.playPaperFlipSound();
      }

      this.currentPage = lastVisible + 1;
      this.renderCurrentSpread("next");
    }

    prevSpread() {
      if (this.isTurning) return;
      const visible = this.getSpreadPageNumbers(this.currentPage);
      const firstVisible = visible[0];
      if (firstVisible <= 1) return;

      if (window.EditorialAudio) {
        window.EditorialAudio.playPaperFlipSound();
      }

      const target = firstVisible - 1;
      const prevPair = this.getSpreadPageNumbers(target);
      this.currentPage = prevPair[0];
      this.renderCurrentSpread("prev");
    }

    goToPage(pageNumber) {
      const total = this.totalPages();
      const target = Math.max(1, Math.min(total, parseInt(pageNumber, 10) || 1));
      const direction = target >= this.currentPage ? "next" : "prev";
      const spreadNums = this.getSpreadPageNumbers(target);
      this.currentPage = spreadNums[0];
      if (window.EditorialAudio) {
        window.EditorialAudio.playPaperFlipSound();
      }
      this.renderCurrentSpread(direction);
    }

    /* Renderizador de cada hoja según su composición editorial */
    renderSinglePageHTML(page, leafSide) {
      const editableAttr = (fieldPath) =>
        window.EditorialEditor && window.EditorialEditor.isEditorMode && !page.locked
          ? `contenteditable="true" data-page-id="${escapeHtml(page.id)}" data-edit-field="${escapeHtml(fieldPath)}"`
          : "";

      // 1. PORTADA ORIGINAL (PÁGINA 1 — CONSERVACIÓN 100% FIEL E INTACTA)
      if (page.type === "cover") {
        return `
          <article class="magazine-page cover-leaf" data-page-number="1">
            <div class="cover-lock-badge">
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              PORTADA ORIGINAL PROTEGIDA
            </div>
            <img src="${escapeHtml(page.coverImage)}" alt="Portada Original Revista Científica Vol. 1" class="original-cover-img" />
            <div class="open-magazine-overlay">
              <button type="button" class="open-magazine-btn" id="open-magazine-cover-btn">
                <span>ABRIR REVISTA</span>
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </article>
        `;
      }

      // 2. CONTRAPORTADA ORIGINAL (ÚLTIMA PÁGINA — CONSERVACIÓN 100% FIEL E INTACTA)
      if (page.type === "back-cover") {
        return `
          <article class="magazine-page cover-leaf" data-page-number="${page.pageNumber}">
            <div class="cover-lock-badge">
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              CONTRAPORTADA ORIGINAL PROTEGIDA
            </div>
            <img src="${escapeHtml(page.coverImage)}" alt="Contraportada Original Revista Científica Vol. 1" class="original-cover-img" />
            <div class="open-magazine-overlay">
              <button type="button" class="open-magazine-btn" data-goto-page="2">
                <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none"><polyline points="15 18 9 12 15 6"/></svg>
                <span>VOLVER AL ÍNDICE GENERAL</span>
              </button>
            </div>
          </article>
        `;
      }

      // Cabecera y pie comunes para todas las páginas interiores (.interior-page)
      const headerHtml = `
        <header class="page-running-header">
          <span class="running-vol">REVISTA CIENTÍFICA · VOL. 1 (2026)</span>
          <span class="running-section">${escapeHtml(page.section || "")}</span>
        </header>
      `;

      const footerHtml = `
        <footer class="page-running-footer">
          <button type="button" class="footer-index-link" data-goto-page="2">ÍNDICE GENERAL</button>
          <span>LICEO SAN FRANCISCO · VALLENAR</span>
          <span class="page-folio-num">PÁG. ${String(page.pageNumber).padStart(2, "0")}</span>
        </footer>
      `;

      let bodyHtml = "";

      // 3. ÍNDICE GENERAL INTERACTIVO (PÁGINA 2)
      if (page.type === "toc") {
        const itemsHtml = (page.tocEntries || [])
          .map(
            (entry) => `
            <button type="button" class="toc-item" data-goto-page="${entry.targetPage}">
              <span class="toc-num">${escapeHtml(entry.num)}</span>
              <div class="toc-main">
                <span class="toc-entry-title">${escapeHtml(entry.title)}</span>
                <span class="toc-entry-authors">${escapeHtml(entry.authors)}</span>
              </div>
              <span class="toc-page-badge">Pág. ${entry.targetPage}</span>
            </button>
          `
          )
          .join("");

        bodyHtml = `
          <span class="ed-kicker" ${editableAttr("kicker")}>${escapeHtml(page.kicker)}</span>
          <h1 class="ed-title" ${editableAttr("title")}>${escapeHtml(page.title)}</h1>
          <p class="ed-subtitle" ${editableAttr("subtitle")}>${escapeHtml(page.subtitle)}</p>
          <div class="toc-list">${itemsHtml}</div>
        `;
      }

      // 4. CARTA EDITORIAL (PÁGINA 3)
      else if (page.type === "editorial") {
        const pHtml = (page.paragraphs || [])
          .map(
            (p, idx) =>
              `<p class="ed-paragraph ${idx === 0 ? "ed-dropcap" : ""}" ${editableAttr(`paragraphs.${idx}`)}>${escapeHtml(p)}</p>`
          )
          .join("");

        const pillarsHtml = (page.editorialPillars || [])
          .map(
            (pl) => `
            <div class="pillar-card">
              <span class="pillar-code">${escapeHtml(pl.code)}</span>
              <div class="pillar-name">${escapeHtml(pl.name)}</div>
              <p class="ed-caption">${escapeHtml(pl.desc)}</p>
            </div>
          `
          )
          .join("");

        bodyHtml = `
          <span class="ed-kicker" ${editableAttr("kicker")}>${escapeHtml(page.kicker)}</span>
          <h1 class="ed-title" ${editableAttr("title")}>${escapeHtml(page.title)}</h1>
          <p class="ed-subtitle" ${editableAttr("subtitle")}>${escapeHtml(page.subtitle)}</p>
          <div class="ed-authors" style="margin-bottom:10px;" ${editableAttr("authors")}>${escapeHtml(page.authors)}</div>
          ${pHtml}
          <blockquote class="ed-quote" ${editableAttr("pullQuote")}>${escapeHtml(page.pullQuote)}</blockquote>
          <div class="editorial-pillars-grid">${pillarsHtml}</div>
        `;
      }

      // 5. PORTADILLA DE MONOGRAFÍA (RESUMEN / ABSTRACT BILINGÜE + INTRODUCCIÓN)
      else if (page.type === "article-intro") {
        const alertHtml = page.editorialAlert
          ? `<div class="document-fidelity-note">${escapeHtml(page.editorialAlert)}</div>`
          : "";
        const introParas = (page.paragraphs || [])
          .map(
            (p, idx) =>
              `<p class="ed-paragraph ${idx === 0 ? "ed-dropcap" : ""}" ${editableAttr(`paragraphs.${idx}`)}>${escapeHtml(p)}</p>`
          )
          .join("");

        bodyHtml = `
          <div class="monograph-header-banner">
            <span class="ed-kicker" ${editableAttr("kicker")}>${escapeHtml(page.kicker)}</span>
            <h1 class="ed-title" ${editableAttr("title")}>${escapeHtml(page.title)}</h1>
            <div class="ed-authors" ${editableAttr("authors")}><strong>Autores:</strong> ${escapeHtml(page.authors)}</div>
          </div>
          ${alertHtml}
          <div class="abstract-box">
            <div class="abstract-tabs">
              <button type="button" class="abstract-tab-btn active" data-abstract-lang="es">RESUMEN (ESPAÑOL)</button>
              <button type="button" class="abstract-tab-btn" data-abstract-lang="en">ABSTRACT (ENGLISH)</button>
            </div>
            <div class="abstract-pane-es">
              <p class="ed-paragraph" style="margin-bottom:4px;" ${editableAttr("resumen")}>${escapeHtml(page.resumen)}</p>
              <div class="keywords-strip"><strong>Palabras clave:</strong> <span ${editableAttr("palabrasClave")}>${escapeHtml(page.palabrasClave)}</span></div>
            </div>
            <div class="abstract-pane-en" style="display:none;">
              <p class="ed-paragraph" style="margin-bottom:4px;font-style:italic;" ${editableAttr("abstract")}>${escapeHtml(page.abstract)}</p>
              <div class="keywords-strip"><strong>Keywords:</strong> <span ${editableAttr("keywords")}>${escapeHtml(page.keywords)}</span></div>
            </div>
          </div>
          <h2 class="ed-heading" ${editableAttr("subheading")}>${escapeHtml(page.subheading || "Introducción")}</h2>
          <div class="editorial-two-col">${introParas}</div>
          ${page.pullQuote ? `<blockquote class="ed-quote" ${editableAttr("pullQuote")}>${escapeHtml(page.pullQuote)}</blockquote>` : ""}
        `;
      }

      // 6. PÁGINAS DE DESARROLLO ACADÉMICO Y VISUAL (article-columns, article-visual, article-synthesis)
      else if (
        page.type === "article-columns" ||
        page.type === "article-visual" ||
        page.type === "article-synthesis"
      ) {
        let figHtml = "";
        if (page.featuredImage) {
          figHtml = `
            <figure class="editorial-figure">
              <button type="button" class="figure-replace-btn" data-page-id="${escapeHtml(page.id)}">CAMBIAR IMAGEN</button>
              <div class="figure-img-wrapper" data-lightbox-src="${escapeHtml(page.featuredImage.src)}" data-lightbox-title="${escapeHtml(page.featuredImage.title)}" data-lightbox-caption="${escapeHtml(page.featuredImage.caption)}">
                <img src="${escapeHtml(page.featuredImage.src)}" alt="${escapeHtml(page.featuredImage.title)}" />
                <span class="figure-zoom-badge">AMPLIAR FOTOGRAFÍA +</span>
              </div>
              <figcaption>
                <div class="figure-caption-title" ${editableAttr("featuredImage.title")}>${escapeHtml(page.featuredImage.title)}</div>
                <div class="ed-caption" ${editableAttr("featuredImage.caption")}>${escapeHtml(page.featuredImage.caption)}</div>
              </figcaption>
            </figure>
          `;
        }

        let secFigsHtml = "";
        if (page.secondaryImages && page.secondaryImages.length) {
          secFigsHtml = `
            <div class="secondary-figures-grid">
              ${page.secondaryImages
                .map(
                  (img) => `
                  <figure class="editorial-figure" style="margin:0;">
                    <div class="figure-img-wrapper" style="max-height:135px;" data-lightbox-src="${escapeHtml(img.src)}" data-lightbox-title="${escapeHtml(img.title)}" data-lightbox-caption="${escapeHtml(img.caption)}">
                      <img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.title)}" style="max-height:135px;" />
                      <span class="figure-zoom-badge">VER TABLA / GRÁFICO +</span>
                    </div>
                    <figcaption>
                      <div class="figure-caption-title" style="font-size:0.7rem;">${escapeHtml(img.title)}</div>
                    </figcaption>
                  </figure>
                `
                )
                .join("")}
            </div>
          `;
        }

        const blocksHtml = (page.blocks || [])
          .map((blk, bIdx) => {
            const paras = blk.paragraphs || [];
            // Mostrar los primeros 4 párrafos directamente y, si hay más de 4, ofrecer el cajón interactivo "LEER MÁS / DESCUBRIR MÁS"
            const visibleParas = paras.slice(0, 4);
            const extraParas = paras.slice(4);

            const visibleHtml = visibleParas
              .map(
                (p, pIdx) =>
                  `<p class="ed-paragraph" ${editableAttr(`blocks.${bIdx}.paragraphs.${pIdx}`)}>${escapeHtml(p)}</p>`
              )
              .join("");

            const drawerHtml = extraParas.length
              ? `
                <div class="expandable-drawer open">
                  <button type="button" class="drawer-toggle-btn">
                    <span>PROFUNDIZACIÓN ACADÉMICA (${extraParas.length} PÁRRAFOS DEL MANUSCRITO)</span>
                    <span class="drawer-icon">OCULTAR SECCIÓN −</span>
                  </button>
                  <div class="drawer-body">
                    ${extraParas
                      .map(
                        (p, eIdx) =>
                          `<p class="ed-paragraph" ${editableAttr(`blocks.${bIdx}.paragraphs.${eIdx + 4}`)}>${escapeHtml(p)}</p>`
                      )
                      .join("")}
                  </div>
                </div>
              `
              : "";

            return `
              <section class="article-block">
                <h2 class="ed-heading" ${editableAttr(`blocks.${bIdx}.heading`)}>${escapeHtml(blk.heading)}</h2>
                ${blk.editorialAlert ? `<div class="document-fidelity-note">${escapeHtml(blk.editorialAlert)}</div>` : ""}
                <div class="${visibleParas.length >= 3 ? "editorial-two-col" : ""}">${visibleHtml}</div>
                ${drawerHtml}
              </section>
            `;
          })
          .join("");

        // Tarjeta comparativa si existe
        let compHtml = "";
        if (page.comparisonCard) {
          const c = page.comparisonCard;
          compHtml = `
            <div class="interactive-widget">
              <div class="widget-header"><span class="widget-tag">${escapeHtml(c.title)}</span></div>
              <div class="secondary-figures-grid">
                <div class="pillar-card">
                  <div class="pillar-name">${escapeHtml(c.leftTitle)}</div>
                  ${c.leftItems.map((it) => `<p class="ed-caption" style="margin-bottom:4px;">• ${escapeHtml(it)}</p>`).join("")}
                </div>
                <div class="pillar-card">
                  <div class="pillar-name">${escapeHtml(c.rightTitle)}</div>
                  ${c.rightItems.map((it) => `<p class="ed-caption" style="margin-bottom:4px;">• ${escapeHtml(it)}</p>`).join("")}
                </div>
              </div>
            </div>
          `;
        }

        // Tarjeta de Video de YouTube si existe
        let vidCardHtml = "";
        if (page.videoCard) {
          const vc = page.videoCard;
          vidCardHtml = `
            <div class="interactive-widget" style="border-top-color:#8B6F47;">
              <div class="widget-header">
                <span class="widget-tag" style="color:#8B6F47;">${escapeHtml(vc.badge)}</span>
                <span class="widget-tag">${escapeHtml(vc.channel)}</span>
              </div>
              <div class="widget-title" style="margin-bottom:4px;">${escapeHtml(vc.title)}</div>
              <p class="ed-caption" style="margin-bottom:8px;">${escapeHtml(vc.description)}</p>
              <div class="cultural-actions">
                <button type="button" class="editorial-action-btn" data-open-video="1" data-yt-id="${escapeHtml(vc.youtubeId || "")}" data-vid-title="${escapeHtml(vc.title)}" data-vid-desc="${escapeHtml(vc.description)}" data-vid-link="${escapeHtml(vc.searchUrl || "")}">
                  ${escapeHtml(vc.buttonLabel || "VER VIDEO")}
                </button>
                ${
                  vc.searchUrl
                    ? `<a href="${escapeHtml(vc.searchUrl)}" target="_blank" rel="noopener noreferrer" class="editorial-action-btn secondary">ABRIR EN YOUTUBE</a>`
                    : ""
                }
              </div>
            </div>
          `;
        }

        const timelineHtml = page.timelineId
          ? window.EditorialInteractions.renderTimelineWidget(page.timelineId, this.data)
          : "";
        const interviewHtml = page.interviewId
          ? window.EditorialInteractions.renderInterviewWidget(page.interviewId, this.data)
          : "";
        const infoHtml = page.infographicId
          ? window.EditorialInteractions.renderInfographicWidget(page.infographicId)
          : "";
        const quizHtml = page.quizId
          ? window.EditorialInteractions.renderQuizWidget(page.quizId, this.data)
          : "";

        bodyHtml = `
          <span class="ed-kicker" ${editableAttr("kicker")}>${escapeHtml(page.kicker)}</span>
          <h1 class="ed-title" ${editableAttr("title")}>${escapeHtml(page.title)}</h1>
          ${figHtml}
          ${secFigsHtml}
          ${blocksHtml}
          ${compHtml}
          ${timelineHtml}
          ${interviewHtml}
          ${infoHtml}
          ${vidCardHtml}
          ${quizHtml}
        `;
      }

      // 7. RECOMENDACIONES CULTURALES (BLOQUES I, II Y III)
      else if (page.type === "cultural-spread") {
        const cardsHtml = (page.items || [])
          .map(
            (item) => `
            <div class="cultural-card">
              <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" class="cultural-card-img" data-lightbox-src="${escapeHtml(item.image)}" data-lightbox-title="${escapeHtml(item.title)}" data-lightbox-caption="${escapeHtml(item.apa)}" />
              <div>
                <span class="ed-kicker" style="margin-bottom:2px;">${escapeHtml(item.category)} · ${escapeHtml(item.type)}</span>
                <div class="figure-caption-title" style="margin-top:0;font-size:0.9rem;">${escapeHtml(item.title)}</div>
                <div class="ed-caption" style="margin-bottom:5px;"><strong>Autor / Dirección:</strong> ${escapeHtml(item.author)}</div>
                <p class="ed-paragraph" style="margin-bottom:5px;font-size:0.77rem;">${escapeHtml(item.description)}</p>
                <div class="ed-caption" style="background:var(--paper-warm);padding:4px 8px;border-left:2px solid var(--navy-primary);"><strong>Referencia APA:</strong> ${escapeHtml(item.apa)}</div>
                <div class="cultural-actions">
                  ${
                    item.youtubeId
                      ? `<button type="button" class="editorial-action-btn" data-open-video="1" data-yt-id="${escapeHtml(item.youtubeId)}" data-vid-title="${escapeHtml(item.title)}" data-vid-desc="${escapeHtml(item.description)}" data-vid-link="${escapeHtml(item.link)}">${escapeHtml(item.actionLabel)}</button>`
                      : ""
                  }
                  <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="editorial-action-btn ${item.youtubeId ? "secondary" : ""}">FUENTE VERIFICADA</a>
                </div>
              </div>
            </div>
          `
          )
          .join("");

        const quizHtml = page.quizId
          ? window.EditorialInteractions.renderQuizWidget(page.quizId, this.data)
          : "";

        bodyHtml = `
          <span class="ed-kicker" ${editableAttr("kicker")}>${escapeHtml(page.kicker)}</span>
          <h1 class="ed-title" ${editableAttr("title")}>${escapeHtml(page.title)}</h1>
          <p class="ed-subtitle" ${editableAttr("subtitle")}>${escapeHtml(page.subtitle)}</p>
          <div class="cultural-grid">${cardsHtml}</div>
          ${quizHtml}
        `;
      }

      // 8. SECCIÓN ESPECIAL: ¿SABÍAS QUE? (6 CÁPSULAS DE DIVULGACIÓN CON SUS FUENTES)
      else if (page.type === "sabias-que") {
        const cardsHtml = (page.cards || [])
          .map(
            (c) => `
            <div class="sabias-card">
              <span class="ed-kicker" style="margin-bottom:2px;">${escapeHtml(c.monograph)}</span>
              <div class="figure-caption-title" style="margin-top:0;margin-bottom:4px;font-size:0.86rem;">${escapeHtml(c.title)}</div>
              <p class="ed-paragraph" style="margin-bottom:6px;font-size:0.78rem;">${escapeHtml(c.text)}</p>
              <a href="${escapeHtml(c.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="editorial-action-btn secondary" style="padding:3px 9px;font-size:0.6rem;">FUENTE: ${escapeHtml(c.sourceLabel)}</a>
            </div>
          `
          )
          .join("");

        bodyHtml = `
          <span class="ed-kicker" ${editableAttr("kicker")}>${escapeHtml(page.kicker)}</span>
          <h1 class="ed-title" ${editableAttr("title")}>${escapeHtml(page.title)}</h1>
          <p class="ed-subtitle" ${editableAttr("subtitle")}>${escapeHtml(page.subtitle)}</p>
          <div class="sabias-grid">${cardsHtml}</div>
        `;
      }

      // 9. GLOSARIO ACADÉMICO INTERACTIVO (CONCEPTOS 1–32 Y 33–63)
      else if (page.type === "glossary") {
        const range = page.glossaryRange || [1, 32];
        const itemsHtml = (page.items || [])
          .map(
            (g) => `
            <div class="glossary-entry">
              <div>
                <span class="glossary-term">${g.num}. ${escapeHtml(g.term)}</span>
                <span class="glossary-cat-badge">${escapeHtml(g.category)}</span>
              </div>
              <p class="ed-paragraph" style="margin-bottom:0;font-size:0.74rem;">${escapeHtml(g.definition)}</p>
            </div>
          `
          )
          .join("");

        bodyHtml = `
          <span class="ed-kicker" ${editableAttr("kicker")}>${escapeHtml(page.kicker)}</span>
          <h1 class="ed-title" ${editableAttr("title")}>${escapeHtml(page.title)}</h1>
          <p class="ed-subtitle" ${editableAttr("subtitle")}>${escapeHtml(page.subtitle)}</p>
          <div class="glossary-search-bar">
            <input type="search" class="glossary-input" placeholder="Buscar término o monografía entre los 63 conceptos..." data-glossary-search="1" data-range-start="${range[0]}" data-range-end="${range[1]}" />
          </div>
          <div class="glossary-list">${itemsHtml}</div>
        `;
      }

      // 10. COMITÉ EDITORIAL, CRÉDITOS, COLOFÓN Y BIBLIOGRAFÍA GENERAL APA
      else if (page.type === "credits-bib") {
        const commHtml = (page.committees || [])
          .map(
            (cm) => `
            <div class="committee-card">
              <div class="figure-caption-title" style="margin-top:0;margin-bottom:4px;">${escapeHtml(cm.role)}</div>
              ${cm.members.map((m) => `<div class="ed-caption" style="margin-bottom:2px;">• ${escapeHtml(m)}</div>`).join("")}
            </div>
          `
          )
          .join("");

        const bibHtml = (page.bibliography || [])
          .map(
            (b) => `
            <div class="bib-item">
              ${escapeHtml(b.text)}
              ${
                b.url
                  ? ` <a href="${escapeHtml(b.url)}" target="_blank" rel="noopener noreferrer">[Abrir fuente verificada]</a>`
                  : ""
              }
            </div>
          `
          )
          .join("");

        bodyHtml = `
          <span class="ed-kicker" ${editableAttr("kicker")}>${escapeHtml(page.kicker)}</span>
          <h1 class="ed-title" ${editableAttr("title")}>${escapeHtml(page.title)}</h1>
          ${page.editorialAlert ? `<div class="document-fidelity-note">${escapeHtml(page.editorialAlert)}</div>` : ""}
          <div class="credits-grid">${commHtml}</div>
          <blockquote class="ed-quote" style="font-size:0.86rem;" ${editableAttr("colofon")}>
            <strong>COLOFÓN INSTITUCIONAL:</strong> ${escapeHtml(page.colofon)}
          </blockquote>
          <h2 class="ed-heading">Citas y Referencias Bibliográficas APA (${(page.bibliography || []).length} entradas registradas)</h2>
          <div class="glossary-search-bar">
            <input type="search" class="glossary-input" placeholder="Filtrar autor, año, título o fuente en la Bibliografía APA..." data-bib-search="1" />
          </div>
          <div class="bib-list">${bibHtml}</div>
        `;
      }

      return `
        <article class="magazine-page interior-page ${leafSide}" data-page-number="${page.pageNumber}" data-page-id="${escapeHtml(page.id)}">
          ${headerHtml}
          <div class="page-content-scroll">
            ${bodyHtml}
          </div>
          ${footerHtml}
        </article>
      `;
    }

    renderCurrentSpread(turnDirection = null) {
      const spreadContainer = document.getElementById("flipbook-spread");
      if (!spreadContainer) return;

      const visiblePages = this.getVisiblePages();
      if (turnDirection) {
        this.isTurning = true;
        spreadContainer.classList.remove("turning-next", "turning-prev");
        void spreadContainer.offsetWidth;
        spreadContainer.classList.add(turnDirection === "next" ? "turning-next" : "turning-prev");
        setTimeout(() => {
          spreadContainer.classList.remove("turning-next", "turning-prev");
          this.isTurning = false;
        }, 560);
      }

      if (visiblePages.length === 1) {
        spreadContainer.innerHTML = this.renderSinglePageHTML(visiblePages[0], "single-leaf");
      } else {
        spreadContainer.innerHTML =
          this.renderSinglePageHTML(visiblePages[0], "left-leaf") +
          this.renderSinglePageHTML(visiblePages[1], "right-leaf");
      }

      this.updateNavigationControls(visiblePages);
    }

    updateNavigationControls(visiblePages) {
      const total = this.totalPages();
      const firstNum = visiblePages[0].pageNumber;
      const lastNum = visiblePages[visiblePages.length - 1].pageNumber;

      const prevBtn = document.getElementById("nav-prev-btn");
      const nextBtn = document.getElementById("nav-next-btn");
      if (prevBtn) prevBtn.disabled = firstNum <= 1;
      if (nextBtn) nextBtn.disabled = lastNum >= total;

      const indicator = document.getElementById("page-counter-label");
      if (indicator) {
        indicator.textContent =
          firstNum === lastNum
            ? `PÁGINA ${firstNum} DE ${total}`
            : `PÁGINAS ${firstNum}–${lastNum} DE ${total}`;
      }

      const progressFill = document.getElementById("magazine-progress-fill");
      if (progressFill) {
        const pct = Math.round((lastNum / total) * 100);
        progressFill.style.width = pct + "%";
      }

      // Actualizar botones de eliminación/duplicación en Modo Editor si estamos en Portada/Contraportada
      const hasUnlockedInterior = visiblePages.some((p) => !p.locked);
      ["ed-btn-dup-page", "ed-btn-move-prev", "ed-btn-move-next", "ed-btn-del-page", "ed-btn-insert-media"].forEach(
        (id) => {
          const btn = document.getElementById(id);
          if (btn) btn.disabled = !hasUnlockedInterior;
        }
      );
    }

    populateIndexModal() {
      const listEl = document.getElementById("index-modal-list");
      if (!listEl) return;
      const tocPage = this.data.pages.find((p) => p.type === "toc");
      const entries = (tocPage && tocPage.tocEntries) || [];
      listEl.innerHTML = entries
        .map(
          (e) => `
          <button type="button" class="toc-item" data-goto-page="${e.targetPage}" style="background:#172A3E;border-color:rgba(255,255,255,0.15);color:#F5F3EE;">
            <span class="toc-num" style="color:#D4A359;">${escapeHtml(e.num)}</span>
            <div class="toc-main">
              <span class="toc-entry-title" style="color:#FFFFFF;">${escapeHtml(e.title)}</span>
              <span class="toc-entry-authors" style="color:#B8C7D6;">${escapeHtml(e.authors)}</span>
            </div>
            <span class="toc-page-badge" style="color:#D4A359;">Pág. ${e.targetPage}</span>
          </button>
        `
        )
        .join("");
    }

    bindNavigationEvents() {
      // Flechas de avance y retroceso
      const prevBtn = document.getElementById("nav-prev-btn");
      const nextBtn = document.getElementById("nav-next-btn");
      if (prevBtn) prevBtn.addEventListener("click", () => this.prevSpread());
      if (nextBtn) nextBtn.addEventListener("click", () => this.nextSpread(false));

      // Delegación para botón "ABRIR REVISTA" y enlaces a páginas del índice
      document.addEventListener("click", (e) => {
        if (e.target.closest("#open-magazine-cover-btn")) {
          this.nextSpread(true);
          return;
        }
        const gotoBtn = e.target.closest("[data-goto-page]");
        if (gotoBtn) {
          const p = parseInt(gotoBtn.getAttribute("data-goto-page"), 10);
          const idxModal = document.getElementById("index-modal");
          if (idxModal) idxModal.classList.remove("open");
          this.goToPage(p);
        }
      });

      // Barra de progreso clicable
      const progTrack = document.getElementById("magazine-progress-track");
      if (progTrack) {
        progTrack.addEventListener("click", (e) => {
          const rect = progTrack.getBoundingClientRect();
          const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          const target = Math.max(1, Math.round(ratio * this.totalPages()));
          this.goToPage(target);
        });
      }

      // Navegación mediante teclado (Flechas izquierda / derecha y Escape para cerrar modales)
      document.addEventListener("keydown", (e) => {
        if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable)) {
          return;
        }
        if (e.key === "ArrowRight") {
          this.nextSpread(false);
        } else if (e.key === "ArrowLeft") {
          this.prevSpread();
        } else if (e.key === "Escape") {
          document.querySelectorAll(".editorial-modal-backdrop.open").forEach((m) => {
            if (m.id === "video-modal") {
              window.EditorialInteractions.closeVideoModal();
            } else {
              m.classList.remove("open");
            }
          });
        }
      });

      // Cambio automático entre 2 páginas (escritorio) y 1 página (móvil)
      window.addEventListener("resize", () => {
        const nowDesktop = window.innerWidth >= 1024;
        if (nowDesktop !== this.isDesktopSpread) {
          this.isDesktopSpread = nowDesktop;
          this.renderCurrentSpread();
        }
      });

      // Botón Índice Interactivo en Topbar
      const openIdxBtn = document.getElementById("topbar-index-btn");
      if (openIdxBtn) {
        openIdxBtn.addEventListener("click", () => {
          this.populateIndexModal();
          document.getElementById("index-modal").classList.add("open");
        });
      }

      // Botón ir directamente al Glosario (pág. 35)
      const openGlosBtn = document.getElementById("topbar-glossary-btn");
      if (openGlosBtn) {
        openGlosBtn.addEventListener("click", () => this.goToPage(35));
      }

      // Botón Pantalla Completa
      const fsBtn = document.getElementById("topbar-fullscreen-btn");
      if (fsBtn) {
        fsBtn.addEventListener("click", () => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
        });
      }

      // Cerrar modales
      document.querySelectorAll("[data-close-modal]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const modalId = btn.getAttribute("data-close-modal");
          if (modalId === "video-modal") {
            window.EditorialInteractions.closeVideoModal();
          } else {
            const m = document.getElementById(modalId);
            if (m) m.classList.remove("open");
          }
        });
      });
    }

    async start() {
      this.bindNavigationEvents();
      if (window.EditorialAudio) {
        window.EditorialAudio.renderTrackOptions();
        window.EditorialAudio.updateUI();
        const playBtn = document.getElementById("audio-play-btn");
        const muteBtn = document.getElementById("audio-mute-btn");
        const paperBtn = document.getElementById("audio-paper-btn");
        const volSlider = document.getElementById("audio-volume-slider");
        const trackSel = document.getElementById("audio-track-select");

        if (playBtn) playBtn.addEventListener("click", () => window.EditorialAudio.togglePlay());
        if (muteBtn) muteBtn.addEventListener("click", () => window.EditorialAudio.toggleMute());
        if (paperBtn) paperBtn.addEventListener("click", () => window.EditorialAudio.togglePaperSound());
        if (volSlider) volSlider.addEventListener("input", (e) => window.EditorialAudio.setVolume(e.target.value));
        if (trackSel) trackSel.addEventListener("change", (e) => window.EditorialAudio.selectTrack(e.target.value));
      }

      if (window.EditorialInteractions) {
        window.EditorialInteractions.attachGlobalInteractionListeners(
          () => this.getData(),
          () => this.renderCurrentSpread()
        );
      }

      if (window.EditorialEditor) {
        await window.EditorialEditor.init(this);
      }

      this.renderCurrentSpread();
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    window.MagazineApp = new EditorialMagazineApp();
    window.MagazineApp.start();
  });
})();
