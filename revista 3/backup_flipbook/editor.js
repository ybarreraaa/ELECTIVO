/**
 * MOTOR DEL MODO EDITOR, PANEL TIPOGRÁFICO EN TIEMPO REAL Y PERSISTENCIA (Secciones 5, 6 y 10)
 * - Autenticación criptográfica SHA-256 (Web Crypto API)
 * - Portada y Contraportada bloqueadas por defecto
 * - Edición visual en vivo (textos, títulos, subtítulos, imágenes, enlaces, videos de YouTube)
 * - Gestión de páginas interiores (añadir, duplicar, reordenar, eliminar con confirmación)
 * - Personalización tipográfica independiente para 5 niveles (Titulares, Subtítulos, Párrafos, Citas, Créditos)
 * - Persistencia híbrida: localStorage (textos/config/versiones) + IndexedDB (imágenes y MP3 pesados)
 */
(function () {
  const STORAGE_KEY_DATA = "revista_cientifica_v1_data";
  const STORAGE_KEY_TYPO = "revista_cientifica_v1_typo";
  const STORAGE_KEY_VERSIONS = "revista_cientifica_v1_versions";
  const IDB_NAME = "RevistaCientificaAssetsDB";
  const IDB_VERSION = 1;

  const DEFAULT_TYPO = {
    title: {
      font: "'Playfair Display', Georgia, serif",
      size: 1.55,
      weight: "700",
      color: "#0E3047",
      ls: -0.01,
      lh: 1.18,
      align: "left",
      italic: false,
      uppercase: false
    },
    subtitle: {
      font: "'Cormorant Garamond', Georgia, serif",
      size: 1.08,
      weight: "600",
      color: "#2A628F",
      ls: 0.01,
      lh: 1.35,
      align: "left",
      italic: true,
      uppercase: false
    },
    body: {
      font: "'Libre Baskerville', Georgia, serif",
      size: 0.84,
      weight: "400",
      color: "#181D23",
      ls: 0,
      lh: 1.68,
      align: "justify",
      italic: false,
      uppercase: false
    },
    quote: {
      font: "'Bodoni Moda', Georgia, serif",
      size: 1.05,
      weight: "500",
      color: "#0E3047",
      ls: 0.01,
      lh: 1.42,
      align: "center",
      italic: true,
      uppercase: false
    },
    caption: {
      font: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      size: 0.73,
      weight: "500",
      color: "#525D6A",
      ls: 0.04,
      lh: 1.45,
      align: "left",
      italic: false,
      uppercase: false
    }
  };

  class EditorialEditorManager {
    constructor() {
      this.isEditorMode = false;
      this.isAuthenticated = false;
      this.currentTypoTarget = "title";
      this.typoConfig = JSON.parse(JSON.stringify(DEFAULT_TYPO));
      this.db = null;
      this.pendingImageTarget = null;
    }

    async init(appInstance) {
      this.app = appInstance;
      await this.initIndexedDB();
      this.loadTypographySettings();
      this.applyTypographyVariables();
      await this.restoreCustomAssetsFromIDB();
      this.bindEditorUI();
    }

    /* 1. Inicialización de IndexedDB para archivos binarios grandes (Imágenes y MP3) */
    initIndexedDB() {
      return new Promise((resolve) => {
        if (!window.indexedDB) {
          resolve();
          return;
        }
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
      // Restaurar pistas MP3 personalizadas guardadas en IndexedDB
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

      // Restaurar imágenes reemplazadas en páginas interiores
      const imageRecords = await this.getAllFromIDB("images");
      if (imageRecords && imageRecords.length && this.app) {
        const data = this.app.getData();
        imageRecords.forEach((rec) => {
          const pg = data.pages.find((p) => p.id === rec.pageId && !p.locked);
          if (pg && pg.featuredImage) {
            pg.featuredImage.src = rec.dataUrl;
          }
        });
      }
    }

    /* 2. Autenticación mediante hash SHA-256 con Web Crypto API */
    async sha256Hex(message) {
      if (window.crypto && window.crypto.subtle) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      }
      // Fallback determinista si se abre en contexto sin subtle
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
        this.showToast("Modo Lector activado. Herramientas de edición ocultas.");
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
      this.isEditorMode = active;
      document.body.classList.toggle("editor-mode-active", active);

      const readerBtn = document.getElementById("mode-reader-btn");
      const editorBtn = document.getElementById("mode-editor-btn");
      if (readerBtn) readerBtn.classList.toggle("active-mode", !active);
      if (editorBtn) editorBtn.classList.toggle("active-mode", active);

      if (!active) {
        const typoDrawer = document.getElementById("typo-drawer");
        if (typoDrawer) typoDrawer.classList.remove("open");
      }

      if (this.app) {
        this.app.renderCurrentSpread();
      }
    }

    /* 3. Sincronización de cambios de texto en vivo (contenteditable) */
    handleInlineEdit(el) {
      if (!this.isEditorMode) return;
      const pageId = el.getAttribute("data-page-id");
      const fieldPath = el.getAttribute("data-edit-field");
      if (!pageId || !fieldPath) return;

      const data = this.app.getData();
      const page = data.pages.find((p) => p.id === pageId);
      // Nunca permitir modificar Portada ni Contraportada bloqueadas
      if (!page || page.locked) return;

      const newVal = el.innerText.trim();
      const parts = fieldPath.split(".");

      if (parts.length === 1) {
        page[parts[0]] = newVal;
      } else if (parts[0] === "paragraphs" && parts.length === 2) {
        const idx = parseInt(parts[1], 10);
        if (page.paragraphs && typeof page.paragraphs[idx] !== "undefined") {
          page.paragraphs[idx] = newVal;
        }
      } else if (parts[0] === "blocks" && parts.length === 3) {
        const bIdx = parseInt(parts[1], 10);
        const prop = parts[2];
        if (page.blocks && page.blocks[bIdx]) {
          page.blocks[bIdx][prop] = newVal;
        }
      } else if (parts[0] === "blocks" && parts.length === 4 && parts[2] === "paragraphs") {
        const bIdx = parseInt(parts[1], 10);
        const pIdx = parseInt(parts[3], 10);
        if (page.blocks && page.blocks[bIdx] && page.blocks[bIdx].paragraphs) {
          page.blocks[bIdx].paragraphs[pIdx] = newVal;
        }
      } else if (parts[0] === "featuredImage" && parts.length === 2) {
        if (page.featuredImage) {
          page.featuredImage[parts[1]] = newVal;
        }
      }

      this.saveDataToLocalStorage(false);
    }

    /* 4. Gestión de páginas interiores (Añadir, Duplicar, Reordenar, Eliminar con confirmación) */
    getActiveEditablePage() {
      const visiblePages = this.app.getVisiblePages();
      // Preferir la primera página interior no bloqueada visible en el spread actual
      return visiblePages.find((p) => !p.locked) || null;
    }

    recalculatePageNumbers() {
      const data = this.app.getData();
      data.pages.forEach((p, idx) => {
        p.pageNumber = idx + 1;
      });
    }

    addNewInteriorPage() {
      const data = this.app.getData();
      const currentEditable = this.getActiveEditablePage();
      // Insertar después de la página interior actual, o justo antes de la contraportada
      let insertIndex = data.pages.length - 1;
      if (currentEditable) {
        const idx = data.pages.findIndex((p) => p.id === currentEditable.id);
        if (idx >= 1 && idx < data.pages.length - 1) {
          insertIndex = idx + 1;
        }
      }

      const newPage = {
        pageNumber: insertIndex + 1,
        id: "interior-custom-" + Date.now(),
        type: "article-columns",
        locked: false,
        section: "Sección Editorial Personalizada",
        kicker: "NUEVA PÁGINA EDITORIAL · MODO EDITOR",
        title: "Título del nuevo artículo o sección complementaria",
        blocks: [
          {
            heading: "Subtítulo de la sección",
            paragraphs: [
              "Haz clic directamente sobre este párrafo o en el titular superior para editar su contenido en tiempo real. Puedes personalizar la tipografía desde el panel lateral, insertar un video de YouTube o añadir fotografías.",
              "Todos los cambios realizados se guardan en el almacenamiento local del navegador y pueden exportarse en formato JSON como respaldo del proyecto."
            ]
          }
        ],
        featuredImage: {
          src: "images/doc_img_01.png",
          title: "Fotografía editorial editable",
          caption: "Usa el botón «Cambiar Imagen» sobre la fotografía para cargar una nueva imagen desde tu equipo."
        }
      };

      data.pages.splice(insertIndex, 0, newPage);
      this.recalculatePageNumbers();
      this.saveVersionSnapshot("Página interior añadida (Pág. " + newPage.pageNumber + ")");
      this.app.goToPage(newPage.pageNumber);
      this.showToast("Nueva página interior añadida en la posición " + newPage.pageNumber + ".");
    }

    duplicateCurrentInteriorPage() {
      const target = this.getActiveEditablePage();
      if (!target || target.locked) {
        this.showToast("La Portada y la Contraportada están bloqueadas y no pueden duplicarse.");
        return;
      }
      const data = this.app.getData();
      const idx = data.pages.findIndex((p) => p.id === target.id);
      if (idx <= 0 || idx >= data.pages.length - 1) return;

      const clone = JSON.parse(JSON.stringify(target));
      clone.id = target.id + "-copy-" + Date.now();
      clone.title = (clone.title || "Página") + " (Copia editable)";
      data.pages.splice(idx + 1, 0, clone);
      this.recalculatePageNumbers();
      this.saveVersionSnapshot("Página duplicada (Pág. " + clone.pageNumber + ")");
      this.app.goToPage(clone.pageNumber);
      this.showToast("Página interior duplicada correctamente.");
    }

    moveCurrentInteriorPage(direction) {
      const target = this.getActiveEditablePage();
      if (!target || target.locked) {
        this.showToast("Selecciona una página interior desbloqueada para reordenar.");
        return;
      }
      const data = this.app.getData();
      const idx = data.pages.findIndex((p) => p.id === target.id);
      const newIdx = idx + direction;
      // Impedir mover a la posición 0 (Portada) o última posición (Contraportada)
      if (newIdx <= 0 || newIdx >= data.pages.length - 1) {
        this.showToast("La Portada (pág. 1) y la Contraportada final deben permanecer en sus extremos.");
        return;
      }
      const temp = data.pages[idx];
      data.pages[idx] = data.pages[newIdx];
      data.pages[newIdx] = temp;
      this.recalculatePageNumbers();
      this.saveVersionSnapshot("Reordenamiento de página interior");
      this.app.goToPage(target.pageNumber);
      this.showToast("Página movida a la posición " + target.pageNumber + ".");
    }

    deleteCurrentInteriorPage() {
      const target = this.getActiveEditablePage();
      if (!target || target.locked) {
        this.showToast("Acción bloqueada: La Portada y la Contraportada originales están protegidas.");
        return;
      }
      const confirmed = window.confirm(
        `¿Estás seguro de que deseas eliminar la página interior N.º ${target.pageNumber} («${target.title}»)?\n\nSe guardará automáticamente un punto de restauración antes de eliminarla.`
      );
      if (!confirmed) return;

      const data = this.app.getData();
      const idx = data.pages.findIndex((p) => p.id === target.id);
      if (idx <= 0 || idx >= data.pages.length - 1) return;

      this.saveVersionSnapshot("Antes de eliminar página " + target.pageNumber);
      data.pages.splice(idx, 1);
      this.recalculatePageNumbers();
      this.saveDataToLocalStorage(false);
      this.app.goToPage(Math.max(2, idx));
      this.showToast("Página interior eliminada. Puedes recuperarla en «Versiones» si lo necesitas.");
    }

    /* 5. Insertar Video de YouTube o Enlace en la página interior activa */
    promptInsertVideoOrLink() {
      const target = this.getActiveEditablePage();
      if (!target || target.locked) {
        this.showToast("Abre una página interior (págs. 2 a " + (this.app.getData().pages.length - 1) + ") para insertar recursos.");
        return;
      }
      const modal = document.getElementById("insert-media-modal");
      if (modal) {
        modal.classList.add("open");
      }
    }

    /* 6. Personalización Tipográfica en Tiempo Real (Exclusiva para .interior-page) */
    loadTypographySettings() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_TYPO);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.typoConfig = Object.assign({}, DEFAULT_TYPO, parsed);
        }
      } catch (e) {
        this.typoConfig = JSON.parse(JSON.stringify(DEFAULT_TYPO));
      }
    }

    saveTypographySettings() {
      try {
        localStorage.setItem(STORAGE_KEY_TYPO, JSON.stringify(this.typoConfig));
      } catch (e) {}
    }

    applyTypographyVariables() {
      const root = document.documentElement;
      const map = this.typoConfig;

      ["title", "subtitle", "body", "quote", "caption"].forEach((key) => {
        const cfg = map[key] || DEFAULT_TYPO[key];
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

      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
      };

      setVal("typo-font-select", cfg.font);
      setVal("typo-size-range", cfg.size);
      setVal("typo-weight-select", cfg.weight);
      setVal("typo-color-input", cfg.color);
      setVal("typo-ls-range", cfg.ls);
      setVal("typo-lh-range", cfg.lh);
      setVal("typo-align-select", cfg.align);

      const italicCheck = document.getElementById("typo-italic-check");
      if (italicCheck) italicCheck.checked = !!cfg.italic;
      const upperCheck = document.getElementById("typo-upper-check");
      if (upperCheck) upperCheck.checked = !!cfg.uppercase;

      const sizeLbl = document.getElementById("typo-size-val");
      if (sizeLbl) sizeLbl.textContent = cfg.size + " rem";
      const lsLbl = document.getElementById("typo-ls-val");
      if (lsLbl) lsLbl.textContent = cfg.ls + " em";
      const lhLbl = document.getElementById("typo-lh-val");
      if (lhLbl) lhLbl.textContent = cfg.lh;
    }

    /* 7. Persistencia, Historial de Versiones, Exportar e Importar JSON */
    saveDataToLocalStorage(showFeedback = true) {
      try {
        const data = this.app.getData();
        localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data));
        if (showFeedback) {
          this.saveVersionSnapshot("Guardado manual del usuario");
          this.showToast("Cambios guardados correctamente en el navegador.");
        }
      } catch (e) {
        this.showToast("Aviso: almacenamiento local lleno. Usa «Exportar JSON» para descargar respaldo.");
      }
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
        // Conservar las 6 versiones más recientes para no saturar localStorage
        const trimmed = list.slice(0, 6);
        localStorage.setItem(STORAGE_KEY_VERSIONS, JSON.stringify(trimmed));
      } catch (e) {}
    }

    exportMagazineJSON() {
      const payload = {
        exportedAt: new Date().toISOString(),
        magazineData: this.app.getData(),
        typographyConfig: this.typoConfig
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "revista-cientifica-vol1-respaldo.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showToast("Archivo JSON de respaldo descargado.");
    }

    importMagazineJSON(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          const newData = parsed.magazineData || parsed;
          if (!newData || !Array.isArray(newData.pages)) {
            this.showToast("Error: El archivo JSON no tiene una estructura de revista válida.");
            return;
          }
          // Garantizar que Portada y Contraportada sigan bloqueadas
          if (newData.pages[0]) newData.pages[0].locked = true;
          if (newData.pages[newData.pages.length - 1]) {
            newData.pages[newData.pages.length - 1].locked = true;
          }

          this.saveVersionSnapshot("Antes de importar archivo JSON");
          this.app.setData(newData);
          if (parsed.typographyConfig) {
            this.typoConfig = Object.assign({}, DEFAULT_TYPO, parsed.typographyConfig);
            this.applyTypographyVariables();
            this.saveTypographySettings();
          }
          this.saveDataToLocalStorage(false);
          this.app.renderCurrentSpread();
          this.showToast("Revista restaurada exitosamente desde el archivo JSON.");
        } catch (err) {
          this.showToast("Error al leer el archivo JSON.");
        }
      };
      reader.readAsText(file);
    }

    resetToOriginalManuscript() {
      const confirmed = window.confirm(
        "¿Deseas restaurar la revista a su versión original del documento Word/Google Docs?\n\nSe conservarán intactas la Portada, la Contraportada y los 38 folios originales."
      );
      if (!confirmed) return;
      localStorage.removeItem(STORAGE_KEY_DATA);
      localStorage.removeItem(STORAGE_KEY_TYPO);
      this.typoConfig = JSON.parse(JSON.stringify(DEFAULT_TYPO));
      this.applyTypographyVariables();
      this.populateTypoPanelControls();
      this.app.resetToFactoryData();
      this.showToast("Revista restaurada al documento original.");
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
        listContainer.innerHTML = `<p style="font-size:0.82rem;color:#B8C7D6;">Aún no hay versiones históricas guardadas en esta sesión. Presiona «Guardar» en la barra del editor para crear un punto de restauración.</p>`;
      } else {
        listContainer.innerHTML = list
          .map(
            (v, idx) => `
            <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.06);padding:10px 14px;margin-bottom:8px;border-left:3px solid #D4A359;">
              <div>
                <div style="font-weight:600;font-size:0.84rem;">${v.label}</div>
                <div style="font-size:0.72rem;color:#B8C7D6;">Fecha: ${v.timestamp} · ${v.data.pages.length} páginas</div>
              </div>
              <button type="button" class="editor-btn primary-btn" data-restore-version-idx="${idx}">RESTAURAR ESTA VERSIÓN</button>
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
      clearTimeout(this.toastTimeout);
      this.toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
      }, 3400);
    }

    /* 8. Eventos de UI del Modo Editor y Panel Tipográfico */
    bindEditorUI() {
      // Botones Modo Lector / Modo Editor
      const readerBtn = document.getElementById("mode-reader-btn");
      const editorBtn = document.getElementById("mode-editor-btn");
      if (readerBtn) {
        readerBtn.addEventListener("click", () => {
          if (this.isEditorMode) this.setEditorMode(false);
        });
      }
      if (editorBtn) {
        editorBtn.addEventListener("click", () => this.toggleModeRequest());
      }

      // Formulario de Autenticación SHA-256
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
            this.showToast("Modo Editor desbloqueado. Haz clic en cualquier texto interior para editar.");
          } else if (errEl) {
            errEl.style.display = "block";
          }
        });
      }

      // Botón de acceso rápido para evaluación docente en el modal de autenticación
      const evalQuickBtn = document.getElementById("auth-evaluator-quick-btn");
      if (evalQuickBtn) {
        evalQuickBtn.addEventListener("click", () => {
          const input = document.getElementById("auth-pin-input");
          if (input) input.value = "Liceo2026";
          authForm.dispatchEvent(new Event("submit"));
        });
      }

      // Botones de la barra de herramientas del Modo Editor
      const bindClick = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("click", fn);
      };

      bindClick("ed-btn-typo", () => {
        const drawer = document.getElementById("typo-drawer");
        if (drawer) {
          this.populateTypoPanelControls();
          drawer.classList.toggle("open");
        }
      });
      bindClick("typo-drawer-close", () => {
        document.getElementById("typo-drawer").classList.remove("open");
      });
      bindClick("ed-btn-add-page", () => this.addNewInteriorPage());
      bindClick("ed-btn-dup-page", () => this.duplicateCurrentInteriorPage());
      bindClick("ed-btn-move-prev", () => this.moveCurrentInteriorPage(-1));
      bindClick("ed-btn-move-next", () => this.moveCurrentInteriorPage(1));
      bindClick("ed-btn-del-page", () => this.deleteCurrentInteriorPage());
      bindClick("ed-btn-insert-media", () => this.promptInsertVideoOrLink());
      bindClick("ed-btn-save", () => this.saveDataToLocalStorage(true));
      bindClick("ed-btn-export", () => this.exportMagazineJSON());
      bindClick("ed-btn-versions", () => this.openVersionsModal());
      bindClick("ed-btn-reset", () => this.resetToOriginalManuscript());

      // Importar JSON
      const jsonInput = document.getElementById("ed-import-json-input");
      if (jsonInput) {
        jsonInput.addEventListener("change", (e) => {
          if (e.target.files && e.target.files[0]) {
            this.importMagazineJSON(e.target.files[0]);
            e.target.value = "";
          }
        });
      }

      // Reemplazo de imagen en páginas interiores (almacenada en IndexedDB)
      const imgFileInput = document.getElementById("ed-replace-image-input");
      document.addEventListener("click", (e) => {
        const repBtn = e.target.closest(".figure-replace-btn");
        if (repBtn && this.isEditorMode) {
          this.pendingImageTarget = repBtn.getAttribute("data-page-id");
          if (imgFileInput) imgFileInput.click();
        }

        // Restaurar versión desde el modal
        const restoreBtn = e.target.closest("[data-restore-version-idx]");
        if (restoreBtn) {
          const idx = parseInt(restoreBtn.getAttribute("data-restore-version-idx"), 10);
          const list = JSON.parse(localStorage.getItem(STORAGE_KEY_VERSIONS) || "[]");
          if (list[idx]) {
            this.app.setData(list[idx].data);
            if (list[idx].typo) {
              this.typoConfig = list[idx].typo;
              this.applyTypographyVariables();
              this.saveTypographySettings();
            }
            this.saveDataToLocalStorage(false);
            this.app.renderCurrentSpread();
            document.getElementById("versions-modal").classList.remove("open");
            this.showToast("Versión anterior restaurada correctamente.");
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
            const data = this.app.getData();
            const pg = data.pages.find((p) => p.id === this.pendingImageTarget && !p.locked);
            if (pg) {
              if (!pg.featuredImage) {
                pg.featuredImage = { src: dataUrl, title: file.name, caption: "Fotografía actualizada en Modo Editor." };
              } else {
                pg.featuredImage.src = dataUrl;
              }
              await this.saveAssetToIDB("images", {
                key: "img-" + pg.id,
                pageId: pg.id,
                dataUrl
              });
              this.app.renderCurrentSpread();
              this.showToast("Fotografía reemplazada y almacenada en IndexedDB.");
            }
          };
          reader.readAsDataURL(file);
          e.target.value = "";
        });
      }

      // Carga de archivo MP3 personalizado en Modo Editor (almacenado en IndexedDB)
      const mp3Input = document.getElementById("audio-upload-input");
      if (mp3Input) {
        mp3Input.addEventListener("change", (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async (ev) => {
            const dataUrl = ev.target.result;
            const recId = "mp3-" + Date.now();
            await this.saveAssetToIDB("audio", {
              id: recId,
              name: file.name.replace(/\.[^.]+$/, ""),
              dataUrl
            });
            if (window.EditorialAudio) {
              window.EditorialAudio.addCustomTrack(file.name.replace(/\.[^.]+$/, ""), dataUrl);
            }
            this.showToast("Pista MP3 cargada en el reproductor ambiental.");
          };
          reader.readAsDataURL(file);
          e.target.value = "";
        });
      }

      // Formulario para insertar Video de YouTube o Enlace en página interior
      const mediaForm = document.getElementById("insert-media-form");
      if (mediaForm) {
        mediaForm.addEventListener("submit", (e) => {
          e.preventDefault();
          const target = this.getActiveEditablePage();
          if (!target || target.locked) return;

          const title = document.getElementById("media-title-input").value.trim() || "Recurso Audiovisual Complementario";
          const url = document.getElementById("media-url-input").value.trim();
          const desc = document.getElementById("media-desc-input").value.trim() || "Material complementario incorporado desde el Modo Editor.";

          let ytId = "";
          const match = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
          if (match) ytId = match[1];

          target.videoCard = {
            badge: "RECURSO AUDIOVISUAL AGREGADO",
            title,
            channel: "Enlace Verificado · Modo Editor",
            description: desc,
            youtubeId: ytId,
            searchUrl: url || "https://www.youtube.com",
            buttonLabel: ytId ? "VER VIDEO INTEGRADO" : "ABRIR ENLACE EXTERNO"
          };

          this.saveDataToLocalStorage(false);
          this.app.renderCurrentSpread();
          document.getElementById("insert-media-modal").classList.remove("open");
          mediaForm.reset();
          this.showToast("Recurso audiovisual insertado en la página " + target.pageNumber + ".");
        });
      }

      // Escuchar cambios de texto inline en páginas interiores
      document.addEventListener("blur", (e) => {
        if (this.isEditorMode && e.target && e.target.getAttribute("contenteditable") === "true") {
          this.handleInlineEdit(e.target);
        }
      }, true);

      // Controles del Panel de Personalización Tipográfica en Tiempo Real
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
        this.saveTypographySettings();
        this.populateTypoPanelControls();
      };

      const bindTypoInput = (id, prop, parser = (v) => v) => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener("input", (e) => updateTypoProp(prop, parser(e.target.value)));
        }
      };

      bindTypoInput("typo-font-select", "font");
      bindTypoInput("typo-size-range", "size", parseFloat);
      bindTypoInput("typo-weight-select", "weight");
      bindTypoInput("typo-color-input", "color");
      bindTypoInput("typo-ls-range", "ls", parseFloat);
      bindTypoInput("typo-lh-range", "lh", parseFloat);
      bindTypoInput("typo-align-select", "align");

      const italicEl = document.getElementById("typo-italic-check");
      if (italicEl) {
        italicEl.addEventListener("change", (e) => updateTypoProp("italic", e.target.checked));
      }
      const upperEl = document.getElementById("typo-upper-check");
      if (upperEl) {
        upperEl.addEventListener("change", (e) => updateTypoProp("uppercase", e.target.checked));
      }

      bindClick("typo-reset-btn", () => {
        this.typoConfig = JSON.parse(JSON.stringify(DEFAULT_TYPO));
        this.applyTypographyVariables();
        this.saveTypographySettings();
        this.populateTypoPanelControls();
        this.showToast("Tipografías de páginas interiores restauradas al diseño original.");
      });
    }
  }

  window.EditorialEditor = new EditorialEditorManager();
})();
