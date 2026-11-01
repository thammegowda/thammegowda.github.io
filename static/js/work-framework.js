(() => {
    "use strict";

    const root = document.getElementById("work-framework");
    if (!root) {
        throw new Error("The work framework container is missing.");
    }

    const viewport = root.querySelector(".work-framework__plot");
    const figure = root.querySelector(".work-framework__figure");
    const svg = root.querySelector("[data-plot]");
    const rows = root.querySelector("[data-octants]");
    const selection = root.querySelector(".work-framework__selection");
    const details = root.querySelector("[data-details]");
    const coordinates = root.querySelector("[data-coordinates]");
    const meaning = root.querySelector("[data-meaning]");
    const emptyDetails = details.textContent;
    const zoomOutput = root.querySelector("[data-zoom]");
    const zoomOut = root.querySelector('[data-action="zoom-out"]');
    const zoomIn = root.querySelector('[data-action="zoom-in"]');
    const clear = root.querySelector('[data-action="clear"]');
    const present = root.querySelector('[data-action="present"]');
    const presentationControls = root.querySelector(".work-framework__presentation-controls");
    const presentationProgress = root.querySelector("[data-presentation-progress]");
    const presentationToggle = root.querySelector('[data-action="presentation-toggle"]');
    const presentationExit = root.querySelector('[data-action="presentation-exit"]');
    const status = root.querySelector("[data-status]");
    const channelStrength = { low: 64, high: 224 };
    const rgb = channels => `rgb(${channels.join(", ")})`;
    const axisNames = ["Effort", "Impact", "Profile"];
    const axes = axisNames.map((name, index) => {
        const key = name.toLowerCase();
        root.style.setProperty(`--wf-${key}-rgb`, rgb(axisNames.map((_, i) => i === index ? channelStrength.high : 0)));
        root.style.setProperty(`--wf-${key}-plane-rgb`, rgb(axisNames.map((_, i) => i === index ? 0 : channelStrength.high)));
        return {
            name,
            color: `var(--wf-${key})`,
            planeColor: `var(--wf-${key}-plane)`,
            planeFill: `var(--wf-${key}-plane-rgb)`,
        };
    });
    const axisExtent = 2;
    const planeExtent = 1.4;
    const sceneRadius = Math.max(Math.sqrt(3), axisExtent, Math.SQRT2 * planeExtent);
    const octantInfo = [
        { name: "Quiet Snacking", meaning: "Easy work that creates little value and attracts little attention." },
        { name: "Preening", meaning: "Easy, low-impact work that gets noticed." },
        { name: "Quiet Wins", meaning: "Small efforts with substantial benefits, often unnoticed." },
        { name: "Visible Wins", meaning: "Low-effort, high-impact contributions that get recognized." },
        { name: "Quiet Ghost-Chasing", meaning: "A large investment in the wrong problem, without much attention." },
        { name: "High-Profile Ghost-Chasing", meaning: "A large, visible effort aimed at a problem that does not matter in the current context." },
        { name: "Unsung Work", meaning: "Demanding work that creates substantial value without much recognition." },
        { name: "Signature Work", meaning: "Demanding, valuable work that becomes widely recognized and associated with you." },
    ];
    const octants = octantInfo.map(({ name, meaning }, index) => {
        const bits = [index >> 2, (index >> 1) & 1, index & 1];
        const levels = bits.map(bit => bit ? "High" : "Low");
        const channels = bits.map(bit => bit ? channelStrength.high : channelStrength.low);
        const description = axes.map((axis, i) => `${axis.name}: ${levels[i]}`).join(" | ");
        const label = `Octant ${index + 1}: ${name}. ${description}`;
        return {
            id: index + 1,
            name,
            meaning,
            label,
            title: `${label}\n${meaning}`,
            color: rgb(channels),
            textColor: contrastText(channels),
            levels,
            bounds: bits.map(bit => bit ? [0.05, 1] : [-1, -0.05]),
        };
    });
    const initialYaw = Math.PI / 4;
    const initialElevation = Math.PI / 9;
    const state = { yaw: initialYaw, elevation: initialElevation, zoom: 1, selected: null, hovered: null, focused: null };
    const presentation = {
        active: false,
        complete: false,
        index: 0,
        paused: false,
        saved: null,
        timer: null,
        controlsTimer: null,
    };
    const presentationDelay = 3000;
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    let drag = null;
    let renderQueued = false;

    function contrastText(channels) {
        const linear = channels.map(channel => {
            const value = channel / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
        const blackContrast = (luminance + 0.05) / 0.05;
        const whiteContrast = 1.05 / (luminance + 0.05);
        return blackContrast >= whiteContrast ? "#000" : "#fff";
    }

    function element(tag, attributes = {}, text) {
        const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
        for (const [name, value] of Object.entries(attributes)) {
            node.setAttribute(name, value);
        }
        if (text !== undefined) {
            node.textContent = text;
        }
        return node;
    }

    const defs = element("defs");
    axes.forEach((axis, index) => {
        const marker = element("marker", {
            id: `work-framework-arrow-${index}`, viewBox: "0 0 6 6",
            refX: 6, refY: 3, markerWidth: 7, markerHeight: 7,
            markerUnits: "userSpaceOnUse", orient: "auto",
        });
        marker.append(element("path", { d: "M 0 0 L 6 3 L 0 6 Z", fill: axis.color }));
        defs.append(marker);
    });
    const calloutMarker = element("marker", {
        id: "work-framework-callout-arrow", viewBox: "0 0 7 7",
        refX: 7, refY: 3.5, markerWidth: 8, markerHeight: 8,
        markerUnits: "userSpaceOnUse", orient: "auto",
    });
    calloutMarker.append(element("path", { d: "M 0 0 L 7 3.5 L 0 7 Z", fill: "context-stroke" }));
    defs.append(calloutMarker);
    const facesLayer = element("g");
    const axesLayer = element("g", { "pointer-events": "none" });
    const connectorLayer = element("g", { class: "work-framework__connector", "pointer-events": "none" });
    const labelsLayer = element("g");
    svg.replaceChildren(defs, facesLayer, axesLayer, connectorLayer, labelsLayer);

    function requestRender() {
        if (renderQueued) {
            return;
        }
        renderQueued = true;
        requestAnimationFrame(() => {
            renderQueued = false;
            render();
        });
    }

    function render() {
        const inspectedId = inspectionId();
        const width = viewport.clientWidth;
        const height = viewport.clientHeight;
        const calloutReserve = Math.min(122, height * 0.26);
        const sceneHeight = height - calloutReserve;
        // Reserve margin around the extended geometry at maximum zoom.
        const scale = Math.min(width, sceneHeight) / (2 * sceneRadius * 1.4) * state.zoom;
        const cx = width / 2;
        const cy = sceneHeight / 2;
        const cosYaw = Math.cos(state.yaw);
        const sinYaw = Math.sin(state.yaw);
        const cosElevation = Math.cos(state.elevation);
        const sinElevation = Math.sin(state.elevation);
        const project = ([x, y, z]) => {
            const horizontal = x * cosYaw - y * sinYaw;
            const away = x * sinYaw + y * cosYaw;
            return {
                x: cx + horizontal * scale,
                y: cy - (z * cosElevation - away * sinElevation) * scale,
                depth: z * sinElevation + away * cosElevation,
            };
        };
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

        const faces = [];
        axes.forEach((axis, index) => {
            const otherAxes = [0, 1, 2].filter(i => i !== index);
            const points = [[-planeExtent, -planeExtent], [planeExtent, -planeExtent], [planeExtent, planeExtent], [-planeExtent, planeExtent]].map(([u, v]) => {
                const point = [0, 0, 0];
                point[otherAxes[0]] = u;
                point[otherAxes[1]] = v;
                return project(point);
            });
            faces.push({ axis, points, depth: points.reduce((sum, point) => sum + point.depth, 0) / 4 });
        });
        octants.forEach(octant => {
            for (let axis = 0; axis < 3; axis++) {
                const otherAxes = [0, 1, 2].filter(index => index !== axis);
                for (let side = 0; side < 2; side++) {
                    const normal = [0, 0, 0];
                    normal[axis] = side ? 1 : -1;
                    if (project(normal).depth <= 0) {
                        continue;
                    }
                    const points = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) => {
                        const point = [0, 0, 0];
                        point[axis] = octant.bounds[axis][side];
                        point[otherAxes[0]] = octant.bounds[otherAxes[0]][u];
                        point[otherAxes[1]] = octant.bounds[otherAxes[1]][v];
                        return project(point);
                    });
                    faces.push({ octant, points, depth: points.reduce((sum, point) => sum + point.depth, 0) / 4 });
                }
            }
        });
        faces.sort((a, b) => a.depth - b.depth);
        const faceNodes = document.createDocumentFragment();
        faces.forEach(({ octant, axis, points }) => {
            if (axis) {
                const plane = element("polygon", {
                    points: points.map(point => `${point.x},${point.y}`).join(" "),
                    fill: axis.planeFill, "fill-opacity": 0.13,
                    stroke: axis.planeColor, "stroke-opacity": 0.85,
                    "stroke-width": 1.4, "stroke-dasharray": "5 4",
                    class: "work-framework__split-plane",
                    "data-plane": axis.name.toLowerCase(),
                });
                const inPlaneAxes = axes.filter(item => item !== axis).map(item => item.name).join(" + ");
                plane.append(element("title", {}, `${axis.name} = 0: ${inPlaneAxes}`));
                faceNodes.append(plane);
                return;
            }
            const active = state.selected === octant.id || inspectedId === octant.id;
            const opacity = active ? 0.8 : state.selected === null ? 0.32 : 0.09;
            const polygon = element("polygon", {
                points: points.map(point => `${point.x},${point.y}`).join(" "),
                fill: octant.color, "fill-opacity": opacity,
                stroke: "var(--octant-ink)", "stroke-opacity": active ? 1 : state.selected === null ? 0.9 : 0.3,
                "stroke-width": active ? 1.5 : 0.8,
                class: "work-framework__face", "data-octant": octant.id,
                style: `--octant-color: ${octant.color}`,
            });
            polygon.append(element("title", {}, octant.title));
            faceNodes.append(polygon);
        });
        facesLayer.replaceChildren(faceNodes);

        const axisEnds = axes.flatMap((axis, index) =>
            [-1, 1].map(sign => {
                const vector = [0, 0, 0];
                vector[index] = sign * axisExtent;
                return { axis, index, sign, point: project(vector) };
            })
        );
        const axisNodes = document.createDocumentFragment();
        const axisLabelNodes = document.createDocumentFragment();
        axisEnds.forEach(({ axis, index, sign, point }) => {
            const line = element("line", {
                x1: cx, y1: cy, x2: point.x, y2: point.y,
                stroke: axis.color, "stroke-width": 1.8,
            });
            if (sign > 0) {
                line.setAttribute("marker-end", `url(#work-framework-arrow-${index})`);
            } else {
                line.setAttribute("stroke-dasharray", "4 4");
            }
            axisNodes.append(line);
            const dx = point.x - cx;
            const dy = point.y - cy;
            const length = Math.hypot(dx, dy);
            // An axis pointing at the camera needs a separate label position.
            let x = clamp(length > 1 ? point.x + 50 * dx / length : cx + sign * 56, 42, width - 42);
            let y = clamp(length > 1 ? point.y + 50 * dy / length - 6 : cy - 46, 18, sceneHeight - 28);
            if (length > 1) {
                // Move edge-clamped labels sideways rather than cover arrowheads.
                for (const direction of [1, -1]) {
                    const coversEnd = axisEnds.some(end =>
                        end.point.x > x - 42 && end.point.x < x + 42 &&
                        end.point.y > y - 18 && end.point.y < y + 24
                    );
                    if (!coversEnd) {
                        break;
                    }
                    x = clamp(point.x - direction * 64 * dy / length, 42, width - 42);
                    y = clamp(point.y + direction * 64 * dx / length - 6, 18, sceneHeight - 28);
                }
            }
            axisLabelNodes.append(element("rect", {
                x: x - 38, y: y - 14, width: 76, height: 34, rx: 5,
                fill: "var(--theme)", "fill-opacity": 0.96,
            }));
            const label = element("text", {
                x, y, "text-anchor": "middle", fill: axis.color,
                class: "work-framework__axis-name",
            }, axis.name);
            label.append(element("tspan", { x, dy: 14, class: "work-framework__axis-level" }, sign > 0 ? "High" : "Low"));
            axisLabelNodes.append(label);
        });
        axisNodes.append(element("circle", { cx, cy, r: 2.5, fill: "var(--primary)" }));
        axisNodes.append(element("text", { x: cx + 7, y: cy + 4, class: "work-framework__origin" }, "0"));
        axisNodes.append(axisLabelNodes);
        axesLayer.replaceChildren(axisNodes);

        const projectedOctants = octants.map(octant => ({
            octant,
            point: project(octant.bounds.map(([low, high]) => (low + high) / 2)),
        }));
        const labelNodes = document.createDocumentFragment();
        projectedOctants.slice().sort((a, b) => a.point.depth - b.point.depth).forEach(({ octant, point }) => {
            const active = state.selected === octant.id || inspectedId === octant.id;
            const marker = element("g", {
                class: "work-framework__marker", "data-octant": octant.id,
                style: `--octant-color: ${octant.color}; --octant-text: ${octant.textColor}`,
            });
            marker.append(element("title", {}, octant.title));
            marker.append(element("circle", {
                cx: point.x, cy: point.y, r: active ? 12 : 10,
                fill: octant.color, stroke: "var(--octant-ink)", "stroke-width": active ? 2.5 : 1.5,
            }));
            marker.append(element("text", {
                x: point.x, y: point.y, "text-anchor": "middle", dy: "0.35em",
            }, octant.id));
            labelNodes.append(marker);
        });
        labelsLayer.replaceChildren(labelNodes);

        const inspected = projectedOctants.find(item => item.octant.id === inspectedId);
        if (!inspected) {
            connectorLayer.replaceChildren();
            return;
        }
        selection.dataset.side = inspected.point.x < cx ? "right" : "left";
        const viewportRect = viewport.getBoundingClientRect();
        const calloutRect = selection.getBoundingClientRect();
        const callout = {
            x: calloutRect.left - viewportRect.left,
            y: calloutRect.top - viewportRect.top,
            width: calloutRect.width,
        };
        const startX = selection.dataset.side === "right" ? callout.x : callout.x + callout.width;
        const startY = callout.y + 18;
        const dx = inspected.point.x - startX;
        const dy = inspected.point.y - startY;
        const distance = Math.hypot(dx, dy);
        const endX = inspected.point.x - dx / distance * 15;
        const endY = inspected.point.y - dy / distance * 15;
        const elbowY = Math.min(startY - 12, endY + 18);
        const connector = element("polyline", {
            points: `${startX},${startY} ${startX},${elbowY} ${endX},${endY}`,
            fill: "none", stroke: inspected.octant.color,
            "stroke-width": 1.8, "stroke-linejoin": "round",
            "marker-end": "url(#work-framework-callout-arrow)",
            "data-octant": inspected.octant.id,
        });
        connectorLayer.replaceChildren(connector);
    }

    function inspectionId() {
        return state.hovered ?? state.focused ?? state.selected;
    }

    function octantById(id) {
        const octant = id === null ? null : octants.find(item => item.id === id);
        if (id !== null && !octant) {
            throw new RangeError(`Unknown work framework octant: ${id}`);
        }
        return octant;
    }

    function updateInspection() {
        const octant = octantById(inspectionId());
        details.textContent = octant ? `${octant.id}. ${octant.name}` : emptyDetails;
        coordinates.textContent = octant ?
            `(Effort=${octant.levels[0]}, Impact=${octant.levels[1]}, Profile=${octant.levels[2]})` : "";
        meaning.textContent = octant ? octant.meaning : "";
        selection.hidden = octant === null;
        selection.style.setProperty("--octant-color", octant ? octant.color : "transparent");
        clear.hidden = presentation.active || state.selected === null;
        clear.disabled = state.selected === null;
        octants.forEach(item => {
            item.row.dataset.inspected = String(item === octant);
        });
        requestRender();
    }

    function hover(id) {
        if (presentation.active) {
            return;
        }
        if (state.hovered === id) {
            return;
        }
        state.hovered = id;
        updateInspection();
    }

    function focusOctant(id) {
        if (presentation.active) {
            return;
        }
        if (state.focused === id) {
            return;
        }
        state.focused = id;
        if (id !== null) {
            state.hovered = null;
        }
        updateInspection();
    }

    function select(id) {
        const octant = octantById(id);
        state.selected = id;
        state.hovered = null;
        octants.forEach(item => {
            item.row.classList.toggle("is-selected", item.id === id);
            item.button.setAttribute("aria-pressed", String(item.id === id));
        });
        updateInspection();
    }

    function updatePresentationControls() {
        presentationProgress.textContent = `Octant ${presentation.index + 1} of ${octants.length}`;
        presentationToggle.textContent = presentation.complete ? "Replay" : presentation.paused ? "Resume" : "Pause";
    }

    function clearPresentationTimer() {
        if (presentation.timer !== null) {
            clearTimeout(presentation.timer);
            presentation.timer = null;
        }
    }

    function schedulePresentationStep() {
        clearPresentationTimer();
        if (!presentation.active || presentation.paused) {
            return;
        }
        presentation.timer = setTimeout(() => {
            presentation.timer = null;
            if (presentation.index === octants.length - 1) {
                presentation.paused = true;
                presentation.complete = true;
                updatePresentationControls();
                revealPresentationControls();
                return;
            }
            showPresentationOctant(presentation.index + 1);
            schedulePresentationStep();
        }, presentationDelay);
    }

    function showPresentationOctant(index) {
        presentation.index = clamp(index, 0, octants.length - 1);
        state.hovered = null;
        state.focused = null;
        select(octants[presentation.index].id);
        updatePresentationControls();
    }

    function replayPresentation() {
        presentation.complete = false;
        presentation.paused = false;
        showPresentationOctant(0);
        schedulePresentationStep();
    }

    function togglePresentation() {
        if (presentation.complete) {
            replayPresentation();
            return;
        }
        presentation.paused = !presentation.paused;
        updatePresentationControls();
        if (presentation.paused) {
            clearPresentationTimer();
        } else {
            schedulePresentationStep();
        }
    }

    function revealPresentationControls() {
        if (!presentation.active) {
            return;
        }
        if (presentation.controlsTimer !== null) {
            clearTimeout(presentation.controlsTimer);
        }
        presentationControls.classList.add("is-visible");
        figure.classList.remove("is-controls-hidden");
        presentation.controlsTimer = setTimeout(() => {
            presentation.controlsTimer = null;
            if (!presentationControls.contains(document.activeElement)) {
                presentationControls.classList.remove("is-visible");
                figure.classList.add("is-controls-hidden");
            }
        }, 1500);
    }

    function stopPresentation() {
        if (!presentation.active) {
            return;
        }
        clearPresentationTimer();
        if (presentation.controlsTimer !== null) {
            clearTimeout(presentation.controlsTimer);
            presentation.controlsTimer = null;
        }
        presentation.active = false;
        presentation.complete = false;
        presentation.paused = false;
        presentationControls.hidden = true;
        presentationControls.classList.remove("is-visible");
        figure.classList.remove("is-presenting", "is-controls-hidden");
        const saved = presentation.saved;
        presentation.saved = null;
        if (saved) {
            state.yaw = saved.yaw;
            state.elevation = saved.elevation;
            state.focused = null;
            state.hovered = null;
            zoom(saved.zoom);
            select(saved.selected);
        }
    }

    async function exitPresentation() {
        const ownsFullscreen = document.fullscreenElement === figure;
        stopPresentation();
        if (ownsFullscreen) {
            try {
                await document.exitFullscreen();
            } catch (error) {
                status.textContent = `Could not exit fullscreen: ${error.message}`;
                status.hidden = false;
            }
        }
    }

    async function startPresentation() {
        if (!document.fullscreenEnabled || typeof figure.requestFullscreen !== "function") {
            status.textContent = "Fullscreen presentation is not supported in this browser.";
            status.hidden = false;
            return;
        }
        presentation.saved = {
            yaw: state.yaw,
            elevation: state.elevation,
            selected: state.selected,
            zoom: state.zoom,
        };
        try {
            await figure.requestFullscreen();
        } catch (error) {
            presentation.saved = null;
            status.textContent = `Could not enter fullscreen: ${error.message}`;
            status.hidden = false;
            return;
        }
        status.hidden = true;
        state.yaw = initialYaw;
        state.elevation = initialElevation;
        zoom(1);
        presentation.active = true;
        presentationControls.hidden = false;
        figure.classList.add("is-presenting");
        replayPresentation();
        revealPresentationControls();
        viewport.focus({ preventScroll: true });
    }

    octants.forEach(octant => {
        const row = document.createElement("tr");
        row.className = "work-framework__row";
        row.dataset.octant = octant.id;
        row.style.setProperty("--octant-color", octant.color);
        row.style.setProperty("--octant-text", octant.textColor);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "work-framework__name-button";
        button.setAttribute("aria-label", octant.label);
        button.setAttribute("aria-pressed", "false");
        button.title = octant.meaning;
        [String(octant.id), octant.name].forEach((text, index) => {
            const span = document.createElement("span");
            span.textContent = text;
            span.className = index === 0 ? "work-framework__number" : "work-framework__name";
            button.append(span);
        });
        const nameCell = document.createElement("td");
        nameCell.append(button);
        row.append(nameCell);
        octant.levels.forEach(level => {
            const cell = document.createElement("td");
            cell.textContent = level;
            row.append(cell);
        });
        row.addEventListener("click", () => {
            button.focus({ preventScroll: true });
            select(octant.id);
        });
        row.addEventListener("pointerenter", () => hover(octant.id));
        row.addEventListener("pointermove", () => hover(octant.id));
        row.addEventListener("pointerleave", () => hover(null));
        button.addEventListener("focus", () => focusOctant(octant.id));
        button.addEventListener("blur", () => focusOctant(null));
        octant.button = button;
        octant.row = row;
        rows.append(row);
    });

    function zoom(value) {
        state.zoom = Math.round(clamp(value, 0.7, 1.3) * 100) / 100;
        zoomOutput.textContent = `${Math.round(state.zoom * 100)}%`;
        zoomOut.disabled = state.zoom <= 0.7;
        zoomIn.disabled = state.zoom >= 1.3;
        requestRender();
    }

    function reset() {
        state.yaw = initialYaw;
        state.elevation = initialElevation;
        hover(null);
        zoom(1);
    }

    zoomOut.addEventListener("click", () => zoom(state.zoom - 0.1));
    zoomIn.addEventListener("click", () => zoom(state.zoom + 0.1));
    clear.addEventListener("click", () => select(null));
    present.addEventListener("click", startPresentation);
    presentationToggle.addEventListener("click", togglePresentation);
    presentationExit.addEventListener("click", exitPresentation);
    figure.addEventListener("pointermove", revealPresentationControls);
    document.addEventListener("fullscreenchange", () => {
        if (presentation.active && document.fullscreenElement !== figure) {
            stopPresentation();
        }
    });
    document.addEventListener("keydown", event => {
        if (!presentation.active) {
            return;
        }
        if (event.key === " " || event.key === "Spacebar") {
            event.preventDefault();
            togglePresentation();
        } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            presentation.complete = false;
            presentation.paused = true;
            clearPresentationTimer();
            showPresentationOctant(presentation.index + (event.key === "ArrowRight" ? 1 : -1));
            revealPresentationControls();
        } else if (event.key === "Home") {
            event.preventDefault();
            replayPresentation();
        }
    });
    root.querySelector('[data-action="reset"]').addEventListener("click", reset);
    viewport.addEventListener("keydown", event => {
        if (presentation.active) {
            return;
        }
        const step = Math.PI / 18;
        switch (event.key) {
            case "ArrowLeft": state.yaw -= step; break;
            case "ArrowRight": state.yaw += step; break;
            case "ArrowUp": state.elevation += step; break;
            case "ArrowDown": state.elevation -= step; break;
            case "+": zoom(state.zoom + 0.1); break;
            case "-": zoom(state.zoom - 0.1); break;
            case "Home": reset(); break;
            default: return;
        }
        event.preventDefault();
        state.elevation = clamp(state.elevation, -Math.PI * 0.4, Math.PI * 0.4);
        requestRender();
    });

    function targetOctant(event) {
        const target = event.target instanceof Element ? event.target.closest("[data-octant]") : null;
        return target ? Number(target.dataset.octant) : null;
    }

    viewport.addEventListener("pointerdown", event => {
        if (presentation.active || event.button !== 0 || drag) {
            return;
        }
        viewport.focus({ preventScroll: true });
        drag = {
            pointerId: event.pointerId, x: event.clientX, y: event.clientY,
            yaw: state.yaw, elevation: state.elevation,
            octant: targetOctant(event), moved: false,
        };
        viewport.setPointerCapture(event.pointerId);
    });
    viewport.addEventListener("pointermove", event => {
        if (!drag) {
            hover(targetOctant(event));
        } else if (event.pointerId === drag.pointerId) {
            const dx = event.clientX - drag.x;
            const dy = event.clientY - drag.y;
            drag.moved ||= Math.hypot(dx, dy) > 5;
            if (drag.moved) {
                viewport.classList.add("is-dragging");
                state.yaw = drag.yaw + dx * 0.008;
                state.elevation = clamp(drag.elevation - dy * 0.008, -Math.PI * 0.4, Math.PI * 0.4);
                hover(null);
                requestRender();
            }
        }
    });
    viewport.addEventListener("pointerleave", () => {
        if (!drag) {
            hover(null);
        }
    });
    viewport.addEventListener("pointerup", event => {
        if (!drag || event.pointerId !== drag.pointerId) {
            return;
        }
        const clicked = !drag.moved ? drag.octant : null;
        drag = null;
        viewport.classList.remove("is-dragging");
        viewport.releasePointerCapture(event.pointerId);
        if (clicked !== null) {
            select(clicked);
        }
    });
    viewport.addEventListener("lostpointercapture", () => {
        drag = null;
        viewport.classList.remove("is-dragging");
    });

    new ResizeObserver(requestRender).observe(viewport);
    if (!document.fullscreenEnabled || typeof figure.requestFullscreen !== "function") {
        present.disabled = true;
        present.title = "Fullscreen presentation is not supported in this browser.";
    }
    status.hidden = true;
    requestRender();
})();
