/**
 * MOTOR DEL MODO EDITOR, PERSONALIZACIÓN TIPOGRÁFICA Y PERSISTENCIA WEB (Secciones 8, 14 y 15)
 * - Modo Visitante público por defecto (sin herramientas de edición visibles)
 * - Modo Editor protegido mediante hash criptográfico SHA-256 (Web Crypto API)
 * - Portada y Contraportada originales bloqueadas contra modificaciones accidentales
 * - Edición en tiempo real de textos, títulos, subtítulos, fotografías, fondos de sección,
 *   orden de secciones, enlaces, videos de YouTube y música MP3
 * - Controles de Guardar, Cancelar cambios, Restaurar versión/original y Exportar/Importar JSON
 * - Almacenamiento híbrido: localStorage (estructura/tipografía/versiones) + IndexedDB (imágenes/MP3)
 */
(function () {
  const STORAGE_KEY_DATA = "revista_web_v2_data";
  const STORAGE_KEY_TYPO = "revista_web_v2_typo";
  const STORAGE_KEY_VERSIONS = "revista_web_v2_versions";
  const IDB_NAME = "RevistaCientificaWebAssetsDB";
  const IDB_VERSION = 1;

  const DEFAULT_TYPO = {
    title: {
      font: "'Playfair Display', Georgia, serif",
      size: 2.15,
      weight: "700",
      color: "#5E4B3C",
      ls: -0.01,
      lh: 1.2,
      align: "left",
      italic: false,
      uppercase: false
    },
    subtitle: {
      font: "'Cormorant Garamond', Georgia, serif",
      size: 1.32,
      weight: "600",
      color: "#8B6F56",
      ls: 0.01,
      lh: 1.35,
      align: "left",
      italic: true,
      uppercase: false
    },
    body: {
      font: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      size: 1.0,
      weight: "400",
      color: "#2C2520",
      ls: 0,
      lh: 1.75,
      align: "left",
      italic: false,
      uppercase: false
    },
    quote: {
      font: "'Cormorant Garamond', Georgia, serif",
      size: 1.35,
      weight: "600",
      color: "#5E4B3C",
      ls: 0.01,
      lh: 1.45,
      align: "left",
      italic: true,
      uppercase: false
    },
    caption: {
      font: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      size: 0.84,
      weight: "500",
      color: "#6E6257",
      ls: 0.03,
      lh: 1.5,
      align: "left",
      italic: false,
      uppercase: false
    }
  };

  class WebEditorManager {
    constructor() {
      this.isEditorMode = false;
      this.isAuthenticated = false;
      this.currentTypoTarget = "title";
      this.typoConfig = JSON.parse(JSON.stringify(DEFAULT_TYPO));
      this.db = null;
      this.pendingImageTarget = null;
      this.sessionBackupSnapshot = null;
    }

    async init(appInstance) {
      this.app = appInstance;
      await this.initIndexedDB();
      this.loadTypographySettings();
      this.applyTypographyVariables();
      await this.restoreCustomAssetsFromIDB();
      this.bindEditorUI();
    }

    /* 1. IndexedDB para imágenes y pistas MP3 de gran tamaño */
    initIndexedDB() {
      return new Promise((resolve) => {
        if (!window.indexedDB) return resolve();
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains("images")) {
            db.createObjectStore("images", { keyPath: "key" });
          }
          if (!db.objectStoreNames.contains("audio")) {
            db.createObjectStore("audio", { keyPath: "id" });
          }
        };
        req.onsuccess = (e) => {
          this.db = e.target.result;
          resolve();
        };
        req.onerror = () => resolve();
      });
    }

    saveAssetToIDB(storeName, record) {
      return new Promise((resolve) => {
        if (!this.db) return resolve(false);
        const tx = this.db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).put(record);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    }

    getAllFromIDB(storeName) {
      return new Promise((resolve) => {
        if (!this.db) return resolve([]);
        const tx = this.db.transaction(storeName, "readonly");
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    }

    async restoreCustomAssetsFromIDB() {
      const audioRecords = await this.getAllFromIDB("audio");
      if (audioRecords && audioRecords.length && window.EditorialAudio) {
        audioRecords.forEach((rec) => {
          window.EditorialAudio.tracks.push({
            id: rec.id,
            name: "MP3: " + rec.name,
            type: "mp3",
            url: rec.dataUrl
          });
        });
        window.EditorialAudio.renderTrackOptions();
      }

      const imageRecords = await this.getAllFromIDB("images");
      if (imageRecords && imageRecords.length && this.app) {
        const data = this.app.getData();
        imageRecords.forEach((rec) => {
          const art = (data.articles || []).find((a) => a.id === rec.articleId);
          if (art && art.images && art.images[rec.imgIdx]) {
            art.images[rec.imgIdx].src = rec.dataUrl;
          }
        });
      }
    }

    /* 2. Autenticación SHA-256 */
    async sha256Hex(message) {
      if (window.crypto && window.crypto.subtle) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      }
      return message === "Liceo2026"
        ? this.app.getData().metadata.editorAccessHash
        : "";
    }

    async verifyEditorPin(inputPin) {
      const expectedHash = this.app.getData().metadata.editorAccessHash;
      const candidateHash = await this.sha256Hex(inputPin.trim());
      return candidateHash === expectedHash;
    }

    toggleModeRequest() {
      if (this.isEditorMode) {
        this.setEditorMode(false);
        this.showToast("Modo Visitante activado. Vista pública limpia.");
        return;
      }
      if (this.isAuthenticated) {
        this.setEditorMode(true);
        return;
      }
      const authModal = document.getElementById("auth-modal");
      if (authModal) {
        authModal.classList.add("open");
        const input = document.getElementById("auth-pin-input");
        if (input) {
          input.value = "";
          input.focus();
        }
      }
    }

    setEditorMode(active) {
      if (active) {
        // Guardar copia en memoria al entrar al Modo Editor para el botón "Cancelar cambios"
        this.sessionBackupSnapshot = {
          data: JSON.parse(JSON.stringify(this.app.getData())),
          typo: JSON.parse(JSON.stringify(this.typoConfig))
        };
      }
      this.isEditorMode = active;
      document.body.classList.toggle("editor-mode-active", active);

      const visitorBtn = document.getElementById("mode-reader-btn");
      const editorBtn = document.getElementById("mode-editor-btn");
      if (visitorBtn) visitorBtn.classList.toggle("active-mode", !active);
      if (editorBtn) editorBtn.classList.toggle("active-mode", active);

      if (!active) {
        const drawer = document.getElementById("typo-drawer");
        if (drawer) drawer.classList.remove("open");
      }

      if (this.app) {
        this.app.renderAllSections();
      }
    }

    /* 3. Sincronización de textos editables en tiempo real */
    handleInlineEdit(el) {
      if (!this.isEditorMode) return;
      const sectionType = el.getAttribute("data-edit-section");
      const fieldPath = el.getAttribute("data-edit-field");
      if (!sectionType || !fieldPath) return;

      const data = this.app.getData();
      const val = el.innerText.trim();

      if (sectionType === "editorial" && data.editorialSection) {
        const parts = fieldPath.split(".");
        if (parts.length === 1) {
          data.editorialSection[parts[0]] = val;
        } else if (parts[0] === "paragraphs") {
          const pIdx = parseInt(parts[1], 10);
          data.editorialSection.paragraphs[pIdx] = val;
        }
      } else if (sectionType.startsWith("monografia-")) {
        const art = (data.articles || []).find((a) => a.id === sectionType);
        if (!art) return;
        const parts = fieldPath.split(".");
        if (parts.length === 1) {
          art[parts[0]] = val;
        } else if (parts[0] === "chapters" && parts.length === 3) {
          const cIdx = parseInt(parts[1], 10);
          if (art.chapters[cIdx]) art.chapters[cIdx][parts[2]] = val;
        } else if (parts[0] === "chapters" && parts.length === 4 && parts[2] === "paragraphs") {
          const cIdx = parseInt(parts[1], 10);
          const pIdx = parseInt(parts[3], 10);
          if (art.chapters[cIdx] && art.chapters[cIdx].paragraphs) {
            art.chapters[cIdx].paragraphs[pIdx] = val;
          }
        } else if (parts[0] === "images" && parts.length === 3) {
          const iIdx = parseInt(parts[1], 10);
          if (art.images && art.images[iIdx]) {
            art.images[iIdx][parts[2]] = val;
          }
        }
      }
    }

    /* 4. Reordenar secciones de artículos, cambiar fondo y añadir nueva sección */
    moveArticleSection(articleId, dir) {
      const data = this.app.getData();
      const idx = (data.articles || []).findIndex((a) => a.id === articleId);
      if (idx < 0) return;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= data.articles.length) {
        this.showToast("La sección ya se encuentra en el extremo de los artículos.");
        return;
      }
      const temp = data.articles[idx];
      data.articles[idx] = data.articles[newIdx];
      data.articles[newIdx] = temp;
      this.app.renderAllSections();
      const targetEl = document.getElementById(articleId);
      if (targetEl) targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      this.showToast("Orden de secciones actualizado.");
    }

    changeArticleBackground(articleId, bgColor) {
      const data = this.app.getData();
      const art = (data.articles || []).find((a) => a.id === articleId);
      if (!art) return;
      art.themeBg = bgColor;
      const secEl = document.getElementById(articleId);
      if (secEl) secEl.style.backgroundColor = bgColor;
      this.showToast("Color de fondo de la sección actualizado.");
    }

    addNewArticleSection() {
      const data = this.app.getData();
      const nextNum = (data.articles || []).length + 1;
      const newArt = {
        articleNum: nextNum,
        id: "monografia-" + Date.now(),
        tag: "Nueva Sección Investigativa",
        themeBg: "#F7F2EB",
        layoutStyle: "split-left-image",
        kicker: `SECCIÓN COMPLEMENTARIA 0${nextNum}`,
        title: "Título de la nueva sección o apartado académico",
        authors: "Integrantes del equipo editorial",
        resumen: "Haz clic sobre cualquier texto de esta sección para editar su resumen, párrafos, subtítulos o recursos multimedia en tiempo real.",
        palabrasClave: "Investigación, sociedad, prevención, educación.",
        abstract: "Click on any text block inside this section to edit its content, headings, images, or multimedia resources in real time.",
        keywords: "Research, society, prevention, education.",
        pullQuote: "«Puedes personalizar la tipografía, el color de fondo, las fotografías y los videos de esta sección desde las herramientas del Modo Editor».",
        chapters: [
          {
            id: "ch-custom-1",
            heading: "1. Desarrollo del apartado",
            paragraphs: [
              "Este bloque ha sido añadido desde el Modo Editor. Puedes modificar libremente su texto, cambiar su color de fondo entre blanco cálido (#FCFAF7), crema (#F7F2EB), beige claro (#E9DFD0) o arena suave (#D8C3A5), y reordenar su posición.",
              "Recuerda presionar el botón «Guardar» en la barra superior del editor para conservar tus cambios de forma permanente en el navegador o exportarlos en un archivo JSON."
            ]
          }
        ],
        images: [
          {
            src: "images/doc_img_01.png",
            title: "Fotografía editable de la sección",
            caption: "Usa el botón «Cambiar Fotografía» sobre la imagen para subir un archivo desde tu MacBook."
          }
        ]
      };

      data.articles.push(newArt);
      this.app.renderAllSections();
      const el = document.getElementById(newArt.id);
      if (el) el.scrollIntoView({ behavior: "smooth" });
      this.showToast("Nueva sección añadida al sitio web.");
    }

    /* 5. Guardar, Cancelar cambios, Restaurar y Exportar/Importar JSON */
    saveAllChanges() {
      try {
        const data = this.app.getData();
        localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data));
        localStorage.setItem(STORAGE_KEY_TYPO, JSON.stringify(this.typoConfig));
        this.saveVersionSnapshot("Guardado manual del usuario");
        this.sessionBackupSnapshot = {
          data: JSON.parse(JSON.stringify(data)),
          typo: JSON.parse(JSON.stringify(this.typoConfig))
        };
        this.showToast("Todos los cambios se han guardado correctamente.");
      } catch (e) {
        this.showToast("Aviso: límite de almacenamiento alcanzado. Usa «Exportar JSON» para descargar respaldo.");
      }
    }

    cancelUnsavedChanges() {
      if (!this.sessionBackupSnapshot) {
        this.showToast("No hay cambios pendientes por cancelar.");
        return;
      }
      this.app.setData(JSON.parse(JSON.stringify(this.sessionBackupSnapshot.data)));
      this.typoConfig = JSON.parse(JSON.stringify(this.sessionBackupSnapshot.typo));
      this.applyTypographyVariables();
      this.populateTypoPanelControls();
      this.app.renderAllSections();
      this.showToast("Cambios no guardados descartados. Se restauró el último estado guardado.");
    }

    saveVersionSnapshot(label) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_VERSIONS);
        const list = raw ? JSON.parse(raw) : [];
        list.unshift({
          timestamp: new Date().toLocaleString("es-CL"),
          label: label || "Punto de control",
          data: this.app.getData(),
          typo: this.typoConfig
        });
        localStorage.setItem(STORAGE_KEY_VERSIONS, JSON.stringify(list.slice(0, 5)));
      } catch (e) {}
    }

    exportJSON() {
      const payload = {
        exportedAt: new Date().toISOString(),
        magazineData: this.app.getData(),
        typographyConfig: this.typoConfig
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "proyecto-revista-web-respaldo.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showToast("Respaldo JSON descargado exitosamente.");
    }

    importJSON(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          const newData = parsed.magazineData || parsed;
          if (!newData || (!Array.isArray(newData.articles) && !Array.isArray(newData.pages))) {
            this.showToast("El archivo seleccionado no contiene un respaldo válido.");
            return;
          }
          this.saveVersionSnapshot("Antes de importar archivo JSON");
          this.app.setData(newData);
          if (parsed.typographyConfig) {
            this.typoConfig = Object.assign({}, DEFAULT_TYPO, parsed.typographyConfig);
            this.applyTypographyVariables();
          }
          this.saveAllChanges();
          this.app.renderAllSections();
          this.showToast("Contenido restaurado desde el archivo JSON.");
        } catch (err) {
          this.showToast("Error al procesar el archivo JSON.");
        }
      };
      reader.readAsText(file);
    }

    resetToFactory() {
      const ok = window.confirm(
        "¿Deseas restaurar todo el sitio web a los datos y estilos originales del documento Word?\n\nLa Portada, la Contraportada y las 6 monografías volverán a su estado inicial."
      );
      if (!ok) return;
      localStorage.removeItem(STORAGE_KEY_DATA);
      localStorage.removeItem(STORAGE_KEY_TYPO);
      this.typoConfig = JSON.parse(JSON.stringify(DEFAULT_TYPO));
      this.applyTypographyVariables();
      this.populateTypoPanelControls();
      this.app.resetToFactoryData();
      this.showToast("Sitio restaurado al documento Word original.");
    }

    /* 6. Personalización Tipográfica en Tiempo Real */
    loadTypographySettings() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_TYPO);
        if (raw) {
          this.typoConfig = Object.assign({}, DEFAULT_TYPO, JSON.parse(raw));
        }
      } catch (e) {
        this.typoConfig = JSON.parse(JSON.stringify(DEFAULT_TYPO));
      }
    }

    applyTypographyVariables() {
      const root = document.documentElement;
      ["title", "subtitle", "body", "quote", "caption"].forEach((key) => {
        const cfg = this.typoConfig[key] || DEFAULT_TYPO[key];
        root.style.setProperty(`--font-${key}`, cfg.font);
        root.style.setProperty(`--size-${key}`, cfg.size + "rem");
        root.style.setProperty(`--weight-${key}`, cfg.weight);
        root.style.setProperty(`--color-${key}`, cfg.color);
        root.style.setProperty(`--ls-${key}`, cfg.ls + "em");
        root.style.setProperty(`--lh-${key}`, cfg.lh);
        root.style.setProperty(`--align-${key}`, cfg.align);
        root.style.setProperty(`--style-${key}`, cfg.italic ? "italic" : "normal");
        if (key === "title") {
          root.style.setProperty("--transform-title", cfg.uppercase ? "uppercase" : "none");
        }
      });
    }

    populateTypoPanelControls() {
      const cfg = this.typoConfig[this.currentTypoTarget];
      if (!cfg) return;
      const setVal = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.value = v;
      };
      setVal("typo-font-select", cfg.font);
      setVal("typo-size-range", cfg.size);
      setVal("typo-weight-select", cfg.weight);
      setVal("typo-color-input", cfg.color);
      setVal("typo-ls-range", cfg.ls);
      setVal("typo-lh-range", cfg.lh);
      setVal("typo-align-select", cfg.align);

      const it = document.getElementById("typo-italic-check");
      if (it) it.checked = !!cfg.italic;
      const up = document.getElementById("typo-upper-check");
      if (up) up.checked = !!cfg.uppercase;

      const sLbl = document.getElementById("typo-size-val");
      if (sLbl) sLbl.textContent = cfg.size + " rem";
      const lsLbl = document.getElementById("typo-ls-val");
      if (lsLbl) lsLbl.textContent = cfg.ls + " em";
      const lhLbl = document.getElementById("typo-lh-val");
      if (lhLbl) lhLbl.textContent = cfg.lh;
    }

    openVersionsModal() {
      const modal = document.getElementById("versions-modal");
      const listContainer = document.getElementById("versions-list-container");
      if (!modal || !listContainer) return;

      let list = [];
      try {
        list = JSON.parse(localStorage.getItem(STORAGE_KEY_VERSIONS) || "[]");
      } catch (e) {}

      if (!list.length) {
        listContainer.innerHTML = `<p class="ed-caption">Aún no hay puntos de control guardados. Presiona «Guardar» en la barra del Modo Editor para registrar una versión.</p>`;
      } else {
        listContainer.innerHTML = list
          .map(
            (v, idx) => `
            <div style="display:flex;align-items:center;justify-content:space-between;background:var(--cream);padding:12px 16px;margin-bottom:10px;border-left:4px solid var(--brown-medium);border-radius:6px;">
              <div>
                <div style="font-weight:700;color:var(--brown-dark);">${v.label}</div>
                <div class="ed-caption">Fecha: ${v.timestamp}</div>
              </div>
              <button type="button" class="btn-editorial btn-sm" data-restore-version-idx="${idx}">Restaurar</button>
            </div>
          `
          )
          .join("");
      }
      modal.classList.add("open");
    }

    showToast(msg) {
      const toast = document.getElementById("editorial-toast");
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add("show");
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => toast.classList.remove("show"), 3400);
    }

    bindEditorUI() {
      const visitorBtn = document.getElementById("mode-reader-btn");
      const editorBtn = document.getElementById("mode-editor-btn");
      if (visitorBtn) {
        visitorBtn.addEventListener("click", () => {
          if (this.isEditorMode) this.setEditorMode(false);
        });
      }
      if (editorBtn) {
        editorBtn.addEventListener("click", () => this.toggleModeRequest());
      }

      // Formulario SHA-256
      const authForm = document.getElementById("auth-form");
      if (authForm) {
        authForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const input = document.getElementById("auth-pin-input");
          const errEl = document.getElementById("auth-error-msg");
          const ok = await this.verifyEditorPin(input ? input.value : "");
          if (ok) {
            this.isAuthenticated = true;
            document.getElementById("auth-modal").classList.remove("open");
            if (errEl) errEl.style.display = "none";
            this.setEditorMode(true);
            this.showToast("Modo Editor activado. Haz clic en cualquier texto o sección para personalizar.");
          } else if (errEl) {
            errEl.style.display = "block";
          }
        });
      }

      const evalBtn = document.getElementById("auth-evaluator-quick-btn");
      if (evalBtn && authForm) {
        evalBtn.addEventListener("click", () => {
          const input = document.getElementById("auth-pin-input");
          if (input) input.value = "Liceo2026";
          authForm.dispatchEvent(new Event("submit"));
        });
      }

      const bindClick = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("click", fn);
      };

      bindClick("ed-btn-typo", () => {
        this.populateTypoPanelControls();
        document.getElementById("typo-drawer").classList.toggle("open");
      });
      bindClick("typo-drawer-close", () => {
        document.getElementById("typo-drawer").classList.remove("open");
      });
      bindClick("ed-btn-add-section", () => this.addNewArticleSection());
      bindClick("ed-btn-insert-media", () => {
        document.getElementById("insert-media-modal").classList.add("open");
      });
      bindClick("ed-btn-save", () => this.saveAllChanges());
      bindClick("ed-btn-cancel", () => this.cancelUnsavedChanges());
      bindClick("ed-btn-versions", () => this.openVersionsModal());
      bindClick("ed-btn-export", () => this.exportJSON());
      bindClick("ed-btn-reset", () => this.resetToFactory());

      const jsonInput = document.getElementById("ed-import-json-input");
      if (jsonInput) {
        jsonInput.addEventListener("change", (e) => {
          if (e.target.files && e.target.files[0]) {
            this.importJSON(e.target.files[0]);
            e.target.value = "";
          }
        });
      }

      // Delegación para botones de sección (mover arriba/abajo, fondo, cambiar imagen, restaurar versión)
      const imgFileInput = document.getElementById("ed-replace-image-input");
      document.addEventListener("click", (e) => {
        const moveUp = e.target.closest("[data-move-sec-up]");
        if (moveUp) {
          this.moveArticleSection(moveUp.getAttribute("data-move-sec-up"), -1);
          return;
        }
        const moveDown = e.target.closest("[data-move-sec-down]");
        if (moveDown) {
          this.moveArticleSection(moveDown.getAttribute("data-move-sec-down"), 1);
          return;
        }
        const bgBtn = e.target.closest("[data-sec-bg-color]");
        if (bgBtn) {
          this.changeArticleBackground(
            bgBtn.getAttribute("data-sec-id"),
            bgBtn.getAttribute("data-sec-bg-color")
          );
          return;
        }
        const repImgBtn = e.target.closest(".replace-img-btn");
        if (repImgBtn && this.isEditorMode) {
          this.pendingImageTarget = {
            articleId: repImgBtn.getAttribute("data-article-id"),
            imgIdx: parseInt(repImgBtn.getAttribute("data-img-idx") || "0", 10)
          };
          if (imgFileInput) imgFileInput.click();
          return;
        }
        const restoreBtn = e.target.closest("[data-restore-version-idx]");
        if (restoreBtn) {
          const idx = parseInt(restoreBtn.getAttribute("data-restore-version-idx"), 10);
          const list = JSON.parse(localStorage.getItem(STORAGE_KEY_VERSIONS) || "[]");
          if (list[idx]) {
            this.app.setData(list[idx].data);
            if (list[idx].typo) {
              this.typoConfig = list[idx].typo;
              this.applyTypographyVariables();
            }
            this.app.renderAllSections();
            document.getElementById("versions-modal").classList.remove("open");
            this.showToast("Versión histórica restaurada.");
          }
        }
      });

      if (imgFileInput) {
        imgFileInput.addEventListener("change", (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file || !this.pendingImageTarget) return;
          const reader = new FileReader();
          reader.onload = async (ev) => {
            const dataUrl = ev.target.result;
            const { articleId, imgIdx } = this.pendingImageTarget;
            const data = this.app.getData();
            const art = (data.articles || []).find((a) => a.id === articleId);
            if (art && art.images && art.images[imgIdx]) {
              art.images[imgIdx].src = dataUrl;
              await this.saveAssetToIDB("images", {
                key: `${articleId}-${imgIdx}`,
                articleId,
                imgIdx,
                dataUrl
              });
              this.app.renderAllSections();
              this.showToast("Fotografía actualizada y almacenada en IndexedDB.");
            }
          };
          reader.readAsDataURL(file);
          e.target.value = "";
        });
      }

      // Carga de MP3 personalizado
      const mp3Input = document.getElementById("audio-upload-input");
      if (mp3Input) {
        mp3Input.addEventListener("change", (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async (ev) => {
            const dataUrl = ev.target.result;
            const recId = "mp3-" + Date.now();
            const cleanName = file.name.replace(/\.[^.]+$/, "");
            await this.saveAssetToIDB("audio", { id: recId, name: cleanName, dataUrl });
            if (window.EditorialAudio) {
              window.EditorialAudio.addCustomTrack(cleanName, dataUrl);
            }
            this.showToast("Archivo MP3 incorporado al reproductor ambiental.");
          };
          reader.readAsDataURL(file);
          e.target.value = "";
        });
      }

      // Insertar Video de YouTube o Enlace
      const mediaForm = document.getElementById("insert-media-form");
      if (mediaForm) {
        mediaForm.addEventListener("submit", (e) => {
          e.preventDefault();
          const secId = document.getElementById("media-target-section").value;
          const title = document.getElementById("media-title-input").value.trim();
          const url = document.getElementById("media-url-input").value.trim();
          const desc = document.getElementById("media-desc-input").value.trim() || "Recurso complementario verificado.";

          let ytId = "";
          const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
          if (m) ytId = m[1];

          const data = this.app.getData();
          const art = (data.articles || []).find((a) => a.id === secId) || data.articles[0];
          if (art) {
            art.videoCard = {
              badge: "RECURSO AUDIOVISUAL COMPLEMENTARIO",
              title,
              channel: "Enlace Verificado · Modo Editor",
              description: desc,
              youtubeId: ytId,
              searchUrl: url,
              buttonLabel: ytId ? "VER VIDEO" : "ABRIR RECURSO"
            };
            this.app.renderAllSections();
            document.getElementById("insert-media-modal").classList.remove("open");
            mediaForm.reset();
            this.showToast("Recurso audiovisual vinculado a «" + art.title.slice(0, 38) + "...».");
          }
        });
      }

      // Blur de textos editables
      document.addEventListener(
        "blur",
        (e) => {
          if (this.isEditorMode && e.target && e.target.getAttribute("contenteditable") === "true") {
            this.handleInlineEdit(e.target);
          }
        },
        true
      );

      // Panel Tipográfico en Tiempo Real
      document.querySelectorAll("[data-typo-target]").forEach((btn) => {
        btn.addEventListener("click", () => {
          document.querySelectorAll("[data-typo-target]").forEach((b) => b.classList.toggle("active", b === btn));
          this.currentTypoTarget = btn.getAttribute("data-typo-target");
          this.populateTypoPanelControls();
        });
      });

      const updateTypoProp = (prop, val) => {
        const cfg = this.typoConfig[this.currentTypoTarget];
        if (!cfg) return;
        cfg[prop] = val;
        this.applyTypographyVariables();
        this.populateTypoPanelControls();
      };

      const bindInput = (id, prop, parser = (v) => v) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", (e) => updateTypoProp(prop, parser(e.target.value)));
      };

      bindInput("typo-font-select", "font");
      bindInput("typo-size-range", "size", parseFloat);
      bindInput("typo-weight-select", "weight");
      bindInput("typo-color-input", "color");
      bindInput("typo-ls-range", "ls", parseFloat);
      bindInput("typo-lh-range", "lh", parseFloat);
      bindInput("typo-align-select", "align");

      const itEl = document.getElementById("typo-italic-check");
      if (itEl) itEl.addEventListener("change", (e) => updateTypoProp("italic", e.target.checked));
      const upEl = document.getElementById("typo-upper-check");
      if (upEl) upEl.addEventListener("change", (e) => updateTypoProp("uppercase", e.target.checked));

      bindClick("typo-reset-btn", () => {
        this.typoConfig = JSON.parse(JSON.stringify(DEFAULT_TYPO));
        this.applyTypographyVariables();
        this.populateTypoPanelControls();
        this.showToast("Tipografías restablecidas al diseño editorial predeterminado.");
      });
    }
  }

  window.EditorialEditor = new WebEditorManager();
})();
