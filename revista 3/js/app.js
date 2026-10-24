/**
 * CONTROLADOR PRINCIPAL DE LA PLATAFORMA WEB INTERACTIVA (Secciones 2 a 21)
 * - Sustituye completamente el flipbook físico por una navegación web moderna y fluida
 * - Conserva el 100% del contenido del documento Word (Editorial, 6 Monografías completas,
 *   Recomendaciones Culturales, ¿Sabías que?, 63 términos del Glosario, 157 referencias APA,
 *   Comité Editorial, Colofón, Portada original intacta y Contraportada original intacta)
 * - Maquetación diferenciada para cada artículo con tonos Blanco Cálido, Crema, Beige y Café
 */
(function () {
  const STORAGE_KEY_DATA = "revista_web_v2_data";

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  class ModernEditorialWebApp {
    constructor() {
      this.data = this.loadInitialData();
      this.activeGalleryCategory = "Todas";
      this.activeGlossaryCategory = "Todos";
      this.glossaryQuery = "";
      this.bibQuery = "";
    }

    loadInitialData() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_DATA);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.articles) && parsed.articles.length >= 6) {
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
      this.renderAllSections();
    }

    editableAttr(sectionId, fieldPath) {
      return window.EditorialEditor && window.EditorialEditor.isEditorMode
        ? `contenteditable="true" data-edit-section="${escapeHtml(sectionId)}" data-edit-field="${escapeHtml(fieldPath)}"`
        : "";
    }

    /* 1. Renderizar Editorial e Índice de Contenidos */
    renderEditorialAndTOC() {
      const edContainer = document.getElementById("editorial-content-mount");
      const tocContainer = document.getElementById("toc-cards-mount");
      const navDropdown = document.getElementById("nav-articles-dropdown");
      const mediaTargetSelect = document.getElementById("media-target-section");

      const ed = this.data.editorialSection;
      if (edContainer && ed) {
        const parasHtml = (ed.paragraphs || [])
          .map(
            (p, idx) =>
              `<p class="ed-paragraph" ${this.editableAttr("editorial", `paragraphs.${idx}`)}>${escapeHtml(p)}</p>`
          )
          .join("");

        const pillarsHtml = (ed.pillars || [])
          .map(
            (pl) => `
            <div class="pillar-box">
              <span class="ed-kicker" style="margin-bottom:4px;">${escapeHtml(pl.code)}</span>
              <h4 style="font-family:var(--font-title);font-size:1.05rem;color:var(--brown-dark);margin-bottom:4px;">${escapeHtml(pl.name)}</h4>
              <p class="ed-caption" style="margin-bottom:0;">${escapeHtml(pl.desc)}</p>
            </div>
          `
          )
          .join("");

        edContainer.innerHTML = `
          <div class="editorial-layout">
            <div>
              <span class="ed-kicker" ${this.editableAttr("editorial", "kicker")}>${escapeHtml(ed.kicker)}</span>
              <h2 class="ed-title" ${this.editableAttr("editorial", "title")}>${escapeHtml(ed.title)}</h2>
              <p class="ed-subtitle" ${this.editableAttr("editorial", "subtitle")}>${escapeHtml(ed.subtitle)}</p>
              <div class="ed-authors" style="margin-bottom:18px;" ${this.editableAttr("editorial", "authors")}>
                <strong>Dirección Editorial:</strong> ${escapeHtml(ed.authors)}
              </div>
              ${parasHtml}
              <blockquote class="ed-quote" ${this.editableAttr("editorial", "pullQuote")}>
                ${escapeHtml(ed.pullQuote)}
              </blockquote>
            </div>
            <div>
              <div class="warm-card" style="background:var(--warm-white);">
                <span class="ed-kicker">ARQUITECTURA TEMÁTICA DEL PROYECTO</span>
                <h3 style="font-family:var(--font-title);font-size:1.3rem;color:var(--brown-dark);margin-bottom:16px;">Cuatro Ejes Interdisciplinarios</h3>
                <div class="pillars-stack">${pillarsHtml}</div>
              </div>
            </div>
          </div>
        `;
      }

      const articles = this.data.articles || [];
      if (tocContainer) {
        tocContainer.innerHTML = articles
          .map(
            (art, idx) => `
            <article class="toc-web-card">
              <div>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                  <span class="toc-card-num">0${idx + 1}</span>
                  <span class="ed-caption" style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.08em;">${escapeHtml(art.tag)}</span>
                </div>
                <h3 style="font-family:var(--font-title);font-size:1.18rem;color:var(--brown-dark);line-height:1.3;margin-bottom:8px;">
                  ${escapeHtml(art.title)}
                </h3>
                <p class="ed-caption" style="margin-bottom:10px;"><strong>Autores:</strong> ${escapeHtml(art.authors)}</p>
                <p class="ed-paragraph" style="font-size:0.88rem;margin-bottom:0;color:var(--ink-muted);">
                  ${escapeHtml((art.resumen || "").slice(0, 180))}...
                </p>
              </div>
              <div style="padding-top:12px;border-top:1px solid var(--beige-light);display:flex;justify-content:space-between;align-items:center;">
                <span class="ed-caption" style="font-size:0.76rem;">${(art.chapters || []).length} apartados + actividades</span>
                <a href="#${escapeHtml(art.id)}" class="btn-editorial btn-outline btn-sm">Leer investigación →</a>
              </div>
            </article>
          `
          )
          .join("");
      }

      if (navDropdown) {
        navDropdown.innerHTML = articles
          .map(
            (art, idx) =>
              `<a href="#${escapeHtml(art.id)}" class="nav-dropdown-item">0${idx + 1}. ${escapeHtml(art.title.slice(0, 52))}...</a>`
          )
          .join("");
      }

      if (mediaTargetSelect) {
        mediaTargetSelect.innerHTML = articles
          .map(
            (art, idx) =>
              `<option value="${escapeHtml(art.id)}">Monografía 0${idx + 1}: ${escapeHtml(art.title.slice(0, 48))}...</option>`
          )
          .join("");
      }
    }

    /* 2. Renderizar las 6 Monografías con Diseños Diferenciados */
    renderArticles() {
      const mount = document.getElementById("articles-sections-mount");
      if (!mount) return;
      const articles = this.data.articles || [];

      mount.innerHTML = articles
        .map((art, artIdx) => {
          const secId = art.id;
          const bgStyle = art.themeBg ? `style="background-color:${escapeHtml(art.themeBg)};"` : "";

          // Barra de control del Modo Editor para esta sección
          const editorStripHtml = `
            <div class="section-editor-strip">
              <span><strong>Modo Editor · Sección 0${artIdx + 1}:</strong> Personaliza el fondo o el orden de este artículo</span>
              <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                <div class="bg-swatch-group">
                  <span>Fondo:</span>
                  <button type="button" class="bg-swatch-btn" style="background:#FCFAF7;" title="Blanco cálido (#FCFAF7)" data-sec-id="${escapeHtml(secId)}" data-sec-bg-color="#FCFAF7"></button>
                  <button type="button" class="bg-swatch-btn" style="background:#F7F2EB;" title="Crema (#F7F2EB)" data-sec-id="${escapeHtml(secId)}" data-sec-bg-color="#F7F2EB"></button>
                  <button type="button" class="bg-swatch-btn" style="background:#E9DFD0;" title="Beige claro (#E9DFD0)" data-sec-id="${escapeHtml(secId)}" data-sec-bg-color="#E9DFD0"></button>
                  <button type="button" class="bg-swatch-btn" style="background:#EFE5D4;" title="Arena suave (#EFE5D4)" data-sec-id="${escapeHtml(secId)}" data-sec-bg-color="#EFE5D4"></button>
                </div>
                <button type="button" class="btn-editorial btn-outline btn-sm" data-move-sec-up="${escapeHtml(secId)}">↑ Subir sección</button>
                <button type="button" class="btn-editorial btn-outline btn-sm" data-move-sec-down="${escapeHtml(secId)}">↓ Bajar sección</button>
              </div>
            </div>
          `;

          // Resumen y Abstract bilingüe
          const abstractHtml = `
            <div class="bilingual-abstract-card">
              <div class="abstract-tab-header">
                <button type="button" class="abstract-lang-btn active" data-abstract-lang="es">Resumen Académico (ES)</button>
                <button type="button" class="abstract-lang-btn" data-abstract-lang="en">Abstract (EN)</button>
              </div>
              <div class="abstract-pane-es">
                <p class="ed-paragraph" style="max-width:none;margin-bottom:8px;" ${this.editableAttr(secId, "resumen")}>${escapeHtml(art.resumen)}</p>
                <div class="keywords-bar"><strong>Palabras clave:</strong> <span ${this.editableAttr(secId, "palabrasClave")}>${escapeHtml(art.palabrasClave)}</span></div>
              </div>
              <div class="abstract-pane-en" style="display:none;">
                <p class="ed-paragraph" style="max-width:none;margin-bottom:8px;font-style:italic;" ${this.editableAttr(secId, "abstract")}>${escapeHtml(art.abstract)}</p>
                <div class="keywords-bar"><strong>Keywords:</strong> <span ${this.editableAttr(secId, "keywords")}>${escapeHtml(art.keywords)}</span></div>
              </div>
            </div>
          `;

          // Renderizar figuras del artículo
          const renderFigureCard = (imgObj, imgIdx) => `
            <figure class="web-figure-card">
              <button type="button" class="replace-img-btn" data-article-id="${escapeHtml(secId)}" data-img-idx="${imgIdx}">Cambiar fotografía</button>
              <div class="web-figure-img-wrap" data-lightbox-src="${escapeHtml(imgObj.src)}" data-lightbox-title="${escapeHtml(imgObj.title)}" data-lightbox-caption="${escapeHtml(imgObj.caption)}">
                <img src="${escapeHtml(imgObj.src)}" alt="${escapeHtml(imgObj.title)}" loading="lazy" />
                <span class="zoom-pill">Ampliar imagen +</span>
              </div>
              <figcaption style="padding-top:12px;">
                <h4 style="font-family:var(--font-title);font-size:0.98rem;color:var(--brown-dark);margin-bottom:4px;" ${this.editableAttr(secId, `images.${imgIdx}.title`)}>${escapeHtml(imgObj.title)}</h4>
                <p class="ed-caption" ${this.editableAttr(secId, `images.${imgIdx}.caption`)}>${escapeHtml(imgObj.caption)}</p>
              </figcaption>
            </figure>
          `;

          const images = art.images || [];
          const primaryImgHtml = images[0] ? renderFigureCard(images[0], 0) : "";
          const extraImagesHtml =
            images.length > 1
              ? `<div class="figures-multi-grid">${images
                  .slice(1)
                  .map((im, idx) => renderFigureCard(im, idx + 1))
                  .join("")}</div>`
              : "";

          // Renderizar capítulos del artículo con desplegables "LEER MÁS / DESCUBRIR MÁS"
          const renderChapterBlock = (ch, cIdx, useTwoCols = false) => {
            const paras = ch.paragraphs || [];
            const directParas = paras.slice(0, 4);
            const moreParas = paras.slice(4);

            const directHtml = directParas
              .map(
                (p, pIdx) =>
                  `<p class="ed-paragraph" ${this.editableAttr(secId, `chapters.${cIdx}.paragraphs.${pIdx}`)}>${escapeHtml(p)}</p>`
              )
              .join("");

            const expandableHtml = moreParas.length
              ? `
                <div class="expandable-section open">
                  <button type="button" class="expandable-trigger">
                    <span>Desarrollo complementario del capítulo (${moreParas.length} párrafos)</span>
                    <span class="exp-action-label">OCULTAR INFORMACIÓN −</span>
                  </button>
                  <div class="expandable-content ${useTwoCols ? "article-two-columns-text" : ""}">
                    ${moreParas
                      .map(
                        (p, mIdx) =>
                          `<p class="ed-paragraph" ${this.editableAttr(secId, `chapters.${cIdx}.paragraphs.${mIdx + 4}`)}>${escapeHtml(p)}</p>`
                      )
                      .join("")}
                  </div>
                </div>
              `
              : "";

            return `
              <div class="chapter-block">
                <h3 class="ed-heading" ${this.editableAttr(secId, `chapters.${cIdx}.heading`)}>${escapeHtml(ch.heading)}</h3>
                ${ch.editorialAlert ? `<div class="fidelity-alert">${escapeHtml(ch.editorialAlert)}</div>` : ""}
                <div class="${useTwoCols && directParas.length >= 3 ? "article-two-columns-text" : ""}">${directHtml}</div>
                ${expandableHtml}
              </div>
            `;
          };

          const chapters = art.chapters || [];
          const firstChapterHtml = chapters[0] ? renderChapterBlock(chapters[0], 0, false) : "";
          const remainingChaptersHtml = chapters
            .slice(1)
            .map((ch, idx) => renderChapterBlock(ch, idx + 1, artIdx % 2 === 1))
            .join("");

          // Alternar el diseño superior según el estilo del artículo (split-left-image, asymmetric, etc.)
          let topLeadLayoutHtml = "";
          if (primaryImgHtml && artIdx % 2 === 0) {
            topLeadLayoutHtml = `
              <div class="article-split-layout">
                <div>
                  ${primaryImgHtml}
                  ${art.pullQuote ? `<blockquote class="ed-quote" ${this.editableAttr(secId, "pullQuote")}>${escapeHtml(art.pullQuote)}</blockquote>` : ""}
                </div>
                <div>${firstChapterHtml}</div>
              </div>
            `;
          } else if (primaryImgHtml) {
            topLeadLayoutHtml = `
              <div class="article-asymmetric-layout">
                <div>
                  ${firstChapterHtml}
                  ${art.pullQuote ? `<blockquote class="ed-quote" ${this.editableAttr(secId, "pullQuote")}>${escapeHtml(art.pullQuote)}</blockquote>` : ""}
                </div>
                <div>${primaryImgHtml}</div>
              </div>
            `;
          } else {
            topLeadLayoutHtml = `
              <div>
                ${firstChapterHtml}
                ${art.pullQuote ? `<blockquote class="ed-quote" ${this.editableAttr(secId, "pullQuote")}>${escapeHtml(art.pullQuote)}</blockquote>` : ""}
              </div>
            `;
          }

          // Tarjeta comparativa si existe (ej. Espectador analizador vs superficial en Monografía 1)
          let compCardHtml = "";
          if (art.comparisonCard) {
            const c = art.comparisonCard;
            compCardHtml = `
              <div class="interactive-panel">
                <div class="panel-header-row"><span class="panel-badge">${escapeHtml(c.title)}</span></div>
                <div class="interactive-grid-two" style="margin-top:10px;">
                  <div class="pillar-box">
                    <h4 style="font-family:var(--font-title);font-size:1.05rem;color:var(--brown-dark);margin-bottom:8px;">${escapeHtml(c.leftTitle)}</h4>
                    ${c.leftItems.map((it) => `<p class="ed-caption" style="margin-bottom:6px;color:var(--ink-body);">• ${escapeHtml(it)}</p>`).join("")}
                  </div>
                  <div class="pillar-box">
                    <h4 style="font-family:var(--font-title);font-size:1.05rem;color:var(--brown-dark);margin-bottom:8px;">${escapeHtml(c.rightTitle)}</h4>
                    ${c.rightItems.map((it) => `<p class="ed-caption" style="margin-bottom:6px;color:var(--ink-body);">• ${escapeHtml(it)}</p>`).join("")}
                  </div>
                </div>
              </div>
            `;
          }

          // Tarjeta de video de YouTube si existe en el artículo
          let videoCardHtml = "";
          if (art.videoCard) {
            const vc = art.videoCard;
            videoCardHtml = `
              <div class="interactive-panel" style="border-top-color:var(--coffee-light);">
                <div class="panel-header-row">
                  <span class="panel-badge">${escapeHtml(vc.badge)}</span>
                  <span class="panel-badge">${escapeHtml(vc.channel)}</span>
                </div>
                <h4 class="panel-title">${escapeHtml(vc.title)}</h4>
                <p class="ed-paragraph" style="font-size:0.92rem;margin-bottom:14px;">${escapeHtml(vc.description)}</p>
                <div style="display:flex;flex-wrap:wrap;gap:10px;">
                  <button type="button" class="btn-editorial btn-sm" data-open-video="1" data-yt-id="${escapeHtml(vc.youtubeId || "")}" data-vid-title="${escapeHtml(vc.title)}" data-vid-desc="${escapeHtml(vc.description)}" data-vid-link="${escapeHtml(vc.searchUrl || "")}">
                    ${escapeHtml(vc.buttonLabel || "VER VIDEO")}
                  </button>
                  ${
                    vc.searchUrl
                      ? `<a href="${escapeHtml(vc.searchUrl)}" target="_blank" rel="noopener noreferrer" class="btn-editorial btn-outline btn-sm">Abrir en YouTube ↗</a>`
                      : ""
                  }
                </div>
              </div>
            `;
          }

          const timelineHtml = art.timelineId
            ? window.EditorialInteractions.renderTimelineWidget(art.timelineId, this.data)
            : "";
          const interviewHtml = art.interviewId
            ? window.EditorialInteractions.renderInterviewWidget(art.interviewId, this.data)
            : "";
          const infoHtml = art.infographicId
            ? window.EditorialInteractions.renderInfographicWidget(art.infographicId)
            : "";
          const quizHtml = art.quizId
            ? window.EditorialInteractions.renderQuizWidget(art.quizId, this.data)
            : "";
          const pollHtml = art.pollId
            ? window.EditorialInteractions.renderPollWidget(art.pollId, this.data)
            : "";

          return `
            <section class="article-web-section" id="${escapeHtml(secId)}" ${bgStyle}>
              <div class="web-container">
                ${editorStripHtml}
                <div class="article-top-meta">
                  <span class="ed-kicker" style="margin-bottom:0;" ${this.editableAttr(secId, "kicker")}>${escapeHtml(art.kicker)}</span>
                  <span class="article-tag-pill">${escapeHtml(art.tag)}</span>
                </div>
                <h2 class="ed-title" style="font-size:clamp(1.75rem, 2.8vw, 2.5rem);" ${this.editableAttr(secId, "title")}>${escapeHtml(art.title)}</h2>
                <div class="ed-authors" style="margin-bottom:14px;" ${this.editableAttr(secId, "authors")}>
                  <strong>Investigadores / Autores:</strong> ${escapeHtml(art.authors)}
                </div>
                ${art.editorialAlert ? `<div class="fidelity-alert">${escapeHtml(art.editorialAlert)}</div>` : ""}
                ${abstractHtml}
                ${topLeadLayoutHtml}
                ${extraImagesHtml}
                ${remainingChaptersHtml}
                ${compCardHtml}
                ${timelineHtml}
                ${interviewHtml}
                ${infoHtml}
                ${videoCardHtml}
                <div class="interactive-grid-two">
                  ${quizHtml}
                  ${pollHtml}
                </div>
              </div>
            </section>
          `;
        })
        .join("");
    }

    /* 3. Renderizar Galería Fotográfica Interactiva y Recomendaciones Culturales / Videos */
    renderGalleryAndMultimedia() {
      const filterBar = document.getElementById("gallery-filter-bar");
      const galleryGrid = document.getElementById("photo-gallery-mount");
      const culturalMount = document.getElementById("cultural-blocks-mount");

      const gallery = this.data.gallery || [];
      const categories = ["Todas", ...Array.from(new Set(gallery.map((g) => g.category)))];

      if (filterBar) {
        filterBar.innerHTML = categories
          .map(
            (cat) =>
              `<button type="button" class="filter-pill ${cat === this.activeGalleryCategory ? "active" : ""}" data-gallery-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`
          )
          .join("");
      }

      if (galleryGrid) {
        const filtered =
          this.activeGalleryCategory === "Todas"
            ? gallery
            : gallery.filter((g) => g.category === this.activeGalleryCategory);

        galleryGrid.innerHTML = filtered
          .map(
            (item) => `
            <article class="gallery-card" data-lightbox-src="${escapeHtml(item.src)}" data-lightbox-title="${escapeHtml(item.title)}" data-lightbox-caption="${escapeHtml(item.caption)}">
              <div class="gallery-thumb-wrap">
                <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.title)}" loading="lazy" />
              </div>
              <div class="gallery-card-body">
                <div>
                  <span class="ed-kicker" style="font-size:0.66rem;margin-bottom:4px;">${escapeHtml(item.category)}</span>
                  <h4 style="font-family:var(--font-title);font-size:0.98rem;color:var(--brown-dark);margin-bottom:6px;">${escapeHtml(item.title)}</h4>
                  <p class="ed-caption" style="font-size:0.8rem;">${escapeHtml(item.caption.slice(0, 115))}...</p>
                </div>
                <span class="ed-kicker" style="margin-top:10px;margin-bottom:0;font-size:0.68rem;">Ampliar fotografía →</span>
              </div>
            </article>
          `
          )
          .join("");
      }

      if (culturalMount && this.data.culturalBlocks) {
        const allCultural = [
          ...(this.data.culturalBlocks.block1 || []),
          ...(this.data.culturalBlocks.block2 || []),
          ...(this.data.culturalBlocks.block3 || [])
        ];

        culturalMount.innerHTML = allCultural
          .map(
            (item) => `
            <article class="media-card">
              <div class="media-card-top">
                <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" class="media-thumb" data-lightbox-src="${escapeHtml(item.image)}" data-lightbox-title="${escapeHtml(item.title)}" data-lightbox-caption="${escapeHtml(item.apa)}" loading="lazy" />
                <div>
                  <span class="ed-kicker" style="font-size:0.68rem;margin-bottom:4px;">${escapeHtml(item.category)} · ${escapeHtml(item.type)}</span>
                  <h4 style="font-family:var(--font-title);font-size:1.1rem;color:var(--brown-dark);margin-bottom:4px;">${escapeHtml(item.title)}</h4>
                  <p class="ed-caption" style="margin-bottom:8px;"><strong>Autor / Canal:</strong> ${escapeHtml(item.author)}</p>
                  <p class="ed-paragraph" style="font-size:0.88rem;margin-bottom:0;">${escapeHtml(item.description)}</p>
                </div>
              </div>
              <div>
                <div class="pillar-box" style="padding:8px 12px;margin-bottom:12px;font-size:0.78rem;">
                  <strong>Referencia APA:</strong> ${escapeHtml(item.apa)}
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:8px;">
                  ${
                    item.youtubeId
                      ? `<button type="button" class="btn-editorial btn-sm" data-open-video="1" data-yt-id="${escapeHtml(item.youtubeId)}" data-vid-title="${escapeHtml(item.title)}" data-vid-desc="${escapeHtml(item.description)}" data-vid-link="${escapeHtml(item.link)}">${escapeHtml(item.actionLabel || "VER VIDEO")}</button>`
                      : ""
                  }
                  <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="btn-editorial btn-outline btn-sm">Fuente Verificada ↗</a>
                </div>
              </div>
            </article>
          `
          )
          .join("");
      }
    }

    /* 4. Renderizar Sección «¿Sabías que?» y Glosario de 63 Términos */
    renderSabiasQueAndGlossary() {
      const sabiasMount = document.getElementById("sabias-que-mount");
      if (sabiasMount && this.data.sabiasQue) {
        sabiasMount.innerHTML = this.data.sabiasQue
          .map(
            (sq) => `
            <article class="warm-card" style="display:flex;flex-direction:column;justify-content:space-between;gap:14px;">
              <div>
                <span class="ed-kicker">${escapeHtml(sq.monograph)}</span>
                <h4 style="font-family:var(--font-title);font-size:1.12rem;color:var(--brown-dark);margin-bottom:10px;">${escapeHtml(sq.title)}</h4>
                <p class="ed-paragraph" style="font-size:0.92rem;margin-bottom:0;">${escapeHtml(sq.text)}</p>
              </div>
              <div>
                <a href="${escapeHtml(sq.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="btn-editorial btn-outline btn-sm">
                  Fuente: ${escapeHtml(sq.sourceLabel)} ↗
                </a>
              </div>
            </article>
          `
          )
          .join("");
      }

      this.renderGlossaryList();
    }

    renderGlossaryList() {
      const catBar = document.getElementById("glossary-cat-pills");
      const listMount = document.getElementById("glossary-cards-mount");
      const countLabel = document.getElementById("glossary-count-label");
      const glossary = this.data.glossary || [];

      const cats = ["Todos", ...Array.from(new Set(glossary.map((g) => g.category)))];
      if (catBar && !catBar.hasChildNodes()) {
        catBar.innerHTML = cats
          .map(
            (c) =>
              `<button type="button" class="filter-pill ${c === this.activeGlossaryCategory ? "active" : ""}" data-glossary-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`
          )
          .join("");
      } else if (catBar) {
        catBar.querySelectorAll("[data-glossary-cat]").forEach((btn) => {
          btn.classList.toggle("active", btn.getAttribute("data-glossary-cat") === this.activeGlossaryCategory);
        });
      }

      const q = this.glossaryQuery.trim().toLowerCase();
      const filtered = glossary.filter((g) => {
        const matchCat =
          this.activeGlossaryCategory === "Todos" || g.category === this.activeGlossaryCategory;
        const matchQ =
          !q ||
          g.term.toLowerCase().includes(q) ||
          g.definition.toLowerCase().includes(q) ||
          g.category.toLowerCase().includes(q);
        return matchCat && matchQ;
      });

      if (countLabel) {
        countLabel.textContent = `Mostrando ${filtered.length} de ${glossary.length} términos académicos`;
      }

      if (listMount) {
        listMount.innerHTML = filtered.length
          ? filtered
              .map(
                (g) => `
              <div class="glossary-item-card">
                <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:6px;">
                  <h5 style="font-family:var(--font-title);font-size:1rem;color:var(--brown-dark);">${g.num}. ${escapeHtml(g.term)}</h5>
                  <span class="ed-caption" style="font-size:0.7rem;color:var(--brown-medium);white-space:nowrap;">${escapeHtml(g.category)}</span>
                </div>
                <p class="ed-paragraph" style="font-size:0.88rem;margin-bottom:0;">${escapeHtml(g.definition)}</p>
              </div>
            `
              )
              .join("")
          : `<p class="ed-caption">No se encontraron términos que coincidan con la búsqueda actual.</p>`;
      }
    }

    /* 5. Renderizar Bibliografía APA (157 entradas) y Comité Editorial / Créditos */
    renderBibliographyAndCredits() {
      const bibMount = document.getElementById("bibliography-list-mount");
      const bibCount = document.getElementById("bib-count-label");
      const creditsMount = document.getElementById("credits-committees-mount");
      const colofonMount = document.getElementById("colofon-box-mount");

      const bib = this.data.bibliography || [];
      const q = this.bibQuery.trim().toLowerCase();
      const filteredBib = q ? bib.filter((b) => b.text.toLowerCase().includes(q)) : bib;

      if (bibCount) {
        bibCount.textContent = `Mostrando ${filteredBib.length} de ${bib.length} referencias y fuentes verificadas`;
      }

      if (bibMount) {
        bibMount.innerHTML = filteredBib
          .map(
            (b) => `
            <div class="bib-entry-row">
              <span>${escapeHtml(b.text)}</span>
              ${
                b.url
                  ? ` <a href="${escapeHtml(b.url)}" target="_blank" rel="noopener noreferrer" style="font-weight:600;margin-left:6px;">[Consultar fuente ↗]</a>`
                  : ""
              }
            </div>
          `
          )
          .join("");
      }

      const cred = this.data.creditsSection;
      if (creditsMount && cred) {
        creditsMount.innerHTML = (cred.committees || [])
          .map(
            (cm) => `
            <div class="warm-card">
              <span class="ed-kicker">EQUIPO DE TRABAJO</span>
              <h4 style="font-family:var(--font-title);font-size:1.15rem;color:var(--brown-dark);margin-bottom:12px;">${escapeHtml(cm.role)}</h4>
              <ul style="list-style:none;display:flex;flex-direction:column;gap:6px;">
                ${cm.members.map((m) => `<li class="ed-caption" style="color:var(--ink-body);">• ${escapeHtml(m)}</li>`).join("")}
              </ul>
            </div>
          `
          )
          .join("");
      }

      if (colofonMount && cred) {
        colofonMount.innerHTML = `
          ${cred.editorialAlert ? `<div class="fidelity-alert">${escapeHtml(cred.editorialAlert)}</div>` : ""}
          <blockquote class="ed-quote" style="margin-top:24px;">
            <strong>COLOFÓN OFICIAL:</strong> ${escapeHtml(cred.colofon)}
          </blockquote>
        `;
      }
    }

    renderAllSections() {
      this.renderEditorialAndTOC();
      this.renderArticles();
      this.renderGalleryAndMultimedia();
      this.renderSabiasQueAndGlossary();
      this.renderBibliographyAndCredits();
    }

    bindWebNavigation() {
      // Menú móvil
      const mobBtn = document.getElementById("mobile-menu-btn");
      const navLinks = document.getElementById("main-nav-links");
      if (mobBtn && navLinks) {
        mobBtn.addEventListener("click", () => {
          navLinks.classList.toggle("mobile-open");
        });
        navLinks.addEventListener("click", (e) => {
          if (e.target.closest("a")) {
            navLinks.classList.remove("mobile-open");
          }
        });
      }

      // Botón Explorar del Inicio (activa música suave tras interacción y desplaza a Editorial)
      const exploreBtn = document.getElementById("hero-explore-btn");
      if (exploreBtn) {
        exploreBtn.addEventListener("click", () => {
          if (window.EditorialAudio && !window.EditorialAudio.isPlaying) {
            window.EditorialAudio.startWithFadeIn();
          }
        });
      }

      const heroAudioBtn = document.getElementById("hero-audio-btn");
      if (heroAudioBtn) {
        heroAudioBtn.addEventListener("click", () => {
          if (window.EditorialAudio) {
            window.EditorialAudio.togglePlay();
          }
        });
      }

      // Filtros de Galería y Glosario
      document.addEventListener("click", (e) => {
        const galCatBtn = e.target.closest("[data-gallery-cat]");
        if (galCatBtn) {
          this.activeGalleryCategory = galCatBtn.getAttribute("data-gallery-cat");
          this.renderGalleryAndMultimedia();
          return;
        }

        const glosCatBtn = e.target.closest("[data-glossary-cat]");
        if (glosCatBtn) {
          this.activeGlossaryCategory = glosCatBtn.getAttribute("data-glossary-cat");
          this.renderGlossaryList();
          return;
        }

        const closeBtn = e.target.closest("[data-close-modal]");
        if (closeBtn) {
          const modalId = closeBtn.getAttribute("data-close-modal");
          if (modalId === "video-modal") {
            window.EditorialInteractions.closeVideoModal();
          } else {
            const m = document.getElementById(modalId);
            if (m) m.classList.remove("open");
          }
        }
      });

      // Buscadores en vivo de Glosario y Bibliografía
      const glosInput = document.getElementById("glossary-search-input");
      if (glosInput) {
        glosInput.addEventListener("input", (e) => {
          this.glossaryQuery = e.target.value;
          this.renderGlossaryList();
        });
      }

      const bibInput = document.getElementById("bib-search-input");
      if (bibInput) {
        bibInput.addEventListener("input", (e) => {
          this.bibQuery = e.target.value;
          this.renderBibliographyAndCredits();
        });
      }

      // Botón Volver Arriba y Sombra de Navbar al hacer scroll + Indicador de sección activa
      const navbar = document.getElementById("site-navbar");
      const backTopBtn = document.getElementById("back-to-top-btn");
      const sections = ["inicio", "editorial", "articulos", "multimedia", "interactividad", "fuentes", "creditos"];

      window.addEventListener("scroll", () => {
        const y = window.scrollY;
        if (navbar) navbar.classList.toggle("scrolled", y > 20);
        if (backTopBtn) backTopBtn.classList.toggle("visible", y > 480);

        let currentSec = "inicio";
        sections.forEach((id) => {
          const el = document.getElementById(id);
          if (el && y >= el.offsetTop - 160) {
            currentSec = id;
          }
        });
        document.querySelectorAll(".nav-link[data-sec-link]").forEach((lnk) => {
          lnk.classList.toggle("active", lnk.getAttribute("data-sec-link") === currentSec);
        });
      });

      if (backTopBtn) {
        backTopBtn.addEventListener("click", () => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }

      // Teclado para Lightbox y Modales
      document.addEventListener("keydown", (e) => {
        const lb = document.getElementById("lightbox-modal");
        if (lb && lb.classList.contains("open")) {
          if (e.key === "ArrowRight") window.EditorialInteractions.stepLightbox(1);
          if (e.key === "ArrowLeft") window.EditorialInteractions.stepLightbox(-1);
        }
        if (e.key === "Escape") {
          document.querySelectorAll(".modal-backdrop.open").forEach((m) => {
            if (m.id === "video-modal") window.EditorialInteractions.closeVideoModal();
            else m.classList.remove("open");
          });
        }
      });
    }

    async start() {
      this.renderAllSections();
      this.bindWebNavigation();

      if (window.EditorialAudio) {
        window.EditorialAudio.renderTrackOptions();
        window.EditorialAudio.updateUI();
        const playBtn = document.getElementById("audio-play-btn");
        const muteBtn = document.getElementById("audio-mute-btn");
        const volSlider = document.getElementById("audio-volume-slider");
        const trackSel = document.getElementById("audio-track-select");

        if (playBtn) playBtn.addEventListener("click", () => window.EditorialAudio.togglePlay());
        if (muteBtn) muteBtn.addEventListener("click", () => window.EditorialAudio.toggleMute());
        if (volSlider) volSlider.addEventListener("input", (e) => window.EditorialAudio.setVolume(e.target.value));
        if (trackSel) trackSel.addEventListener("change", (e) => window.EditorialAudio.selectTrack(e.target.value));
      }

      if (window.EditorialInteractions) {
        window.EditorialInteractions.attachGlobalInteractionListeners(() => this.getData());
      }

      if (window.EditorialEditor) {
        await window.EditorialEditor.init(this);
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    window.WebApp = new ModernEditorialWebApp();
    window.WebApp.start();
  });
})();
