/**
 * DIGITALER ADVANCED ORGANIZER: GOLDEN RECORD – VISITENKARTE ODER TRUGBILD?
 * Interaktive Modellierungsumgebung für Philosophie Q1 (Anthropologie & Kulturkritik)
 * Optimiert für Desktop & iPad (Apple Pencil Freihand-Zeichnen)
 */

(function() {
    'use strict';

    const STORAGE_KEY = 'AO_PHILOSOPHIE_ORGANIZER_STATE_V5';

    // Feste Ausgangs-Slots (3 links, 3 rechts) für eine unvoreingenommene, gemischte Verteilung
    const START_SLOTS = [
        { x: 200, y: 220 }, // Links Oben
        { x: 920, y: 220 }, // Rechts Oben
        { x: 200, y: 460 }, // Links Mitte
        { x: 920, y: 460 }, // Rechts Mitte
        { x: 200, y: 700 }, // Links Unten
        { x: 920, y: 700 }  // Rechts Unten
    ];

    const INITIAL_STATE = {
        zoom: 1,
        nodes: [
            // Feste Referenzknoten (Dach & Pole)
            { id: 'header', fixed: true, type: 'header', x: 50, y: 24, w: 1380, h: 70 },
            { id: 'pole-left', fixed: true, type: 'pole', x: 50, y: 114, w: 660, h: 56, title: 'DIE VISITENKARTE' },
            { id: 'pole-right', fixed: true, type: 'pole', x: 770, y: 114, w: 660, h: 56, title: 'DAS TRUGBILD' },
            
            // Bewegliche Denker-Stationen (zufällig links/rechts verteilt, ohne Vorfestlegung auf Pole)
            { 
                id: 'fisher', 
                type: 'thinker', 
                name: 'Mark Fisher', 
                years: '1968–2017', 
                concept: 'Kapitalistischer Realismus',
                img: 'assets/fisher.jpeg',
                insight: '',
                x: 200, 
                y: 220, 
                w: 360, 
                h: 175 
            },
            { 
                id: 'gehlen', 
                type: 'thinker', 
                name: 'Arnold Gehlen', 
                years: '1904–1976', 
                concept: 'Mängelwesen & Institutionen',
                img: 'assets/gehlen.jpeg',
                insight: '',
                x: 920, 
                y: 220, 
                w: 360, 
                h: 175 
            },
            { 
                id: 'rousseau', 
                type: 'thinker', 
                name: 'Jean-Jacques Rousseau', 
                years: '1712–1778', 
                concept: 'Naturzustand & Entfremdung',
                img: 'assets/rousseau.jpeg',
                insight: '',
                x: 200, 
                y: 460, 
                w: 360, 
                h: 175 
            },
            { 
                id: 'jaeggi', 
                type: 'thinker', 
                name: 'Rahel Jaeggi', 
                years: '* 1967', 
                concept: 'Aneignung & Lebensformen',
                img: 'assets/jaeggi.jpg',
                insight: '',
                x: 920, 
                y: 460, 
                w: 360, 
                h: 175 
            },
            { 
                id: 'marx', 
                type: 'thinker', 
                name: 'Karl Marx', 
                years: '1818–1883', 
                concept: 'Warenform & Entfremdung',
                img: 'assets/marx.png',
                insight: '',
                x: 200, 
                y: 700, 
                w: 360, 
                h: 175 
            },
            { 
                id: 'freud', 
                type: 'thinker', 
                name: 'Sigmund Freud', 
                years: '1856–1939', 
                concept: 'Das Unbehagen in der Kultur',
                img: 'assets/freud.jpg',
                insight: '',
                x: 920, 
                y: 700, 
                w: 360, 
                h: 175 
            }
        ],

        // Option 1: Keine Pfeile vorgegeben – SuS erarbeiten alle Verbindungen selbst!
        links: [],

        // Eigene Notizen & Fragezeichen
        annotations: [],

        // Freihand-Zeichnungen (Stift / Apple Pencil)
        drawings: []
    };

    // --- APP STATE ---
    let state = JSON.parse(JSON.stringify(INITIAL_STATE));
    let activeTool = 'select'; // 'select', 'pen', 'arrow', 'conflict', 'question', 'note', 'delete'
    let selectedNodeId = null;
    let linkSourceId = null;
    let pendingNotePos = null;
    let pendingLinkInfo = null;
    let currentNoteColor = 'yellow';

    // Stift- & Radierer-Einstellungen
    let currentPenColor = '#143264';
    let currentPenSize = 2;
    let penSubMode = 'draw'; // 'draw' oder 'erase'
    let isDrawing = false;
    let isErasing = false;
    let currentStroke = null;
    let currentErasedInDrag = [];
    let drawingUndoStack = [];

    // DOM Elements
    const canvasViewport = document.getElementById('canvasViewport');
    const canvasBoard = document.getElementById('canvasBoard');
    const nodesLayer = document.getElementById('nodesLayer');
    const svgLinksGroup = document.getElementById('svgLinksGroup');
    const svgDragLine = document.getElementById('svgDragLine');
    const drawingsCanvas = document.getElementById('drawingsCanvas');
    const drawingsCtx = drawingsCanvas ? drawingsCanvas.getContext('2d') : null;
    const penSubtoolbar = document.getElementById('penSubtoolbar');
    const saveText = document.getElementById('saveText');
    const instructionText = document.getElementById('instructionText');
    const canvasInstruction = document.getElementById('canvasInstruction');
    const btnDismissInstruction = document.getElementById('btnDismissInstruction');
    const zoomLevelText = document.getElementById('zoomLevelText');
    const toast = document.getElementById('toast');

    let instructionTimer = null;

    function showInstruction(text, duration = 3500) {
        if (!canvasInstruction || !instructionText) return;
        instructionText.textContent = text;
        canvasInstruction.classList.remove('hidden');
        if (instructionTimer) clearTimeout(instructionTimer);
        if (duration > 0) {
            instructionTimer = setTimeout(() => {
                canvasInstruction.classList.add('hidden');
            }, duration);
        }
    }

    function dismissInstruction() {
        if (!canvasInstruction) return;
        if (instructionTimer) clearTimeout(instructionTimer);
        canvasInstruction.classList.add('hidden');
    }

    function setupInstructionBanner() {
        if (!canvasInstruction) return;

        if (btnDismissInstruction) {
            btnDismissInstruction.addEventListener('click', (e) => {
                e.stopPropagation();
                dismissInstruction();
            });
        }

        // Klick auf die Hinweis-Leiste selbst schließt sie ebenfalls
        canvasInstruction.addEventListener('click', () => {
            dismissInstruction();
        });

        // Nach 6 Sekunden automatisch ausblenden
        instructionTimer = setTimeout(() => {
            dismissInstruction();
        }, 6000);

        // Klick/Touch auf den Arbeitsbereich blendet den Hinweis sofort aus
        if (canvasViewport) {
            canvasViewport.addEventListener('pointerdown', (e) => {
                if (!e.target.closest('#canvasInstruction')) {
                    dismissInstruction();
                }
            }, { passive: true });
        }
    }

    // Modals
    const noteModal = document.getElementById('noteModal');
    const noteInputText = document.getElementById('noteInputText');
    const btnCancelNote = document.getElementById('btnCancelNote');
    const btnSaveNote = document.getElementById('btnSaveNote');

    const linkModal = document.getElementById('linkModal');
    const linkInputText = document.getElementById('linkInputText');
    const linkModalTitle = document.getElementById('linkModalTitle');
    const btnCancelLink = document.getElementById('btnCancelLink');
    const btnSaveLink = document.getElementById('btnSaveLink');

    // Zufällige Verteilung der Stationen auf die 6 Slots (3 links, 3 rechts)
    function assignRandomSlots(nodes) {
        const slots = [...START_SLOTS];
        for (let i = slots.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [slots[i], slots[j]] = [slots[j], slots[i]];
        }
        let sIdx = 0;
        nodes.forEach(n => {
            if (n.type === 'thinker' && sIdx < slots.length) {
                n.x = slots[sIdx].x;
                n.y = slots[sIdx].y;
                sIdx++;
            }
        });
    }

    // --- INITIALISIERUNG ---
    function init() {
        const hasLoaded = loadFromStorage();
        if (!hasLoaded) {
            assignRandomSlots(state.nodes);
            saveToStorage();
        }
        setupToolbar();
        setupPenTools();
        setupZoomControls();
        setupModals();
        setupPersistenceButtons();
        setupInstructionBanner();
        renderCanvas();
        redrawAllDrawings();
        setupKeyboardShortcuts();
        updateSaveIndicator(new Date());

        // Verhindert, dass Mobile Safari die Kopfzeile nach oben wegscrollt
        window.addEventListener('scroll', () => {
            if (window.scrollY !== 0 || window.scrollX !== 0) {
                window.scrollTo(0, 0);
            }
        }, { passive: true });
    }

    // --- STORAGE & PERSISTENZ (AUTOMATISCHES SPEICHERN ÜBER WOCHEN) ---
    function saveToStorage() {
        try {
            const data = {
                version: 3,
                updatedAt: new Date().toISOString(),
                state: state
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            updateSaveIndicator(new Date());
        } catch (e) {
            console.error('Fehler beim Speichern in LocalStorage:', e);
            showToast('Achtung: Automatisches Speichern fehlgeschlagen.');
        }
    }

    function loadFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.state) {
                    state = parsed.state;
                    if (!state.annotations) state.annotations = [];
                    if (!state.drawings) state.drawings = [];
                    if (!state.zoom) state.zoom = 1;
                    return true;
                }
            }
        } catch (e) {
            console.warn('Kein gespeicherter Stand oder Parsingfehler:', e);
        }
        return false;
    }

    function updateSaveIndicator(date) {
        if (!saveText) return;
        const timeStr = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        saveText.textContent = `Gespeichert (${timeStr})`;
    }

    function showToast(msg) {
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // --- RENDERING DES GESAMTEN ORGANIZERS ---
    function renderCanvas() {
        // Entferne dynamische DOM-Knoten (außer feste Header/Pole)
        const existingDynamic = nodesLayer.querySelectorAll('.thinker-card, .note-card, .question-marker');
        existingDynamic.forEach(el => el.remove());

        // 1. Rendere alle Denker-Stationen (mit Erkenntnis-Textfeld & einheitlichem Porträt)
        state.nodes.forEach(node => {
            if (node.type === 'thinker') {
                const card = createThinkerElement(node);
                nodesLayer.appendChild(card);
            }
        });

        // 2. Rendere alle Anmerkungen (Notizen & Fragezeichen)
        state.annotations.forEach(ann => {
            if (ann.type === 'note') {
                const noteEl = createNoteElement(ann);
                nodesLayer.appendChild(noteEl);
            } else if (ann.type === 'question') {
                const qEl = createQuestionElement(ann);
                nodesLayer.appendChild(qEl);
            }
        });

        // 3. SVG-Verbindungen zeichnen (inkl. Blitz und Text unter dem Blitz)
        renderConnections();

        // 4. Zoom anwenden
        applyZoom();
    }

    // Erstellt das DOM-Element einer Denker-Karte mit viel Platz für die Sicherung
    function createThinkerElement(node) {
        const div = document.createElement('div');
        div.className = 'thinker-card';
        div.id = `node-${node.id}`;
        div.dataset.id = node.id;
        div.style.left = `${node.x}px`;
        div.style.top = `${node.y}px`;
        div.style.width = `${node.w}px`;

        div.innerHTML = `
            <div class="thinker-top-row">
                <div class="thinker-info">
                    <div class="thinker-name">${node.name}</div>
                    <div class="thinker-years">${node.years}</div>
                    ${node.concept ? `<div class="thinker-concept">${node.concept}</div>` : ''}
                </div>
                <div class="portrait-wrapper" title="${node.name}">
                    <img src="${node.img}" alt="${node.name}" class="portrait-img">
                </div>
            </div>
            <div class="thinker-insight-box">
                <div class="insight-header">
                    <span class="insight-title">Erkenntnis / Position:</span>
                    <span class="insight-hint">Sicherungsfeld</span>
                </div>
                <textarea class="thinker-insight-input" placeholder="Wichtigste Erkenntnis für die Sicherung hier eintragen...">${escapeHtml(node.insight || '')}</textarea>
            </div>
        `;

        // Event-Handling für das Sicherungsfeld: Tippen speichert automatisch
        const textarea = div.querySelector('.thinker-insight-input');
        
        // Verhindere, dass Berührungen im Textfeld versehentlich die Karte verschieben
        ['pointerdown', 'touchstart', 'mousedown'].forEach(evt => {
            textarea.addEventListener(evt, (e) => {
                e.stopPropagation();
            });
        });

        let saveTimeout = null;
        textarea.addEventListener('input', (e) => {
            node.insight = e.target.value;
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                saveToStorage();
            }, 400);
        });

        attachDragHandler(div, node);
        attachClickHandler(div, node.id);

        return div;
    }

    // Erstellt eine Notiz-Karte
    function createNoteElement(ann) {
        const div = document.createElement('div');
        div.className = 'note-card';
        div.id = `ann-${ann.id}`;
        div.dataset.id = ann.id;
        div.style.left = `${ann.x}px`;
        div.style.top = `${ann.y}px`;
        div.style.width = `${ann.w || 230}px`;

        const colorMap = {
            yellow: { bg: '#fef9c3', border: '#facc15' },
            blue: { bg: '#e0f2fe', border: '#38bdf8' },
            green: { bg: '#dcfce7', border: '#4ade80' },
            orange: { bg: '#ffedd5', border: '#fb923c' },
            purple: { bg: '#f3e8ff', border: '#c084fc' }
        };
        const c = colorMap[ann.color] || colorMap.yellow;
        div.style.backgroundColor = c.bg;
        div.style.borderColor = c.border;

        div.innerHTML = `
            <div class="note-text">${escapeHtml(ann.text)}</div>
            <div class="note-footer">
                <span>Notiz</span>
                <button type="button" class="note-delete-btn" title="Notiz löschen">✕</button>
            </div>
        `;

        div.querySelector('.note-delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteAnnotation(ann.id);
        });

        div.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            openEditNoteModal(ann);
        });

        attachDragHandler(div, ann, true);
        attachClickHandler(div, ann.id, true);

        return div;
    }

    // Erstellt ein Fragezeichen-Element
    function createQuestionElement(ann) {
        const div = document.createElement('div');
        div.className = 'question-marker';
        div.id = `ann-${ann.id}`;
        div.dataset.id = ann.id;
        div.style.left = `${ann.x}px`;
        div.style.top = `${ann.y}px`;
        div.textContent = '?';
        div.title = 'Reflexionspunkt / Offene Frage';

        attachDragHandler(div, ann, true);
        attachClickHandler(div, ann.id, true);

        return div;
    }

    // --- DRAG & DROP FÜR KARTEN & ELEMENTE (iPad & Maus optimiert) ---
    function attachDragHandler(el, dataObj, isAnnotation = false) {
        let isDragging = false;
        let startX, startY;
        let origNodeX, origNodeY;

        function onPointerDown(e) {
            // Nur im Bewegen-Modus ziehen
            if (activeTool !== 'select') return;
            if (e.target.closest('.thinker-insight-input') || e.target.closest('.note-delete-btn')) return;

            dismissInstruction();

            // Verhindere auf Touch/iPad, dass Safari den Touch als Scrollgeste der ganzen Seite kapert
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();

            isDragging = true;
            el.classList.add('dragging');
            try { el.setPointerCapture(e.pointerId); } catch(err) {}

            startX = e.clientX;
            startY = e.clientY;
            origNodeX = dataObj.x;
            origNodeY = dataObj.y;
        }

        function onPointerMove(e) {
            if (!isDragging) return;
            if (e.cancelable) e.preventDefault();

            const clientX = e.clientX;
            const clientY = e.clientY;

            const dx = (clientX - startX) / (state.zoom || 1);
            const dy = (clientY - startY) / (state.zoom || 1);

            let newX = Math.round(origNodeX + dx);
            let newY = Math.round(origNodeY + dy);

            // Canvas Bounds (3200x2400)
            newX = Math.max(10, Math.min(3200 - (dataObj.w || 40), newX));
            newY = Math.max(10, Math.min(2400 - (dataObj.h || 40), newY));

            dataObj.x = newX;
            dataObj.y = newY;

            el.style.left = `${newX}px`;
            el.style.top = `${newY}px`;

            // SVG-Verbindungen live mitbewegen
            renderConnections();
        }

        function onPointerUp(e) {
            if (!isDragging) return;
            isDragging = false;
            el.classList.remove('dragging');
            try { el.releasePointerCapture(e.pointerId); } catch(err) {}

            saveToStorage();
        }

        el.addEventListener('pointerdown', onPointerDown);
        el.addEventListener('pointermove', onPointerMove);
        el.addEventListener('pointerup', onPointerUp);
        el.addEventListener('pointercancel', onPointerUp);

        // Touchmove auf dem Element blockieren, wenn aktiv gezogen wird
        el.addEventListener('touchmove', (e) => {
            if (isDragging && e.cancelable) e.preventDefault();
        }, { passive: false });
    }

    // --- KLICK-HANDLING FÜR WERKZEUGE ---
    function attachClickHandler(el, id, isAnnotation = false) {
        el.addEventListener('click', (e) => {
            if (e.target.closest('.thinker-insight-input') || e.target.closest('.note-delete-btn')) return;

            if (activeTool === 'delete') {
                e.stopPropagation();
                if (isAnnotation) {
                    deleteAnnotation(id);
                } else {
                    showToast('Die philosophischen Stationen können nicht gelöscht, aber verschoben werden.');
                }
                return;
            }

            if (activeTool === 'arrow' || activeTool === 'conflict') {
                e.stopPropagation();
                handleLinkToolClick(id);
                return;
            }
        });
    }

    ['node-pole-left', 'node-pole-right', 'node-header'].forEach(nodeId => {
        const el = document.getElementById(nodeId);
        if (el) {
            el.addEventListener('click', (e) => {
                if (activeTool === 'arrow' || activeTool === 'conflict') {
                    e.stopPropagation();
                    const id = el.dataset.id;
                    handleLinkToolClick(id);
                }
            });
        }
    });

    function handleLinkToolClick(targetId) {
        if (!linkSourceId) {
            linkSourceId = targetId;
            highlightCandidate(targetId, true);
            instructionText.textContent = `Startpunkt gewählt: ${getNodeLabel(targetId)}. Klicke nun auf die Zielkarte.`;
        } else {
            if (linkSourceId === targetId) {
                highlightCandidate(linkSourceId, false);
                linkSourceId = null;
                instructionText.textContent = 'Verbindung abgebrochen. Klicke auf eine Karte, um zu beginnen.';
                return;
            }

            const fromId = linkSourceId;
            const toId = targetId;
            highlightCandidate(fromId, false);
            linkSourceId = null;

            if (activeTool === 'conflict') {
                // Blitz anlegen
                state.links.push({
                    id: `link-${Date.now()}`,
                    from: fromId,
                    to: toId,
                    type: 'conflict',
                    label: '' // SuS können Begriff unter dem Blitz selbst ergänzen
                });
                renderConnections();
                saveToStorage();
                showToast('Dialektischer Blitz hinzugefügt! Klicke unter den Blitz, um ihn zu beschriften.');
                setTool('select');
            } else {
                // Pfeil anlegen -> Modal für Beschriftung
                pendingLinkInfo = { from: fromId, to: toId, type: 'arrow' };
                linkModalTitle.textContent = 'Verbindung beschriften';
                linkInputText.value = '';
                linkModal.classList.add('show');
                linkInputText.focus();
            }
        }
    }

    function highlightCandidate(nodeId, enable) {
        const el = document.getElementById(`node-${nodeId}`) || document.getElementById(`ann-${nodeId}`);
        if (el) {
            if (enable) el.classList.add('target-candidate');
            else el.classList.remove('target-candidate');
        }
    }

    function getNodeLabel(id) {
        const n = state.nodes.find(x => x.id === id);
        if (n) return n.name || n.title || id;
        return id;
    }

    // --- SVG VERBINDUNGEN BERECHNEN & ZEICHNEN ---
    function renderConnections() {
        svgLinksGroup.innerHTML = '';

        state.links.forEach(link => {
            const nodeFrom = getNodeGeometry(link.from);
            const nodeTo = getNodeGeometry(link.to);

            if (!nodeFrom || !nodeTo) return;

            const pathData = calculateConnectionPath(nodeFrom, nodeTo, link);
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.dataset.linkId = link.id;

            // Hauptlinie
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', pathData.d);

            if (link.type === 'conflict') {
                path.setAttribute('class', 'connection-line conflict-line');
                path.setAttribute('marker-start', 'url(#arrowhead-orange-start)');
                path.setAttribute('marker-end', 'url(#arrowhead-orange-end)');
            } else {
                path.setAttribute('class', 'connection-line');
                path.setAttribute('marker-end', 'url(#arrowhead-blue)');
            }

            path.addEventListener('click', (e) => {
                if (activeTool === 'delete') {
                    e.stopPropagation();
                    deleteLink(link.id);
                }
            });

            group.appendChild(path);

            // Blitz in der Mitte bei dialektischem Konflikt
            if (link.type === 'conflict') {
                const blitz = createBlitzBadge(pathData.midX, pathData.midY, link.id);
                group.appendChild(blitz);

                // TEXT UNTER DEM BLITZ:
                // Wenn SuS Text eingegeben haben, wird er unter dem Blitz angezeigt.
                // Wenn noch kein Text vorhanden ist, erscheint eine dezente Einladung "+ Begriff ergänzen"!
                const labelUnderBlitz = createConflictLabelElement(pathData.midX, pathData.midY + 32, link);
                group.appendChild(labelUnderBlitz);
            } else if (link.label) {
                // Normales Pfeil-Label
                const labelGroup = createLabelElement(pathData.midX, pathData.midY, link.label, link.id);
                group.appendChild(labelGroup);
            }

            svgLinksGroup.appendChild(group);
        });
    }

    function getNodeGeometry(id) {
        const node = state.nodes.find(n => n.id === id);
        if (node) {
            return {
                x: node.x,
                y: node.y,
                w: node.w || 360,
                h: node.h || 175,
                id: node.id
            };
        }
        const ann = state.annotations.find(a => a.id === id);
        if (ann) {
            return {
                x: ann.x,
                y: ann.y,
                w: ann.w || 100,
                h: ann.h || 40,
                id: ann.id
            };
        }
        const el = document.getElementById(`node-${id}`) || document.getElementById(`ann-${id}`);
        if (el) {
            return {
                x: parseInt(el.style.left, 10) || 0,
                y: parseInt(el.style.top, 10) || 0,
                w: el.offsetWidth,
                h: el.offsetHeight,
                id: id
            };
        }
        return null;
    }

    function calculateConnectionPath(from, to, link) {
        const cFrom = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
        const cTo = { x: to.x + to.w / 2, y: to.y + to.h / 2 };

        let startPoint, endPoint;
        const dx = cTo.x - cFrom.x;
        const dy = cTo.y - cFrom.y;

        if (link.curve === 'smooth' && from.y < to.y) {
            // Geschwungene Kurve aus dem Boden nach rechts in die Zielkarte
            startPoint = { x: from.x + from.w * 0.5, y: from.y + from.h };
            endPoint = { x: to.x, y: to.y + to.h * 0.4 };
            const cx1 = startPoint.x;
            const cy1 = startPoint.y + Math.max(35, (endPoint.y - startPoint.y) * 0.55);
            const cx2 = endPoint.x - Math.max(40, (endPoint.x - startPoint.x) * 0.35);
            const cy2 = endPoint.y;
            const d = `M ${startPoint.x} ${startPoint.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endPoint.x} ${endPoint.y}`;
            const midX = (cx1 + cx2) / 2;
            const midY = (cy1 + cy2) / 2;
            return { d, startPoint, endPoint, midX, midY };
        }

        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) {
                startPoint = { x: from.x + from.w, y: cFrom.y };
                endPoint = { x: to.x, y: cTo.y };
            } else {
                startPoint = { x: from.x, y: cFrom.y };
                endPoint = { x: to.x + to.w, y: cTo.y };
            }
        } else {
            if (dy > 0) {
                startPoint = { x: cFrom.x, y: from.y + from.h };
                endPoint = { x: cTo.x, y: to.y };
            } else {
                startPoint = { x: cFrom.x, y: from.y };
                endPoint = { x: cTo.x, y: to.y + to.h };
            }
        }

        const midX = (startPoint.x + endPoint.x) / 2;
        const midY = (startPoint.y + endPoint.y) / 2;
        const d = `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`;

        return { d, startPoint, endPoint, midX, midY };
    }

    function createBlitzBadge(x, y, linkId) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'conflict-blitz-badge');
        g.setAttribute('transform', `translate(${x}, ${y})`);

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', '17');
        circle.setAttribute('fill', '#ffffff');
        circle.setAttribute('stroke', '#d75f0a');
        circle.setAttribute('stroke-width', '1.6');
        g.appendChild(circle);

        // Der TikZ-Blitz
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '-4,-10 3,-2 0,-2 4,10 -3,2 0,2');
        polygon.setAttribute('fill', '#d75f0a');
        polygon.setAttribute('stroke', '#d75f0a');
        polygon.setAttribute('stroke-width', '0.8');
        g.appendChild(polygon);

        g.addEventListener('click', (e) => {
            if (activeTool === 'delete') {
                e.stopPropagation();
                deleteLink(linkId);
            }
        });

        return g;
    }

    // Element für den Text UNTER dem Blitz (Rousseau <-> Gehlen)
    function createConflictLabelElement(x, y, link) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'connection-label-group');
        g.setAttribute('transform', `translate(${x}, ${y})`);

        if (link.label && link.label.trim()) {
            // SuS haben einen Begriff eingegeben
            const text = link.label.trim();
            const approxWidth = Math.max(70, text.length * 7.5 + 20);

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('class', 'connection-label-bg conflict-bg');
            rect.setAttribute('x', -approxWidth / 2);
            rect.setAttribute('y', -12);
            rect.setAttribute('width', approxWidth);
            rect.setAttribute('height', 24);

            const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textEl.setAttribute('class', 'connection-label-text conflict-label');
            textEl.textContent = text;

            g.appendChild(rect);
            g.appendChild(textEl);
        } else {
            // Noch kein Text vorhanden: Dezente Schaltfläche unter dem Blitz
            const promptText = '+ Begriff ergänzen';
            const approxWidth = 120;

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('class', 'add-label-prompt-bg');
            rect.setAttribute('x', -approxWidth / 2);
            rect.setAttribute('y', -11);
            rect.setAttribute('width', approxWidth);
            rect.setAttribute('height', 22);

            const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textEl.setAttribute('class', 'add-label-prompt-text');
            textEl.textContent = promptText;

            g.appendChild(rect);
            g.appendChild(textEl);
        }

        // Klick öffnet Eingabedialog für den Text unter dem Blitz
        g.addEventListener('click', (e) => {
            e.stopPropagation();
            if (activeTool === 'delete') {
                deleteLink(link.id);
                return;
            }
            openEditLinkModal(link);
        });

        return g;
    }

    function createLabelElement(x, y, text, linkId) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'connection-label-group');
        g.setAttribute('transform', `translate(${x}, ${y})`);

        const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textEl.setAttribute('class', 'connection-label-text');
        textEl.textContent = text;

        const approxWidth = Math.max(40, text.length * 7.5 + 16);
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('class', 'connection-label-bg');
        rect.setAttribute('x', -approxWidth / 2);
        rect.setAttribute('y', -11);
        rect.setAttribute('width', approxWidth);
        rect.setAttribute('height', 22);

        g.appendChild(rect);
        g.appendChild(textEl);

        const link = state.links.find(l => l.id === linkId);
        g.addEventListener('click', (e) => {
            e.stopPropagation();
            if (activeTool === 'delete') {
                deleteLink(linkId);
            } else if (link) {
                openEditLinkModal(link);
            }
        });

        return g;
    }

    // --- FREIHAND-ZEICHNEN & APPLE PENCIL / RADIERER UNTERSTÜTZUNG ---
    function setupPenTools() {
        if (!drawingsCanvas || !drawingsCtx) return;

        const btnDrawMode = document.getElementById('btnPenDrawMode');
        const btnEraserMode = document.getElementById('btnPenEraserMode');
        const penColorGroup = document.getElementById('penColorGroup');
        const btnUndoDrawing = document.getElementById('btnUndoDrawing');

        function updatePenSubModeUI() {
            if (penSubMode === 'erase') {
                if (btnEraserMode) btnEraserMode.classList.add('active');
                if (btnDrawMode) btnDrawMode.classList.remove('active');
                drawingsCanvas.classList.remove('active-pen');
                drawingsCanvas.classList.add('active-eraser');
                if (penColorGroup) penColorGroup.style.opacity = '0.45';
                instructionText.textContent = 'Radierer: Ziehe über gezeichnete Striche oder tippe sie an, um sie gezielt wegzuradieren.';
            } else {
                if (btnDrawMode) btnDrawMode.classList.add('active');
                if (btnEraserMode) btnEraserMode.classList.remove('active');
                drawingsCanvas.classList.add('active-pen');
                drawingsCanvas.classList.remove('active-eraser');
                if (penColorGroup) penColorGroup.style.opacity = '1';
                instructionText.textContent = 'Stift-Modus: Schreibe oder zeichne frei mit dem Apple Pencil / Finger auf dem Board.';
            }
        }

        if (btnDrawMode) {
            btnDrawMode.addEventListener('click', () => {
                penSubMode = 'draw';
                updatePenSubModeUI();
            });
        }

        if (btnEraserMode) {
            btnEraserMode.addEventListener('click', () => {
                penSubMode = 'erase';
                updatePenSubModeUI();
            });
        }

        // Farbwahl im Stift-Menü (schaltet bei Klick automatisch wieder in Stift-Modus)
        document.querySelectorAll('.pen-color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.pen-color-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentPenColor = btn.dataset.color;
                penSubMode = 'draw';
                updatePenSubModeUI();
            });
        });

        // Strichstärke (schaltet ebenfalls in Stift-Modus)
        document.querySelectorAll('.pen-size-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.pen-size-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentPenSize = parseInt(btn.dataset.size, 10) || 2;
                penSubMode = 'draw';
                updatePenSubModeUI();
            });
        });

        // Rückgängig-Aktion (unterstützt sowohl gezeichnete als auch wegradierte Striche)
        if (btnUndoDrawing) {
            btnUndoDrawing.addEventListener('click', () => {
                if (drawingUndoStack.length > 0) {
                    const action = drawingUndoStack.pop();
                    if (action.type === 'add') {
                        const idx = state.drawings.indexOf(action.stroke);
                        if (idx !== -1) {
                            state.drawings.splice(idx, 1);
                        } else {
                            state.drawings.pop();
                        }
                        redrawAllDrawings();
                        saveToStorage();
                        showToast('Strich rückgängig gemacht.');
                    } else if (action.type === 'erase') {
                        // Wegradierte Striche in korrekter Reihenfolge wiederherstellen
                        action.items.sort((a, b) => a.index - b.index);
                        action.items.forEach(item => {
                            const insertAt = Math.min(item.index, state.drawings.length);
                            state.drawings.splice(insertAt, 0, item.stroke);
                        });
                        redrawAllDrawings();
                        saveToStorage();
                        showToast('Wegradierten Strich wiederhergestellt.');
                    }
                } else if (state.drawings && state.drawings.length > 0) {
                    state.drawings.pop();
                    redrawAllDrawings();
                    saveToStorage();
                    showToast('Letzter Strich entfernt.');
                } else {
                    showToast('Keine Zeichnungen zum Rückgängigmachen vorhanden.');
                }
            });
        }

        // Event-Listener für das Zeichnen und Radieren auf dem Canvas
        drawingsCanvas.addEventListener('pointerdown', onPenPointerDown);
        drawingsCanvas.addEventListener('pointermove', onPenPointerMove);
        drawingsCanvas.addEventListener('pointerup', onPenPointerUp);
        drawingsCanvas.addEventListener('pointercancel', onPenPointerUp);
    }

    function getCanvasCoords(e) {
        const rect = drawingsCanvas.getBoundingClientRect();
        const scaleX = drawingsCanvas.width / rect.width;
        const scaleY = drawingsCanvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    function distToSegmentSquared(p, v, w) {
        const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
        if (l2 === 0) return (p.x - v.x) * (p.x - v.x) + (p.y - v.y) * (p.y - v.y);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        const projX = v.x + t * (w.x - v.x);
        const projY = v.y + t * (w.y - v.y);
        return (p.x - projX) * (p.x - projX) + (p.y - projY) * (p.y - projY);
    }

    function isPointNearStroke(pos, stroke, radius) {
        if (!stroke || !stroke.points || stroke.points.length === 0) return false;
        const thresh = radius + ((stroke.size || 2) / 2);
        const threshSq = thresh * thresh;

        if (stroke.points.length === 1) {
            const dx = pos.x - stroke.points[0].x;
            const dy = pos.y - stroke.points[0].y;
            return (dx * dx + dy * dy) <= threshSq;
        }

        for (let i = 0; i < stroke.points.length - 1; i++) {
            if (distToSegmentSquared(pos, stroke.points[i], stroke.points[i + 1]) <= threshSq) {
                return true;
            }
        }
        return false;
    }

    function handleEraseAt(pos) {
        if (!state.drawings || state.drawings.length === 0) return;
        const eraseRadius = 22; // Großzügiger Radius für Stift- und Fingerbedienung
        let changed = false;

        for (let i = state.drawings.length - 1; i >= 0; i--) {
            const stroke = state.drawings[i];
            if (isPointNearStroke(pos, stroke, eraseRadius)) {
                const removed = state.drawings.splice(i, 1)[0];
                currentErasedInDrag.push({ index: i, stroke: removed });
                changed = true;
            }
        }

        if (changed) {
            redrawAllDrawings();
        }
    }

    function onPenPointerDown(e) {
        if (activeTool !== 'pen') return;
        drawingsCanvas.setPointerCapture(e.pointerId);
        const pos = getCanvasCoords(e);

        if (penSubMode === 'erase') {
            isErasing = true;
            currentErasedInDrag = [];
            handleEraseAt(pos);
        } else {
            isDrawing = true;
            currentStroke = {
                color: currentPenColor,
                size: currentPenSize,
                points: [pos]
            };

            drawingsCtx.strokeStyle = currentPenColor;
            drawingsCtx.lineWidth = currentPenSize;
            drawingsCtx.lineCap = 'round';
            drawingsCtx.lineJoin = 'round';

            drawingsCtx.beginPath();
            drawingsCtx.moveTo(pos.x, pos.y);
        }
        e.preventDefault();
    }

    function onPenPointerMove(e) {
        if (activeTool !== 'pen') return;
        const pos = getCanvasCoords(e);

        if (penSubMode === 'erase') {
            if (isErasing) {
                handleEraseAt(pos);
            }
        } else {
            if (!isDrawing || !currentStroke) return;
            currentStroke.points.push(pos);
            drawingsCtx.lineTo(pos.x, pos.y);
            drawingsCtx.stroke();
        }
        e.preventDefault();
    }

    function onPenPointerUp(e) {
        if (activeTool !== 'pen') return;
        try { drawingsCanvas.releasePointerCapture(e.pointerId); } catch(err) {}

        if (penSubMode === 'erase') {
            if (isErasing) {
                isErasing = false;
                if (currentErasedInDrag && currentErasedInDrag.length > 0) {
                    drawingUndoStack.push({
                        type: 'erase',
                        items: currentErasedInDrag
                    });
                    saveToStorage();
                    showToast(currentErasedInDrag.length === 1 ? '1 Strich wegradiert.' : `${currentErasedInDrag.length} Striche wegradiert.`);
                }
                currentErasedInDrag = [];
            }
        } else {
            if (!isDrawing || !currentStroke) return;
            isDrawing = false;
            if (currentStroke.points.length > 1) {
                state.drawings.push(currentStroke);
                drawingUndoStack.push({
                    type: 'add',
                    stroke: currentStroke
                });
                saveToStorage();
            }
            currentStroke = null;
        }
        e.preventDefault();
    }

    function redrawAllDrawings() {
        if (!drawingsCtx) return;
        drawingsCtx.clearRect(0, 0, drawingsCanvas.width, drawingsCanvas.height);

        if (!state.drawings || !state.drawings.length) return;

        state.drawings.forEach(stroke => {
            if (!stroke.points || stroke.points.length < 2) return;
            drawingsCtx.save();
            drawingsCtx.strokeStyle = stroke.color || '#143264';
            drawingsCtx.lineWidth = stroke.size || 2;
            drawingsCtx.lineCap = 'round';
            drawingsCtx.lineJoin = 'round';

            drawingsCtx.beginPath();
            drawingsCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
                drawingsCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            drawingsCtx.stroke();
            drawingsCtx.restore();
        });
    }

    // --- ANMERKUNGEN (NOTIZEN & FRAGEZEICHEN) ---
    canvasBoard.addEventListener('click', (e) => {
        if (activeTool === 'pen') return;
        if (e.target !== canvasBoard && e.target !== document.getElementById('svgConnections')) return;

        const rect = canvasBoard.getBoundingClientRect();
        const clickX = Math.round((e.clientX - rect.left) / (state.zoom || 1));
        const clickY = Math.round((e.clientY - rect.top) / (state.zoom || 1));

        if (activeTool === 'note') {
            pendingNotePos = { x: clickX - 110, y: clickY - 40 };
            openCreateNoteModal();
        } else if (activeTool === 'question') {
            const newQ = {
                id: `q-${Date.now()}`,
                type: 'question',
                x: clickX - 17,
                y: clickY - 17,
                w: 34,
                h: 34
            };
            state.annotations.push(newQ);
            renderCanvas();
            saveToStorage();
            showToast('Fragezeichen platziert!');
            setTool('select');
        }
    });

    function deleteAnnotation(id) {
        state.annotations = state.annotations.filter(a => a.id !== id);
        state.links = state.links.filter(l => l.from !== id && l.to !== id);
        renderCanvas();
        saveToStorage();
        showToast('Element gelöscht.');
    }

    function deleteLink(id) {
        state.links = state.links.filter(l => l.id !== id);
        renderConnections();
        saveToStorage();
        showToast('Verbindung gelöscht.');
    }

    // --- TOOLBAR & WERKZEUGE ---
    function setupToolbar() {
        const toolButtons = document.querySelectorAll('.tool-btn');
        toolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                setTool(tool);
            });
        });
    }

    function setTool(toolName) {
        activeTool = toolName;
        linkSourceId = null;
        document.querySelectorAll('.tool-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tool === toolName);
        });
        document.querySelectorAll('.target-candidate').forEach(el => el.classList.remove('target-candidate'));

        // Freihand-Zeichenfläche aktivieren/deaktivieren
        if (toolName === 'pen') {
            penSubtoolbar.style.display = 'flex';
            if (penSubMode === 'erase') {
                drawingsCanvas.classList.remove('active-pen');
                drawingsCanvas.classList.add('active-eraser');
            } else {
                drawingsCanvas.classList.add('active-pen');
                drawingsCanvas.classList.remove('active-eraser');
            }
        } else {
            drawingsCanvas.classList.remove('active-pen');
            drawingsCanvas.classList.remove('active-eraser');
            penSubtoolbar.style.display = 'none';
        }

        const instructions = {
            select: 'Bewegen: Verschiebe Stationen frei. Verbinde die Positionen im Verlauf der Reihe eigenständig mit Pfeilen und Blitzen.',
            pen: penSubMode === 'erase' 
                ? 'Radierer: Ziehe über gezeichnete Striche oder tippe sie an, um sie gezielt wegzuradieren.'
                : 'Stift-Modus: Schreibe oder zeichne frei mit dem Apple Pencil / Finger auf dem Board.',
            arrow: 'Pfeil-Werkzeug: Klicke nacheinander auf Start- und Zielkarte, um eine Beziehung herzustellen.',
            conflict: 'Blitz-Werkzeug: Markiere dialektische Brüche (⚡). Den Begriff kannst du direkt unter den Blitz schreiben.',
            question: 'Fragezeichen-Werkzeug: Klicke auf eine beliebige Stelle, um offene Fragen zu markieren.',
            note: 'Notiz-Werkzeug: Klicke auf den Canvas, um ein eigenes Textkärtchen zu platzieren.',
            delete: 'Lösch-Modus: Klicke auf Pfeile, Notizen oder Symbole, um sie zu entfernen.'
        };
        showInstruction(instructions[toolName] || '', 3500);
    }

    // --- ZOOM & NAVIGATION ---
    function setupZoomControls() {
        const btnIn = document.getElementById('btnZoomIn');
        const btnOut = document.getElementById('btnZoomOut');
        const btnFit = document.getElementById('btnZoomFit');

        if (btnIn) btnIn.addEventListener('click', () => setZoom(state.zoom + 0.1));
        if (btnOut) btnOut.addEventListener('click', () => setZoom(state.zoom - 0.1));
        if (btnFit) btnFit.addEventListener('click', () => fitCanvasToScreen());

        // Verhindert, dass Safari beim 2-Finger-Pinch die Tab-Übersicht öffnet oder die ganze Webseite zoomt
        ['gesturestart', 'gesturechange', 'gestureend'].forEach(type => {
            document.addEventListener(type, (e) => {
                e.preventDefault();
            }, { passive: false });
        });

        // 2-Finger Pinch-Zoom & Pan für iPad / Touch-Screens
        let touchPinchStartDist = 0;
        let touchPinchStartZoom = 1;
        let touchPinchStartCenter = { x: 0, y: 0 };
        let touchPinchStartScroll = { left: 0, top: 0 };
        let isPinching = false;

        if (canvasViewport) {
            canvasViewport.addEventListener('touchstart', (e) => {
                if (e.touches.length === 2) {
                    isPinching = true;
                    dismissInstruction();
                    const t0 = e.touches[0];
                    const t1 = e.touches[1];
                    touchPinchStartDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
                    touchPinchStartZoom = state.zoom || 1;
                    touchPinchStartCenter = {
                        x: (t0.clientX + t1.clientX) / 2,
                        y: (t0.clientY + t1.clientY) / 2
                    };
                    touchPinchStartScroll = {
                        left: canvasViewport.scrollLeft,
                        top: canvasViewport.scrollTop
                    };
                    if (canvasBoard) canvasBoard.style.transition = 'none';
                    if (e.cancelable) e.preventDefault();
                }
            }, { passive: false });

            canvasViewport.addEventListener('touchmove', (e) => {
                if (e.touches.length === 2 && isPinching) {
                    if (e.cancelable) e.preventDefault();
                    const t0 = e.touches[0];
                    const t1 = e.touches[1];
                    const currentDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
                    if (touchPinchStartDist > 0) {
                        const scaleFactor = currentDist / touchPinchStartDist;
                        const newZoom = Math.max(0.35, Math.min(1.5, touchPinchStartZoom * scaleFactor));
                        setZoom(newZoom, true);

                        // 2-Finger Verschieben (Pan)
                        const currentCenter = {
                            x: (t0.clientX + t1.clientX) / 2,
                            y: (t0.clientY + t1.clientY) / 2
                        };
                        const dx = currentCenter.x - touchPinchStartCenter.x;
                        const dy = currentCenter.y - touchPinchStartCenter.y;
                        canvasViewport.scrollLeft = touchPinchStartScroll.left - dx;
                        canvasViewport.scrollTop = touchPinchStartScroll.top - dy;
                    }
                }
            }, { passive: false });

            const finishPinch = () => {
                if (isPinching) {
                    isPinching = false;
                    touchPinchStartDist = 0;
                    if (canvasBoard) canvasBoard.style.transition = 'transform 0.1s ease-out';
                    saveToStorage();
                }
            };
            canvasViewport.addEventListener('touchend', (e) => {
                if (e.touches.length < 2) finishPinch();
            });
            canvasViewport.addEventListener('touchcancel', finishPinch);
        }
    }

    function setZoom(val, smooth = false) {
        if (smooth) {
            state.zoom = Math.max(0.35, Math.min(1.5, Math.round(val * 100) / 100));
        } else {
            state.zoom = Math.max(0.4, Math.min(1.5, Math.round(val * 10) / 10));
        }
        applyZoom();
        if (!smooth) saveToStorage();
    }

    function applyZoom() {
        if (!canvasBoard) return;
        canvasBoard.style.transform = `scale(${state.zoom})`;
        zoomLevelText.textContent = `${Math.round(state.zoom * 100)}%`;
    }

    function fitCanvasToScreen() {
        const availWidth = canvasViewport.clientWidth - 60;
        const availHeight = canvasViewport.clientHeight - 60;
        const scaleX = availWidth / 1480;
        const scaleY = availHeight / 1100;
        const fitScale = Math.min(scaleX, scaleY, 1.0);
        setZoom(fitScale);
    }

    // --- MODALS (NOTIZEN & BESCHRIFTUNG) ---
    function setupModals() {
        document.querySelectorAll('.color-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
                currentNoteColor = dot.dataset.color;
            });
        });

        btnCancelNote.addEventListener('click', () => {
            noteModal.classList.remove('show');
            pendingNotePos = null;
        });

        btnSaveNote.addEventListener('click', () => {
            const text = noteInputText.value.trim();
            if (!text) {
                noteModal.classList.remove('show');
                return;
            }

            if (noteModal.dataset.editingId) {
                const note = state.annotations.find(a => a.id === noteModal.dataset.editingId);
                if (note) {
                    note.text = text;
                    note.color = currentNoteColor;
                }
            } else if (pendingNotePos) {
                const newNote = {
                    id: `note-${Date.now()}`,
                    type: 'note',
                    text: text,
                    color: currentNoteColor,
                    x: pendingNotePos.x,
                    y: pendingNotePos.y,
                    w: 230
                };
                state.annotations.push(newNote);
            }

            noteModal.classList.remove('show');
            delete noteModal.dataset.editingId;
            pendingNotePos = null;
            renderCanvas();
            saveToStorage();
            setTool('select');
        });

        btnCancelLink.addEventListener('click', () => {
            linkModal.classList.remove('show');
            pendingLinkInfo = null;
        });

        btnSaveLink.addEventListener('click', () => {
            const text = linkInputText.value.trim();

            if (linkModal.dataset.editingLinkId) {
                // Bestehenden Link bearbeiten (z. B. unter dem Blitz)
                const link = state.links.find(l => l.id === linkModal.dataset.editingLinkId);
                if (link) {
                    link.label = text;
                }
                delete linkModal.dataset.editingLinkId;
            } else if (pendingLinkInfo) {
                // Neuen Pfeil anlegen
                state.links.push({
                    id: `link-${Date.now()}`,
                    from: pendingLinkInfo.from,
                    to: pendingLinkInfo.to,
                    type: pendingLinkInfo.type,
                    label: text
                });
                pendingLinkInfo = null;
            }

            linkModal.classList.remove('show');
            renderConnections();
            saveToStorage();
            showToast('Verbindungstext aktualisiert!');
            setTool('select');
        });
    }

    function openCreateNoteModal() {
        document.getElementById('noteModalTitle').textContent = 'Neue Notiz verfassen';
        noteInputText.value = '';
        delete noteModal.dataset.editingId;
        noteModal.classList.add('show');
        noteInputText.focus();
    }

    function openEditNoteModal(note) {
        document.getElementById('noteModalTitle').textContent = 'Notiz bearbeiten';
        noteInputText.value = note.text;
        noteModal.dataset.editingId = note.id;
        currentNoteColor = note.color || 'yellow';
        document.querySelectorAll('.color-dot').forEach(d => {
            d.classList.toggle('active', d.dataset.color === currentNoteColor);
        });
        noteModal.classList.add('show');
        noteInputText.focus();
    }

    function openEditLinkModal(link) {
        if (link.type === 'conflict') {
            linkModalTitle.textContent = 'Begriff unter dem Blitz ergänzen / ändern';
            linkInputText.placeholder = 'z. B. Dialektischer Bruch, Widerspruch...';
        } else {
            linkModalTitle.textContent = 'Verbindung beschriften';
            linkInputText.placeholder = 'z. B. begründet, kritisiert...';
        }
        linkInputText.value = link.label || '';
        linkModal.dataset.editingLinkId = link.id;
        linkModal.classList.add('show');
        linkInputText.focus();
    }

    // --- PERSISTENZ-BUTTONS: EXPORT / IMPORT / RESET / BILD-EXPORT ---
    function setupPersistenceButtons() {
        const btnExportJson = document.getElementById('btnExportJson');
        const importJsonFile = document.getElementById('importJsonFile');
        const btnExportImage = document.getElementById('btnExportImage');
        const btnReset = document.getElementById('btnReset');

        // 1. JSON Export (Stand sichern)
        btnExportJson.addEventListener('click', () => {
            const dataToSave = {
                app: 'AdvancedOrganizerPhilosophie',
                version: 3,
                savedAt: new Date().toISOString(),
                state: state
            };
            const jsonStr = JSON.stringify(dataToSave, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const dateStr = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = `organizer_stand_${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Stand erfolgreich als Datei gesichert!');
        });

        // 2. JSON Import (Stand laden)
        importJsonFile.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const parsed = JSON.parse(event.target.result);
                    if (parsed && parsed.state) {
                        state = parsed.state;
                        renderCanvas();
                        redrawAllDrawings();
                        saveToStorage();
                        showToast('Gespeicherter Stand erfolgreich geladen!');
                    } else {
                        alert('Die Datei hat kein gültiges Format.');
                    }
                } catch (err) {
                    console.error('Fehler beim Laden:', err);
                    alert('Datei konnte nicht geladen werden.');
                }
                importJsonFile.value = '';
            };
            reader.readAsText(file);
        });

        // 3. Zufällig Mischen (Neu anordnen auf linke und rechte Seite)
        const btnShuffle = document.getElementById('btnShuffle');
        if (btnShuffle) {
            btnShuffle.addEventListener('click', () => {
                assignRandomSlots(state.nodes);
                renderCanvas();
                saveToStorage();
                showToast('Stationen zufällig links & rechts verteilt!');
            });
        }

        // 4. Zurücksetzen
        btnReset.addEventListener('click', () => {
            const confirmed = confirm('Möchtest du den Advanced Organizer wirklich auf den Ursprungszustand zurücksetzen? Deine Änderungen und Zeichnungen gehen dabei verloren.');
            if (confirmed) {
                state = JSON.parse(JSON.stringify(INITIAL_STATE));
                assignRandomSlots(state.nodes);
                renderCanvas();
                redrawAllDrawings();
                saveToStorage();
                showToast('Auf Ursprungszustand zurückgesetzt (zufällig angeordnet).');
            }
        });

        // 5. Bild-Export (PNG inklusive Zeichnungen & Erkenntnis-Sicherung)
        btnExportImage.addEventListener('click', () => {
            exportCanvasAsImage();
        });
    }

    // Erstellt ein hochauflösendes PNG des gesamten Organizers
    function exportCanvasAsImage() {
        showToast('Erstelle Bildexport...');

        let maxX = 1480;
        let maxY = 1100;
        state.nodes.forEach(n => {
            maxX = Math.max(maxX, (n.x || 0) + (n.w || 360) + 50);
            maxY = Math.max(maxY, (n.y || 0) + (n.h || 175) + 50);
        });
        state.annotations.forEach(a => {
            maxX = Math.max(maxX, (a.x || 0) + (a.w || 230) + 50);
            maxY = Math.max(maxY, (a.y || 0) + (a.h || 100) + 50);
        });
        const width = Math.min(3200, Math.max(1480, Math.round(maxX)));
        const height = Math.min(2400, Math.max(1100, Math.round(maxY)));
        const scale = 2;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = width * scale;
        canvas.height = height * scale;
        ctx.scale(scale, scale);

        // Hintergrund
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Header
        drawHeaderToCanvas(ctx);

        // Pole
        drawPolesToCanvas(ctx);

        // SVG-Verbindungen
        drawConnectionsToCanvas(ctx);

        // Lade alle Porträts
        const imagesToLoad = [];
        state.nodes.forEach(node => {
            if (node.type === 'thinker' && node.img) {
                const img = new Image();
                img.src = node.img;
                imagesToLoad.push(new Promise(resolve => {
                    if (img.complete) resolve({ node, img });
                    else {
                        img.onload = () => resolve({ node, img });
                        img.onerror = () => resolve({ node, img: null });
                    }
                }));
            }
        });

        Promise.all(imagesToLoad).then(loadedImages => {
            // Denker-Karten mit Erkenntnis-Text zeichnen
            loadedImages.forEach(({ node, img }) => {
                drawThinkerCardToCanvas(ctx, node, img);
            });

            // Anmerkungen zeichnen
            state.annotations.forEach(ann => {
                drawAnnotationToCanvas(ctx, ann);
            });

            // Freihand-Zeichnungen (Stift) zeichnen
            if (state.drawings && state.drawings.length) {
                state.drawings.forEach(stroke => {
                    if (!stroke.points || stroke.points.length < 2) return;
                    ctx.save();
                    ctx.strokeStyle = stroke.color || '#143264';
                    ctx.lineWidth = stroke.size || 2;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.beginPath();
                    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
                    for (let i = 1; i < stroke.points.length; i++) {
                        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
                    }
                    ctx.stroke();
                    ctx.restore();
                });
            }

            const dataUrl = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `advanced_organizer_philosophie_${new Date().toISOString().slice(0, 10)}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showToast('Bild erfolgreich heruntergeladen!');
        });
    }

    function drawHeaderToCanvas(ctx) {
        ctx.save();
        ctx.fillStyle = '#f2f6fc';
        ctx.strokeStyle = '#143264';
        ctx.lineWidth = 1.5;
        roundRect(ctx, 50, 24, 1380, 70, 6, true, true);

        ctx.fillStyle = '#143264';
        ctx.font = 'bold 21px "EB Garamond", Georgia, serif';
        ctx.textAlign = 'left';
        ctx.fillText('Golden Record: Visitenkarte oder Trugbild der menschlichen Kultur?', 75, 65);
        ctx.restore();
    }

    function drawPolesToCanvas(ctx) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#143264';
        ctx.lineWidth = 1.5;
        
        roundRect(ctx, 50, 114, 660, 56, 4, true, true);
        ctx.fillStyle = '#143264';
        ctx.font = 'bold 18px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DIE VISITENKARTE', 380, 149);

        roundRect(ctx, 770, 114, 660, 56, 4, true, true);
        ctx.fillText('DAS TRUGBILD', 1100, 149);
        ctx.restore();
    }

    function drawThinkerCardToCanvas(ctx, node, img) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#143264';
        ctx.lineWidth = 1.4;
        roundRect(ctx, node.x, node.y, node.w, node.h, 6, true, true);

        // Name
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 18px "EB Garamond", Georgia, serif';
        ctx.textAlign = 'left';
        ctx.fillText(node.name, node.x + 14, node.y + 28);

        // Jahre & Konzept
        ctx.fillStyle = '#64748b';
        ctx.font = '12px "Inter", sans-serif';
        ctx.fillText(node.years, node.x + 14, node.y + 48);

        if (node.concept) {
            ctx.fillStyle = '#143264';
            ctx.font = '600 11px "Inter", sans-serif';
            ctx.fillText(node.concept, node.x + 14, node.y + 72);
        }

        // Porträt ohne schwarzen Rahmen
        if (img) {
            ctx.save();
            const px = node.x + node.w - 78;
            const py = node.y + 12;
            const pw = 66;
            const ph = 66;
            roundRect(ctx, px, py, pw, ph, 6, false, false);
            ctx.clip();
            // Leichter Zoom (1.16), um äußeren Rahmen sauber wegzucroppen
            ctx.drawImage(img, px - 5, py - 5, pw + 10, ph + 10);
            ctx.restore();
        }

        // Erkenntnis-Kasten
        const boxY = node.y + 88;
        const boxH = node.h - 96;
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        roundRect(ctx, node.x + 10, boxY, node.w - 20, boxH, 4, true, true);

        ctx.fillStyle = '#143264';
        ctx.font = 'bold 9px "Inter", sans-serif';
        ctx.fillText('ERKENNTNIS / POSITION:', node.x + 16, boxY + 14);

        if (node.insight) {
            ctx.fillStyle = '#0f172a';
            ctx.font = '12px "Inter", sans-serif';
            wrapText(ctx, node.insight, node.x + 16, boxY + 30, node.w - 32, 16);
        }

        ctx.restore();
    }

    function drawAnnotationToCanvas(ctx, ann) {
        ctx.save();
        if (ann.type === 'note') {
            ctx.fillStyle = '#fef9c3';
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 1;
            roundRect(ctx, ann.x, ann.y, ann.w || 230, 95, 6, true, true);

            ctx.fillStyle = '#1e293b';
            ctx.font = '13px "Inter", sans-serif';
            ctx.textAlign = 'left';
            wrapText(ctx, ann.text, ann.x + 10, ann.y + 24, 210, 18);
        } else if (ann.type === 'question') {
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.arc(ann.x + 17, ann.y + 17, 17, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('?', ann.x + 17, ann.y + 23);
        }
        ctx.restore();
    }

    function drawConnectionsToCanvas(ctx) {
        state.links.forEach(link => {
            const from = getNodeGeometry(link.from);
            const to = getNodeGeometry(link.to);
            if (!from || !to) return;

            const pathData = calculateConnectionPath(from, to, link);

            ctx.save();
            if (link.type === 'conflict') {
                ctx.strokeStyle = '#d75f0a';
                ctx.lineWidth = 2.2;
                ctx.setLineDash([6, 3]);
            } else {
                ctx.strokeStyle = '#143264';
                ctx.lineWidth = 1.8;
                ctx.setLineDash([5, 4]);
            }

            ctx.beginPath();
            ctx.moveTo(pathData.startPoint.x, pathData.startPoint.y);
            if (link.curve === 'smooth' && from.y < to.y) {
                const cx1 = pathData.startPoint.x;
                const cy1 = pathData.startPoint.y + Math.max(35, (pathData.endPoint.y - pathData.startPoint.y) * 0.55);
                const cx2 = pathData.endPoint.x - Math.max(40, (pathData.endPoint.x - pathData.startPoint.x) * 0.35);
                const cy2 = pathData.endPoint.y;
                ctx.bezierCurveTo(cx1, cy1, cx2, cy2, pathData.endPoint.x, pathData.endPoint.y);
            } else {
                ctx.lineTo(pathData.endPoint.x, pathData.endPoint.y);
            }
            ctx.stroke();

            drawCanvasArrowhead(ctx, pathData.startPoint, pathData.endPoint, link.type === 'conflict' ? '#d75f0a' : '#143264');

            if (link.type === 'conflict') {
                // Blitz
                ctx.setLineDash([]);
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#d75f0a';
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.arc(pathData.midX, pathData.midY, 17, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#d75f0a';
                ctx.font = 'bold 16px "Inter", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('⚡', pathData.midX, pathData.midY + 6);

                // Text UNTER dem Blitz, falls vorhanden
                if (link.label && link.label.trim()) {
                    ctx.fillStyle = '#d75f0a';
                    ctx.font = 'bold 11px "Inter", sans-serif';
                    ctx.fillText(link.label.trim(), pathData.midX, pathData.midY + 36);
                }
            } else if (link.label && link.label.trim()) {
                ctx.fillStyle = '#143264';
                ctx.font = 'bold 11px "Inter", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(link.label.trim(), pathData.midX, pathData.midY + 4);
            }

            ctx.restore();
        });
    }

    function drawCanvasArrowhead(ctx, from, to, color) {
        const headlen = 9;
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        ctx.save();
        ctx.setLineDash([]);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - headlen * Math.cos(angle - Math.PI / 7), to.y - headlen * Math.sin(angle - Math.PI / 7));
        ctx.lineTo(to.x - headlen * Math.cos(angle + Math.PI / 7), to.y - headlen * Math.sin(angle + Math.PI / 7));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
    }

    function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                ctx.fillText(line, x, y);
                line = words[n] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, y);
    }

    function setupKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
                const btnUndo = document.getElementById('btnUndoDrawing');
                if (btnUndo) btnUndo.click();
                return;
            }
            if (e.key === 'v' || e.key === 'V') setTool('select');
            if (e.key === 'p' || e.key === 'P') {
                setTool('pen');
                const btnDraw = document.getElementById('btnPenDrawMode');
                if (btnDraw) btnDraw.click();
            }
            if (e.key === 'e' || e.key === 'E') {
                setTool('pen');
                const btnEraser = document.getElementById('btnPenEraserMode');
                if (btnEraser) btnEraser.click();
            }
            if (e.key === 'a' || e.key === 'A') setTool('arrow');
            if (e.key === 'b' || e.key === 'B') setTool('conflict');
            if (e.key === 'n' || e.key === 'N') setTool('note');
            if (e.key === 'q' || e.key === 'Q') setTool('question');
            if (e.key === 'd' || e.key === 'D' || e.key === 'Delete') setTool('delete');
        });
    }

    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    init();

})();
