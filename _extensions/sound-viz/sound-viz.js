class Ripple {
    constructor(element) {
        this.element = element;

        // Physical-ish parameters
        this.amplitude = parseFloat(
            element.dataset.amplitude ?? "0.80"
        );
        this.frequency = parseFloat(
            element.dataset.frequency ?? "1.0"
        );
        this.speed = parseFloat(
            element.dataset.speed ?? "80"
        );
        this.maxRadius = 180;
        this.waves = [];
        this.lastTime = performance.now();
        this.lastEmission = this.lastTime;

        this.createSVG();
        this.createControls();

        requestAnimationFrame(
            (time) => this.tick(time)
        );
    }

    createSVG() {
        const NS = "http://www.w3.org/2000/svg";
        this.svg = document.createElementNS(NS, "svg");

        this.svg.setAttribute(
            "viewBox",
            "0 0 400 400"
        );
        this.svg.setAttribute(
            "preserveAspectRatio",
            "xMidYMid meet"
        );
        this.element.appendChild(this.svg);
        // Source
        this.source = document.createElementNS(
            NS, "circle"
        );
        this.source.setAttribute(
            "cx", 200
        );
        this.source.setAttribute(
            "cy", 200
        );
        this.source.setAttribute(
            "r", 6
        );
        this.source.classList.add(
            "ripple-source"
        );
        this.svg.appendChild(
            this.source
        );
    }

    createControls() {
        this.controls = document.createElement("div");
        this.controls.className = "ripple-controls";
        this.controls.innerHTML = `
            <label>
                Amplitude
                <input
                    class="ripple-amplitude"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value="${this.amplitude}">
                <output>
                    ${this.amplitude.toFixed(2)}
                </output>
            </label>

            <label>
                Frequency
                <input
                    class="ripple-frequency"
                    type="range"
                    min="0.5"
                    max="6"
                    step="0.1"
                    value="${this.frequency}">
                <output>
                    ${this.frequency.toFixed(1)}
                </output>
            </label>

            <label>
                Speed
                <input
                    class="ripple-speed"
                    type="range"
                    min="30"
                    max="180"
                    step="5"
                    value="${this.speed}">
                <output>
                    ${this.speed}
                </output>
            </label>
        `;
        this.element.appendChild(
            this.controls
        );
        this.amplitudeInput = this.controls.querySelector(
            ".ripple-amplitude"
        );
        this.frequencyInput = this.controls.querySelector(
            ".ripple-frequency"
        );
        this.speedInput = this.controls.querySelector(
            ".ripple-speed"
        );
        this.amplitudeInput.addEventListener("input", () => {
            this.amplitude = parseFloat(
                this.amplitudeInput.value
            );
            this.amplitudeInput
                .nextElementSibling
                .value = this.amplitude.toFixed(2);
            }
        );
        this.frequencyInput.addEventListener("input", () => {
            this.frequency = parseFloat(
                this.frequencyInput.value
            );
            this.frequencyInput
                .nextElementSibling
                .value = this.frequency.toFixed(1);
            }
        );
        this.speedInput.addEventListener("input", () => {
            this.speed = parseFloat(
                this.speedInput.value
            );
            this.speedInput
                .nextElementSibling
                .value = this.speed;
            }
        );
        this.info = document.createElement("div");
        this.info.className = "ripple-info";
        this.element.appendChild(this.info);
    }

    emit(time) {
        const NS = "http://www.w3.org/2000/svg";
        /*
         * Every half-period we create
         * another pressure region.
         *
         * Alternating signs give us:
         *
         *   compression
         *   rarefaction
         *   compression
         *   ...
         */
        const period = 1000 / this.frequency;
        const index = Math.floor(time / (period / 2));
        const circle = document.createElementNS(NS, "circle");
        circle.setAttribute("cx", 200);
        circle.setAttribute("cy", 200);
        circle.setAttribute("r", 0);
        circle.classList.add(
            index % 2 === 0
                ? "ripple-compression"
                : "ripple-rarefaction"
        );
        this.svg.appendChild(circle);
        this.waves.push({
            element: circle,
            birth: time,
            sign: index % 2 === 0 ? 1 : -1
        });
    }

    update(time) {
        const halfPeriod = 500 / this.frequency;
        /*
         * Emit alternating pressure
         * regions every half-period.
         */
        if (time - this.lastEmission >= halfPeriod) {
            this.emit(time);
            this.lastEmission = time;
        }
        for (let i = this.waves.length - 1; i >= 0; i--) {
            const wave = this.waves[i];
            const age = (time - wave.birth) / 1000;
            const radius = age * this.speed;
            const normalized = radius / this.maxRadius;
            if (normalized >= 1) {
                wave.element.remove();
                this.waves.splice(i, 1);
                continue;
            }
            wave.element.setAttribute("r", radius);
            /*
             * Amplitude determines
             * the strength of the
             * pressure variation.
             */
            const opacity = this.amplitude * (1 - normalized);
            wave.element.setAttribute(
                "opacity", opacity
            );
        }
        const wavelength = this.speed / this.frequency;
        this.info.innerHTML = `
            <span>c = ${this.speed.toFixed(0)}</span>
            <span>f = ${this.frequency.toFixed(1)}</span>
            <span>λ = ${wavelength.toFixed(1)}</span>
        `;
    }

    tick(time) {
        this.update(time);
        requestAnimationFrame((t) => this.tick(t));
    }
}

class Particles {
    constructor(element) {
        this.element = element;
        this.amplitude = parseFloat(
            element.dataset.amplitude ?? "15"
        );
        this.frequency = parseFloat(
            element.dataset.frequency ?? "1"
        );
        this.speed = parseFloat(
            element.dataset.speed ?? "80"
        );
        this.spacing = 25;
        this.rows = 8;
        this.cols = 10;
        this.width = 400;
        this.height = 300;
        this.particles = [];
        this.simulationTime = 0;
        this.lastTime = performance.now();
        this.running = true;

        this.createSVG();
        this.createControls();
        requestAnimationFrame(time => this.tick(time));
    }

    createSVG() {
        const NS = "http://www.w3.org/2000/svg";
        this.svg = document.createElementNS(NS, "svg");
        this.svg.setAttribute(
            "viewBox", "0 0 400 300"
        );
        this.element.appendChild(
            this.svg
        );
        /*
         * Create the particles.
         */
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const particle = document.createElementNS(
                    NS, "circle"
                );
                particle.setAttribute("r", 3);
                particle.classList.add("particle");
                this.svg.appendChild(particle);
                this.particles.push({
                    element: particle,
                    x, y
                });
            }
        }
    }

    createControls() {
        this.controls = document.createElement("div");
        this.controls.className = "particles-controls";
        this.controls.innerHTML = `
            <button class="particles-play">
                Pause
            </button>

            <button class="particles-step">
                Step
            </button>

            <label>
                Amplitude
                <input
                    type="range"
                    min="0"
                    max="25"
                    step="1"
                    value="${this.amplitude}">
                <output>
                    ${this.amplitude}
                </output>
            </label>

            <label>
                Frequency
                <input
                    type="range"
                    min="0.2"
                    max="4"
                    step="0.1"
                    value="${this.frequency}">
                <output>
                    ${this.frequency.toFixed(1)}
                </output>
            </label>

            <label>
                Speed
                <input
                    type="range"
                    min="20"
                    max="160"
                    step="5"
                    value="${this.speed}">
                <output>
                    ${this.speed}
                </output>
            </label>

        `;
        this.element.appendChild(this.controls);
        const inputs = this.controls.querySelectorAll("input");

        this.amplitudeInput = inputs[0];
        this.frequencyInput = inputs[1];
        this.speedInput = inputs[2];

        this.amplitudeInput.addEventListener("input", () => {
            this.amplitude = parseFloat(
                this.amplitudeInput.value
            );
            this.amplitudeInput
                .nextElementSibling
                .value = this.amplitude;
            }
        );
        this.frequencyInput.addEventListener("input", () => {
            this.frequency = parseFloat(
                this.frequencyInput.value
            );
            this.frequencyInput
                .nextElementSibling
                .value = this.frequency.toFixed(1);
            }
        );
        this.speedInput.addEventListener("input", () => {
            this.speed = parseFloat(
                this.speedInput.value
            );
            this.speedInput
                .nextElementSibling
                .value = this.speed;
            }
        );
        this.playButton = this.controls.querySelector(
            ".particles-play"
        );
        this.stepButton = this.controls.querySelector(
            ".particles-step"
        );
        this.running = true;
        this.playButton.addEventListener("click", () => {
            this.running = !this.running;
            this.playButton.textContent = this.running
                ? "Pause"
                : "Play";
            if (this.running) {
                this.lastTime = performance.now();
                requestAnimationFrame(
                    time => this.tick(time)
                );
            }
        });
        this.stepButton.addEventListener("click", () => {
            if (this.running) {
                return;
            }
            const step = 1000 / 30;
            this.simulationTime += step;
            this.update(this.simulationTime);
        });
    }

    update(time) {
        /*
         * Time in seconds.
         */
        const t = time / 1000;
        /*
         * Angular frequency:
         *
         *     ω = 2πf
         */
        const omega = 2 * Math.PI * this.frequency;
        /*
         * Wavenumber:
         *
         *     k = ω / c
         *
         * which is equivalent to:
         *
         *     k = 2π / λ
         */
        const k = omega / this.speed;
        for (const particle of this.particles) {
            const baseX = 100 + particle.x * this.spacing;
            const baseY = 50 + particle.y * this.spacing;
            /*
             * Longitudinal displacement:
             *
             * x(t) = A sin(ωt - kx)
             */
            const displacement = this.amplitude * Math.sin(
                omega * t - k * baseX
            );
            particle.element.setAttribute(
                "cx", baseX + displacement
            );
            particle.element.setAttribute(
                "cy", baseY
            );
        }
    }

    tick(time) {
        if (!this.running) {
            return;
        }
        const dt = time - this.lastTime;
        this.lastTime = time;
        this.simulationTime += dt;
        this.update(this.simulationTime);
        requestAnimationFrame(
            t => this.tick(t)
        );
    }
}

const waveformInstances = new Map();

function getWaveformInstance(placeholder) {
    const id = placeholder.dataset.waveformId;
    if (!waveformInstances.has(id)) {
        const waveform = new Waveform(placeholder);
        waveformInstances.set(id, waveform);
    }
    return waveformInstances.get(id);
}

function updatePersistentWaveforms(slide) {
    console.log("[sound-viz] updating waveforms", slide);
    for (const waveform of waveformInstances.values()) {
        waveform.visible = false;
    }
    const placeholders = slide.querySelectorAll(
        ".waveform-placeholder"
    );
    for (const placeholder of placeholders) {
        const waveform = getWaveformInstance(placeholder);
        waveform.visible = true;
        placeholder.replaceChildren(waveform.element);
    }
}

class Waveform {
    constructor(placeholder) {
        this.placeholder = placeholder;
        this.element = document.createElement("div");
        this.element.className = "waveform-widget";
        this.amplitude = parseFloat(
            placeholder.dataset.amplitude ?? "25"
        );
        this.frequency = parseFloat(
            placeholder.dataset.frequency ?? "1.0"
        );
        this.waveform = placeholder.dataset.waveform ?? "sine";
        this.sampleRate = parseFloat(
            placeholder.dataset.srate ?? "5.0"  
        );
        this.visible = true;
        this.running = true;
        this.simulationTime = 0;
        this.lastTime = performance.now();

        this.createSVG();
        this.createControls();
        this.draw();

        requestAnimationFrame(
            time => this.tick(time)
        );
    }

    createSVG() {
        const NS = "http://www.w3.org/2000/svg";
        this.svg = document.createElementNS(NS, "svg");
        this.svg.setAttribute(
            "viewBox", "0 0 400 300"
        );
        this.element.appendChild(this.svg);

        /*
         * Grid / reference lines.
         */
        for (const y of [50, 150, 250]) {
            const line = document.createElementNS(NS, "line");
            line.setAttribute("x1", 10);
            line.setAttribute("x2", 390);
            line.setAttribute("y1", y);
            line.setAttribute("y2", y);
            line.classList.add(
                y === 150
                    ? "waveform-zero"
                    : "waveform-grid"
            );
            this.svg.appendChild(line);
        }

        // Time axis:
        this.timeAxis = document.createElementNS(NS, "g");
        this.timeAxis.classList.add("waveform-time-axis");
        this.svg.appendChild(this.timeAxis);

        // Quantization levels grid (behind the waveform):
        this.levelGrid = document.createElementNS(NS, "g");
        this.levelGrid.classList.add("waveform-level-grid");
        this.svg.appendChild(this.levelGrid);

        // Continuous waveform.
        this.path = document.createElementNS(NS, "path");
        this.path.classList.add("waveform-line");
        this.svg.appendChild(this.path);

        // Interpolation line:
        this.interpolationPath = document.createElementNS(NS, "path");
        this.interpolationPath.classList.add("waveform-interpolation");
        this.svg.appendChild(this.interpolationPath);

        // Sample-and-hold (zero-order hold) line:
        this.holdPath = document.createElementNS(NS, "path");
        this.holdPath.classList.add("waveform-hold");
        this.svg.appendChild(this.holdPath);

        // Sample points.
        this.sampleGroup = document.createElementNS(NS, "g");
        this.sampleGroup.classList.add("waveform-samples");
        this.svg.appendChild(this.sampleGroup);

        // Quantization:
        this.quantizationGroup = document.createElementNS(NS, "g");
        this.quantizationGroup.classList.add("waveform-quantization");
        this.svg.appendChild(this.quantizationGroup);

        // Voltage labels.
        this.labels = document.createElementNS(NS, "g");
        this.labels.classList.add("waveform-labels");
        this.svg.appendChild(this.labels);

        this.addLabel(385, 48, "+1 V");
        this.addLabel(385, 153, "0 V");
        this.addLabel(385, 258, "-1 V");
        this.createTimeAxis();

    }

    createTimeAxis() {
        const NS = "http://www.w3.org/2000/svg";

        // Vertical line at 1 second:
        const middle = document.createElementNS(NS, "line");
        middle.setAttribute("x1", 200);
        middle.setAttribute("x2", 200);
        middle.setAttribute("y1", 15);
        middle.setAttribute("y2", 275);

        middle.classList.add("waveform-time-marker");
        this.timeAxis.appendChild(middle);

        // Labels.
        const labels = [
            [10, "0 s"],
            [200, "1 s"],
            [390, "2 s"]
        ];
        for (const [x, text] of labels) {
            const label = document.createElementNS(
                NS, "text"
            );
            label.setAttribute("x", x);
            label.setAttribute("y", 292);
            label.setAttribute("text-anchor",
                x === 10
                    ? "start"
                    : x === 390
                        ? "end"
                        : "middle"
            );
            label.textContent = text;
            this.timeAxis.appendChild(label);
        }
    }

    addLabel(x, y, text) {
        const NS = "http://www.w3.org/2000/svg";
        const label = document.createElementNS(NS, "text");

        label.setAttribute("x", x);
        label.setAttribute("y", y);
        label.setAttribute("text-anchor", "end");
        label.textContent = text;
        this.labels.appendChild(label);
    }

    /*
     * Amplitude slider value mapping to full scale (±1 V).
     */
    static FULL_SCALE = 50;

    /*
     * Signal level relative to full scale,
     * taking the amplitude factor into account.
     */
    level(value) {
        return value * this.amplitude / Waveform.FULL_SCALE;
    }

    /*
     * Quantizes a level in [-1, 1] to the given format
     * ("8", "16", "24" for signed integers, "32f" for float32).
     * Returns the stored value and the level it decodes back to.
     */
    quantize(level, format) {
        if (format === "32f") {
            const qlevel = Math.fround(level);
            const view = new DataView(new ArrayBuffer(4));
            view.setFloat32(0, qlevel);
            const hex = view.getUint32(0)
                .toString(16)
                .toUpperCase()
                .padStart(8, "0");
            return { float: true, qlevel, hex };
        }
        const bits = parseInt(format, 10);
        const max = Math.pow(2, bits - 1) - 1;
        // Clip to the representable integer range:
        const code = Math.max(
            -max - 1,
            Math.min(max, Math.round(level * max))
        );
        return {
            float: false,
            bits,
            code,
            min: -max - 1,
            max,
            qlevel: code / max,
            // Error expressed in LSB (quantization steps):
            lsbError: code - level * max
        };
    }

    showSampleInfo(point) {
        this.hideSampleInfo();
        const NS = "http://www.w3.org/2000/svg";
        const group = document.createElementNS(NS, "g");
        group.classList.add("waveform-sample-info");
        const q = point.quantized;
        const lines = [
            `t: ${point.time.toFixed(3)}s`,
            `x: ${point.level.toFixed(4)} V`
        ];
        if (q && q.float) {
            lines.push(`float32: ${q.qlevel.toPrecision(9)}`);
            lines.push(`bits: 0x${q.hex}`);
        } else if (q) {
            lines.push(`int${q.bits}: ${q.code}`);
            lines.push(`range: ${q.min} … ${q.max}`);
            const sign = q.lsbError >= 0 ? "+" : "";
            lines.push(`error: ${sign}${q.lsbError.toFixed(2)} LSB`);
        }
        const boxWidth = 165;
        const boxHeight = 10 + lines.length * 14;
        let boxX = point.x + 8;
        let boxY = point.y - boxHeight - 8;
        if (boxX + boxWidth > 395) {
            boxX = point.x - boxWidth - 8;
        }
        if (boxY < 5) {
            boxY = point.y + 8;
        }
        const box = document.createElementNS(NS, "rect");
        box.setAttribute("x", boxX);
        box.setAttribute("y", boxY);
        box.setAttribute("width", boxWidth);
        box.setAttribute("height", boxHeight);
        box.setAttribute("rx", 4);
        box.classList.add("waveform-sample-info-box");
        group.appendChild(box);

        lines.forEach((text, index) => {
            const textElement = document.createElementNS(NS, "text");
            textElement.classList.add("waveform-sample-info-text");
            textElement.setAttribute("x", boxX + 6);
            textElement.setAttribute("y", boxY + 15 + index * 14);
            textElement.textContent = text;
            group.appendChild(textElement);
        });
        this.svg.appendChild(group);
        this.sampleInfo = group;
    }

    hideSampleInfo() {
        if (this.sampleInfo) {
            this.sampleInfo.remove();
            this.sampleInfo = null;
        }
    }

    createControls() {
        this.controls = document.createElement("div");
        this.controls.className = "waveform-controls";
        this.controls.innerHTML = `
            <div class="waveform-buttons">
                <button class="waveform-play">
                    Pause
                </button>

                <button class="waveform-step">
                    Step
                </button>
            </div>

            <label>
                Amplitude
                <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value="${this.amplitude}">
                <output>
                    ${this.amplitude}
                </output>
            </label>

            <label>
                Frequency
                <input
                    type="range"
                    class="waveform-frequency"
                    min="0.5"
                    max="12"
                    step="0.5"
                    value="${this.frequency}">
                <output>
                    ${this.frequency} Hz
                </output>
            </label>

            <label>
                Sample rate
                <input
                    type="range"
                    class="waveform-sample-rate"
                    min="5"
                    max="50"
                    step="1"
                    value="${this.sampleRate}">
                <output>
                    ${this.sampleRate} Hz
                </output>
            </label>

            <label>
                Waveform
                <select class="waveform-select">
                    <option value="sine">Sine</option>
                    <option value="triangle">Triangle</option>
                    <option value="square">Square</option>
                    <option value="saw">Saw</option>
                    <option value="noise">Noise</option>
                </select>
            </label>

            <label>
                Bit Depth
                <select class="waveform-bit-depth">
                    <option value="2">2 bits</option>
                    <option value="3">3 bits</option>
                    <option value="4">4 bits</option>
                    <option value="8">8 bits</option>
                    <option value="16" selected>16 bits</option>
                    <option value="24">24 bits</option>
                    <option value="32f">32 bits (float)</option>
                </select>
            </label>

            <label class="waveform-samples-toggle">
                <input
                    type="checkbox"
                    class="waveform-show-samples">
                Show samples
            </label>

            <label class="waveform-interpolation-toggle">
                <input
                    type="checkbox"
                    class="waveform-show-interpolation">
                Linear interpolation
            </label>

            <label class="waveform-hold-toggle">
                <input
                    type="checkbox"
                    class="waveform-show-hold">
                Sample & hold
            </label>

            <label class="waveform-quantization-toggle">
                <input
                    type="checkbox"
                    class="waveform-show-quantization">
                Quantization
            </label>
        `;

        this.element.appendChild(this.controls);

        this.playButton = this.controls.querySelector(
            ".waveform-play"
        );
        this.stepButton = this.controls.querySelector(
            ".waveform-step"
        );
        this.amplitudeInput = this.controls.querySelector(
            "input"
        );
        this.frequencyInput = this.controls.querySelector(
            ".waveform-frequency"
        );
        this.sampleRateInput = this.controls.querySelector(
            ".waveform-sample-rate"
        );
        this.waveformSelect = this.controls.querySelector(
            ".waveform-select"
        );
        this.showSamples = this.controls.querySelector(
            ".waveform-show-samples"
        );
        this.showInterpolation = this.controls.querySelector(
            ".waveform-show-interpolation"
        );
        this.showHold = this.controls.querySelector(
            ".waveform-show-hold"
        );
        this.showQuantization = this.controls.querySelector(
            ".waveform-show-quantization"
        );
        this.bitDepthSelect = this.controls.querySelector(
            ".waveform-bit-depth"
        );
        this.waveformSelect.value = this.waveform;

        this.playButton.addEventListener("click", () => {
                this.running = !this.running;
                this.playButton.textContent = this.running
                    ? "Pause"
                    : "Play";
                this.lastTime = performance.now();
            }
        );
        this.stepButton.addEventListener("click", () => {
            if (this.running) {
                return;
            }
            this.simulationTime += 1 / this.sampleRate;
            this.draw();
        });
        this.amplitudeInput.addEventListener("input", () => {
            this.amplitude = parseFloat(
                this.amplitudeInput.value
            );
            this.amplitudeInput
                .nextElementSibling
                .value = this.amplitude;
                this.draw();
            }
        );
        this.frequencyInput.addEventListener("input", () => {
            this.frequency = parseFloat(
                this.frequencyInput.value
            );
            this.frequencyInput
                .nextElementSibling
                .value = `${this.frequency} Hz`;
                this.draw();
            }
        );
        this.sampleRateInput.addEventListener("input", () => {
            this.sampleRate = parseFloat(
                this.sampleRateInput.value
            );
            this.sampleRateInput
                .nextElementSibling
                .value = `${this.sampleRate} Hz`;
                this.draw();
            }
        );
        this.waveformSelect.addEventListener("change", () => {
            this.waveform = this.waveformSelect.value;
            this.draw();
        });
        this.showSamples.addEventListener("change", () => this.draw());
        this.showInterpolation.addEventListener(
            "change", () => this.draw()
        );
        this.showHold.addEventListener("change", () => this.draw());
        this.showQuantization.addEventListener("change", () => {
            this.draw();
        });
        this.bitDepthSelect.addEventListener("change", () => {
            this.draw();
        });
    }

    /*
     * Normalized waveform.
     *
     * phase is in [0, 1).
     */
    sample(phase) {
        switch (this.waveform) {
            case "sine":
                return Math.sin(
                    phase * Math.PI * 2
                );

            case "triangle": {
                const t = phase <= 0.5 ? phase : 1 - phase;
                return (t - 0.25) * 4;
            }

            case "square":
                return phase < 0.5 ? -1 : 1;

            case "saw":
                return phase * 2 - 1;

            case "noise":
                return Math.random() * 2 - 1;

            default:
                return 0;
        }
    }

    /*
     * Continuous-time signal.
     *
     * t is measured in seconds.
     */
    continuousSignal(t) {
        const phase = (this.frequency * t) % 1;
        return this.sample(phase);
    }

    /*
     * Horizontal lines at each level the selected format can store,
     * or a note when they are too close together to be told apart.
     */
    drawLevelGrid() {
        const NS = "http://www.w3.org/2000/svg";
        this.levelGrid.replaceChildren();
        if (!this.showQuantization.checked) {
            return;
        }
        const format = this.bitDepthSelect.value;
        // Minimum spacing between two levels, in pixels:
        const minSpacing = 4;
        let note = null;

        if (format === "32f") {
            note = "float32: levels too fine to display";
        } else {
            const bits = parseInt(format, 10);
            const max = Math.pow(2, bits - 1) - 1;
            const spacing = 100 / max;
            if (spacing < minSpacing) {
                note = `${bits}-bit: ${Math.pow(2, bits)} levels ` +
                       `(too fine to display)`;
            } else {
                // Only levels within full scale (±1 V):
                for (let code = -max; code <= max; code++) {
                    const y = 150 - code / max * 100;
                    const line = document.createElementNS(NS, "line");
                    line.setAttribute("x1", 10);
                    line.setAttribute("x2", 390);
                    line.setAttribute("y1", y);
                    line.setAttribute("y2", y);
                    line.classList.add("waveform-level");
                    this.levelGrid.appendChild(line);
                }
            }
        }
        if (note) {
            const text = document.createElementNS(NS, "text");
            text.setAttribute("x", 14);
            text.setAttribute("y", 30);
            text.classList.add("waveform-level-note");
            text.textContent = note;
            this.levelGrid.appendChild(text);
        }
    }

    /*
     * Draw the continuous-looking signal.
     */
    draw() {
        const points = [];
        /*
         * High visual resolution.
         *
         * This is NOT the sample rate.
         * It is simply the resolution used
         * to draw the curve.
         */
        const resolution = 400;
        /*
         * Show 2 seconds of signal.
         */
        const duration = 2;

        for (let i = 0; i < resolution; i++) {
            const x = 10 + i * (380 / (resolution - 1));
            const t = this.simulationTime
                    - duration
                    + (i / (resolution - 1))
                    * duration;

            const value = this.continuousSignal(t);
            const y = 150 - value * this.amplitude * 2;
            points.push(`${x},${y}`);
        }
        this.path.setAttribute("d", "M " + points.join(" L "));
        this.drawLevelGrid();
        /*
         * Draw discrete samples.
         */
        this.sampleGroup.replaceChildren();
        this.holdPath.setAttribute("d", "");

        if (this.showSamples.checked) {
            const samples = [];
            const NS = "http://www.w3.org/2000/svg";

            /*
            * Actual sampling interval:
            *
            *       1
            * Ts = -----
            *       Fs
            */
            const samplePeriod = 1 / this.sampleRate;
            /*
            * Find the sample instants that fall
            * inside the visible 2-second window.
            */
            const startTime = this.simulationTime - duration;
            const endTime = this.simulationTime;

            const firstSample = Math.ceil(
                    startTime / samplePeriod
                ) * samplePeriod;

            for (let t = firstSample; t <= endTime; t += samplePeriod) {
                /*
                * Position within the visible
                * time window.
                */
                const position = (t - startTime) / duration;
                if (position < 0 || position > 1) {
                    continue;
                }
                const value = this.continuousSignal(t);
                const x = 10 + position * 380;
                const y = 150 - value * this.amplitude * 2;
                samples.push({
                    time: t,
                    value: value,
                    x: x,
                    y: y
                });
                const circle = document.createElementNS(NS, "circle");
                circle.setAttribute("cx", x);
                circle.setAttribute("cy", y);
                circle.setAttribute("r", 4);
                circle.classList.add("waveform-sample");
                this.sampleGroup.appendChild(circle);
            }
            // Linear interpolation between samples:
            this.interpolationPath.setAttribute("d", "");
            if (this.showInterpolation.checked && samples.length > 1) {
                const ipoints = samples.map(
                    point => `${point.x},${point.y}`
                );
                this.interpolationPath.setAttribute(
                    "d", "M " + ipoints.join(" L ")
                );
            }
            this.quantizationGroup.replaceChildren();
            if (this.showQuantization.checked) {
                const format = this.bitDepthSelect.value;
                for (const point of samples) {
                     const level = this.level(point.value);
                     const quantized = this.quantize(level, format);
                     const qy = 150 - quantized.qlevel * 100;
                     point.qy = qy;
                     // Error line:
                     const eline = document.createElementNS(NS, "line");
                     eline.setAttribute("x1", point.x);
                     eline.setAttribute("y1", point.y);
                     eline.setAttribute("x2", point.x);
                     eline.setAttribute("y2", qy);
                     eline.classList.add("waveform-quantization-error");
                     this.quantizationGroup.appendChild(eline);
                     const circle = document.createElementNS(NS, "circle");
                     circle.setAttribute("cx", point.x);
                     circle.setAttribute("cy", qy);
                     circle.setAttribute("r", 4);
                     circle.classList.add("waveform-quantized-sample");
                     circle.addEventListener("mouseenter", () => {
                         circle.classList.add("waveform-sample-active");
                         this.showSampleInfo({
                             ...point,
                             level,
                             quantized,
                             qy
                         });
                     });
                     circle.addEventListener("mouseleave", () => {
                         circle.classList.remove("waveform-sample-active");
                         this.hideSampleInfo();
                     });
                     this.quantizationGroup.appendChild(circle);
                }
            }
            /*
             * Sample-and-hold: each (quantized, if enabled) value
             * is held until the next sample instant.
             */
            if (this.showHold.checked && samples.length > 0) {
                const step = 380 * samplePeriod / duration;
                const hpoints = [];
                for (const point of samples) {
                    const y = point.qy ?? point.y;
                    const x2 = Math.min(390, point.x + step);
                    hpoints.push(`${point.x},${y}`, `${x2},${y}`);
                }
                this.holdPath.setAttribute(
                    "d", "M " + hpoints.join(" L ")
                );
            }
        }
    }

    tick(time) {
        const dt = (time - this.lastTime) / 1000;
        this.lastTime = time;

        if (this.running && this.visible) {
            this.simulationTime += dt;
            this.draw();
        }
        requestAnimationFrame(
            t => this.tick(t)
        );
    }
}

function initPersistentWaveforms() {
    console.log("[sound-viz] initPersistentWaveforms");

    if (!window.Reveal) {
        console.error("[sound-viz] Reveal not available");
        return;
    }
    console.log("[sound-viz] registering Reveal handlers");

    Reveal.on("ready", event => {
        console.log("[sound-viz] Reveal ready");
        updatePersistentWaveforms(event.currentSlide);
    });

    Reveal.on("slidechanged", event => {
        console.log("[sound-viz] slidechanged");
        updatePersistentWaveforms(event.currentSlide);
    });
}

// ----------------------------------------------------------------------------
// Harmonics
// ----------------------------------------------------------------------------

const harmonicsInstances = new Map();

function getHarmonicsInstance(placeholder) {
    const id = placeholder.dataset.harmonicsId;

    if (!harmonicsInstances.has(id)) {
        const harmonics = new Harmonics(placeholder);
        harmonicsInstances.set(id, harmonics);
    }
    return harmonicsInstances.get(id);
}

function updatePersistentHarmonics(slide) {
    for (const harmonics of harmonicsInstances.values()) {
        harmonics.element.remove();
    }
    const placeholders = slide.querySelectorAll(".harmonics-placeholder");
    for (const placeholder of placeholders) {
        const harmonics = getHarmonicsInstance(placeholder);
        placeholder.replaceChildren(harmonics.element);
    }
}

class Harmonics {
    constructor(placeholder) {
        this.placeholder = placeholder;
        this.element = document.createElement("div");
        this.element.className = "harmonics-widget";
        this.waveform = placeholder.dataset.waveform ?? "sawtooth";
        this.numHarmonics = parseInt(placeholder.dataset.harmonics ?? "1", 10);

        this.width = 700;
        this.height = 500;
        this.margin = {
            left: 45,
            right: 20,
            top: 20,
            bottom: 40
        };
        this.createUI();
        this.draw();
    }

    createUI() {
        this.svg = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
        );
        this.svg.setAttribute("viewBox",
            `0 0 ${this.width} ${this.height}`
        );

        this.svg.setAttribute("class", "harmonics-svg");
        this.element.appendChild(this.svg);

        this.controls = document.createElement("div");
        this.controls.className = "harmonics-controls";

        const label = document.createElement("label");
        label.className = "harmonics-slider-row";

        const text = document.createElement("span");
        text.textContent = "Harmonics";

        this.slider = document.createElement("input");
        this.slider.type = "range";
        this.slider.min = "1";
        this.slider.max = "25";
        this.slider.step = "1";
        this.slider.value = this.numHarmonics;

        this.output = document.createElement("output");
        this.output.value = this.numHarmonics;

        this.slider.addEventListener("input", () => {
            this.numHarmonics = parseInt(this.slider.value, 10);
            this.output.value = this.numHarmonics;
            this.draw();
            }
        );

        label.appendChild(text);
        label.appendChild(this.slider);
        label.appendChild(this.output);

        this.controls.appendChild(label);

        const waveformLabel = document.createElement("label");
       waveformLabel.className = "harmonics-select-row";

        const waveformText = document.createElement("span");
        waveformText.textContent = "Waveform";

        this.waveformSelect = document.createElement("select");

        const saw = document.createElement("option");
        saw.value = "sawtooth";
        saw.textContent = "Sawtooth";

        const triangle = document.createElement("option");
        triangle.value = "triangle";
        triangle.textContent = "Triangle";

        this.waveformSelect.appendChild(saw);
        this.waveformSelect.appendChild(triangle);

        this.waveformSelect.value = this.waveform;

        this.waveformSelect.addEventListener("change", () => {
            this.waveform = this.waveformSelect.value;
            this.draw();
        });

        waveformLabel.appendChild(waveformText);
        waveformLabel.appendChild(this.waveformSelect);
        this.controls.appendChild(waveformLabel);

        const componentsLabel = document.createElement("label");
        componentsLabel.className = "harmonics-checkbox-row";

        this.componentsCheckbox = document.createElement("input");
        this.componentsCheckbox.type = "checkbox";

        const componentsText = document.createElement("span");
        componentsText.textContent = "Show components";

        this.componentsCheckbox.addEventListener("change", () => this.draw());

        componentsLabel.appendChild(this.componentsCheckbox);
        componentsLabel.appendChild(componentsText);
        this.controls.appendChild(componentsLabel);
        this.element.appendChild(this.controls);
    }

    createSVGElement(name) {
        return document.createElementNS("http://www.w3.org/2000/svg", name);
    }

    clearSVG() {
        while (this.svg.firstChild) {
            this.svg.removeChild(this.svg.firstChild);
        }
    }

    harmonicAmplitude(n) {
        if (this.waveform === "sawtooth") {
            return 1 / n;
        }
        // Triangle:
        // odd harmonics only,
        // amplitude falls as 1/n²
        if (n % 2 === 0) {
            return 0;
        }

        return 1 / (n * n);
    }

    harmonicPhase(n) {
        if (this.waveform === "sawtooth") {
            return 0;
        }
        // Triangle alternating phase/sign.
        return n % 4 === 1 ? 0 : Math.PI;
    }

    componentValue(t, n) {
        const amplitude = this.harmonicAmplitude(n);

        if (amplitude === 0) {
            return 0;
        }

        return amplitude * Math.sin(
            2 * Math.PI * n * t + this.harmonicPhase(n)
        );
    }

    signalValue(t) {
        let value = 0;
        for (let n = 1; n <= this.numHarmonics; n++) {
            value += this.componentValue(t, n);
        }
        // Normalize so that increasing N
        // doesn't simply increase the scale.
        let normalization = 0;

        for (let n = 1; n <= this.numHarmonics; n++) {
            normalization += this.harmonicAmplitude(n);
        }
        if (normalization === 0) {
            return 0;
        }
        return value / normalization;
    }

    x(t) {
        return this.margin.left + t * (
            this.width -
            this.margin.left -
            this.margin.right
        );
    }

    y(value) {
        const center = this.margin.top + (
            this.height -
            this.margin.top -
            this.margin.bottom
        ) / 2;

        const scale = (
            this.height -
            this.margin.top -
            this.margin.bottom
        ) * 0.4;

        return center -
            value * scale;
    }

    createPath(values) {
        const path = this.createSVGElement("path");
        let d = "";

        values.forEach((value, i) => {
            const t = i / (values.length - 1);
            const x = this.x(t);
            const y = this.y(value);

            d += i === 0
              ? `M ${x} ${y}`
              : ` L ${x} ${y}`;
        });
        path.setAttribute("d", d);
        return path;
    }

    drawGrid() {
        const group = this.createSVGElement("g");
        group.setAttribute("class", "harmonics-grid");

        const centerY = this.y(0);
        const line = this.createSVGElement("line");
        line.setAttribute("x1", this.margin.left);
        line.setAttribute("x2", this.width - this.margin.right);
        line.setAttribute("y1", centerY);
        line.setAttribute("y2", centerY);
        group.appendChild(line);
        this.svg.appendChild(group);
    }

    drawComponents() {
        if (!this.componentsCheckbox.checked) {
            return;
        }
        const group = this.createSVGElement("g");
        group.setAttribute("class", "harmonics-components");

        const points = 500;
        for (let n = 1; n <= this.numHarmonics; n++) {
            const values = [];
            for (let i = 0; i < points; i++) {
                const t = i / (points - 1);
                values.push(this.componentValue(t, n));
            }
            const path = this.createPath(values);
            path.setAttribute("class",
                n === this.numHarmonics
                    ? "harmonics-component-last"
                    : "harmonics-component"
            );
            group.appendChild(path);
        }
        this.svg.appendChild(group);
    }

    drawResult() {
        const values = [];
        const points = 500;

        for (let i = 0; i < points; i++) {
            const t = i / (points - 1);
            values.push(this.signalValue(t));
        }
        const path = this.createPath(values);
        path.setAttribute("class", "harmonics-result");
        this.svg.appendChild(path);
    }

    drawLabels() {
        const group = this.createSVGElement("g");
        group.setAttribute("class", "harmonics-labels");

        const title = this.createSVGElement("text");
        title.setAttribute("x", this.margin.left);
        title.setAttribute("y", 16);

        title.textContent =
            `${this.waveform} — ` +
            `${this.numHarmonics} ` +
            `${this.numHarmonics === 1
                ? "harmonic"
                : "harmonics"}`;

        group.appendChild(title);

        const zero = this.createSVGElement("text");
        zero.setAttribute("x", this.margin.left - 8);
        zero.setAttribute("y", this.y(0) + 4);
        zero.setAttribute("text-anchor", "end");
        zero.textContent = "0";
        group.appendChild(zero);
        this.svg.appendChild(group);
    }

    draw() {
        this.clearSVG();
        this.drawGrid();
        this.drawComponents();
        this.drawResult();
        this.drawLabels();
    }
}

function initPersistentHarmonics() {
    console.log("[sound-viz] initPersistentWaveforms");

    if (!window.Reveal) {
        console.error("[sound-viz] Reveal not available");
        return;
    }
    console.log("[sound-viz] registering Reveal handlers");
    Reveal.on("ready", event => {
        updatePersistentHarmonics(event.currentSlide);
    });
    Reveal.on("slidechanged", event => {
        updatePersistentHarmonics(event.currentSlide);
    });
}

function initSoundViz() {
    document
        .querySelectorAll(".ripple")
        .forEach(element => {
            if (element.dataset.initialized) {
                return;
            }
            element.dataset.initialized = "true";
            new Ripple(element);
        });
    document
        .querySelectorAll(".particles")
        .forEach(element => {
            if (element.dataset.initialized) {
                return;
            }
            element.dataset.initialized = "true";
            new Particles(element);
        });
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initPersistentWaveforms
    );
} else {
    initPersistentWaveforms();
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initPersistentHarmonics
    );
} else {
    initPersistentHarmonics();
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initSoundViz
    );
} else {
    initSoundViz();
}


// ----------------------------------------------------------------------------
// Compressor
// ----------------------------------------------------------------------------
//
// Same algorithm as Faust's co.compressor_mono (compressors.lib), plus makeup:
//   level = |x| : onePoleSwitching(attack, release) : linear2db
//   gain  = max(level - threshold, 0) * (1/ratio - 1)        (dB)
//   gain  : smooth(tau = attack / 2) ; y = x * db2linear(gain + makeup)

const compressorInstances = new Map();

const COMP_FS = 4000;          // simulation rate of the illustrative signal
const COMP_DURATION = 1.0;     // seconds of signal shown
const COMP_LOOP_SECONDS = 4;   // playhead: slow motion, 1 s of signal in 4 s
const COMP_RATIOS = [1, 1.5, 2, 3, 4, 6, 8, 10, 20, Infinity];
const COMP_DB_MIN = -60, COMP_DB_MAX = 0;

function compNum(value, fallback) {
    const v = parseFloat(value);
    return Number.isFinite(v) ? v : fallback;
}

function compressorSignal(kind) {
    const N = Math.round(COMP_FS * COMP_DURATION);
    const x = new Float32Array(N);
    const db2 = (db) => Math.pow(10, db / 20);
    if (kind === "drums") {
        // Decaying hits of different strengths.
        const hits = [[0.05, -4], [0.3, -16], [0.55, -8], [0.8, -24]];
        for (let n = 0; n < N; n++) {
            const t = n / COMP_FS;
            let a = 0;
            for (const [t0, db] of hits) {
                if (t >= t0) a += db2(db) * Math.exp(-(t - t0) / 0.06);
            }
            x[n] = a * Math.sin(2 * Math.PI * 30 * t);
        }
        return { x, quiet: -24, loud: -4, label: "drum hits" };
    }
    // Burst: quiet, loud, quiet.
    for (let n = 0; n < N; n++) {
        const t = n / COMP_FS;
        const db = (t >= 0.25 && t < 0.65) ? -6 : -36;
        x[n] = db2(db) * Math.sin(2 * Math.PI * 20 * t);
    }
    return { x, quiet: -36, loud: -6, label: "quiet / loud / quiet" };
}

function compressorStatic(level, p) {
    const slope = Number.isFinite(p.ratio) ? 1 / p.ratio : 0;
    return level + Math.max(level - p.threshold, 0) * (slope - 1) + p.makeup;
}

function compressorRun(x, p) {
    const tau2pole = (ms) => (ms > 0 ? Math.exp(-1 / (ms / 1000 * COMP_FS)) : 0);
    const pa = tau2pole(p.attack), pr = tau2pole(p.release), pk = tau2pole(p.attack / 2);
    const slope = Number.isFinite(p.ratio) ? 1 / p.ratio : 0;
    const N = x.length;
    const level = new Float32Array(N), gain = new Float32Array(N), y = new Float32Array(N);
    let env = 0, g = 0;
    for (let n = 0; n < N; n++) {
        const a = Math.abs(x[n]);
        const pole = a > env ? pa : pr;
        env = (1 - pole) * a + pole * env;
        const l = 20 * Math.log10(Math.max(env, 1e-6));
        const gc = Math.max(l - p.threshold, 0) * (slope - 1);
        g = (1 - pk) * gc + pk * g;
        level[n] = l;
        gain[n] = g;
        y[n] = x[n] * Math.pow(10, (g + p.makeup) / 20);
    }
    return { level, gain, y };
}

function getCompressorInstance(placeholder) {
    const id = placeholder.dataset.compressorId;
    if (!compressorInstances.has(id)) {
        compressorInstances.set(id, new Compressor(placeholder));
    }
    return compressorInstances.get(id);
}

function updatePersistentCompressors(slide) {
    for (const c of compressorInstances.values()) {
        c.element.remove();
        c.visible = false;
    }
    if (!slide) return;
    for (const placeholder of slide.querySelectorAll(".compressor-placeholder")) {
        const c = getCompressorInstance(placeholder);
        c.setMode(placeholder.dataset.mode || "full");
        c.visible = true;
        placeholder.replaceChildren(c.element);
    }
}

class Compressor {
    constructor(placeholder) {
        const d = placeholder.dataset;
        this.p = {
            threshold: compNum(d.threshold, -20),
            ratio: compNum(d.ratio, 4),
            attack: compNum(d.attack, 20),
            release: compNum(d.release, 150),
            makeup: compNum(d.makeup, 0),
        };
        this.signalKind = d.signal === "drums" ? "drums" : "burst";
        this.mode = null;
        this.visible = true;
        this.playing = true;
        this.playPos = 0;           // seconds of signal
        this.lastTime = performance.now();

        this.W = 700;
        // Transfer function plot area (square) and the bars on its right.
        this.tf = { x0: 80, y0: 26, size: 280 };
        // Time-domain area (full mode only).
        this.td = { x0: 80, x1: 690, wy0: 390, wy1: 525, gy0: 552, gy1: 612 };

        this.element = document.createElement("div");
        this.element.className = "compressor-widget";
        this.svg = this.svgEl("svg", { class: "compressor-svg" });
        this.element.appendChild(this.svg);
        this.createControls();
        this.setSignal(this.signalKind);
        this.setMode(d.mode || "full");

        requestAnimationFrame((t) => this.tick(t));
    }

    svgEl(name, attrs, parent) {
        const e = document.createElementNS("http://www.w3.org/2000/svg", name);
        for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(e);
        return e;
    }

    // --- scales -----------------------------------------------------------
    dbX(db) {
        const { x0, size } = this.tf;
        return x0 + (db - COMP_DB_MIN) / (COMP_DB_MAX - COMP_DB_MIN) * size;
    }
    dbY(db) {
        const { y0, size } = this.tf;
        const c = Math.min(COMP_DB_MAX + 6, Math.max(COMP_DB_MIN, db));
        return y0 + size - (c - COMP_DB_MIN) / (COMP_DB_MAX - COMP_DB_MIN) * size;
    }
    tX(t) { const { x0, x1 } = this.td; return x0 + t / COMP_DURATION * (x1 - x0); }
    wY(v) { const { wy0, wy1 } = this.td; return (wy0 + wy1) / 2 - v * (wy1 - wy0) / 2; }
    gY(db) { const { gy0, gy1 } = this.td; return gy0 + Math.min(1, -db / 30) * (gy1 - gy0); }

    // --- controls ---------------------------------------------------------
    createControls() {
        this.controls = document.createElement("div");
        this.controls.className = "compressor-controls";
        const ratioIndex = (r) => {
            let best = 0;
            COMP_RATIOS.forEach((v, i) => {
                if (Math.abs(v - r) < Math.abs(COMP_RATIOS[best] - r)) best = i;
            });
            return best;
        };
        const fmtRatio = (r) => (Number.isFinite(r) ? `${r}:1` : "∞:1");
        const defs = [
            { key: "threshold", label: "Threshold", min: -60, max: 0, step: 1,
              fmt: (v) => `${v} dB`, get: () => this.p.threshold, set: (v) => (this.p.threshold = v) },
            { key: "ratio", label: "Ratio", min: 0, max: COMP_RATIOS.length - 1, step: 1,
              fmt: (i) => fmtRatio(COMP_RATIOS[i]), get: () => ratioIndex(this.p.ratio),
              set: (i) => (this.p.ratio = COMP_RATIOS[i]) },
            { key: "attack", label: "Attack", min: 0, max: 200, step: 1, full: true,
              fmt: (v) => `${v} ms`, get: () => this.p.attack, set: (v) => (this.p.attack = v) },
            { key: "release", label: "Release", min: 0, max: 1000, step: 5, full: true,
              fmt: (v) => `${v} ms`, get: () => this.p.release, set: (v) => (this.p.release = v) },
            { key: "makeup", label: "Makeup", min: 0, max: 24, step: 1, full: true,
              fmt: (v) => `+${v} dB`, get: () => this.p.makeup, set: (v) => (this.p.makeup = v) },
        ];
        this.rows = [];
        for (const def of defs) {
            const row = document.createElement("label");
            row.className = "compressor-slider-row";
            if (def.full) row.dataset.full = "true";
            const text = document.createElement("span");
            text.textContent = def.label;
            const input = document.createElement("input");
            Object.assign(input, { type: "range", min: def.min, max: def.max, step: def.step });
            input.value = def.get();
            const out = document.createElement("output");
            out.value = def.fmt(def.get());
            input.addEventListener("input", () => {
                const v = parseFloat(input.value);
                def.set(v);
                out.value = def.fmt(v);
                this.update();
            });
            row.append(text, input, out);
            this.controls.appendChild(row);
        }

        const sigRow = document.createElement("label");
        sigRow.className = "compressor-select-row";
        sigRow.dataset.full = "true";
        const sigText = document.createElement("span");
        sigText.textContent = "Signal";
        this.signalSelect = document.createElement("select");
        for (const [v, t] of [["burst", "Quiet / loud / quiet"], ["drums", "Drum hits"]]) {
            const o = document.createElement("option");
            o.value = v; o.textContent = t;
            this.signalSelect.appendChild(o);
        }
        this.signalSelect.value = this.signalKind;
        this.signalSelect.addEventListener("change", () => this.setSignal(this.signalSelect.value));
        this.playButton = document.createElement("button");
        this.playButton.type = "button";
        this.playButton.className = "compressor-play";
        this.playButton.addEventListener("click", () => {
            this.playing = !this.playing;
            this.lastTime = performance.now();
            this.updatePlayButton();
        });
        this.updatePlayButton();
        sigRow.append(sigText, this.signalSelect, this.playButton);
        this.controls.appendChild(sigRow);
        this.element.appendChild(this.controls);
    }

    updatePlayButton() {
        this.playButton.textContent = this.playing ? "❚❚ Pause" : "▶ Play";
        this.playButton.setAttribute("aria-pressed", this.playing ? "false" : "true");
    }

    setSignal(kind) {
        this.signalKind = kind;
        this.signal = compressorSignal(kind);
        this.update();
    }

    setMode(mode) {
        mode = mode === "static" ? "static" : "full";
        if (mode === this.mode) return;
        this.mode = mode;
        this.element.dataset.mode = mode;
        this.svg.setAttribute("viewBox", `0 0 ${this.W} ${mode === "full" ? 640 : 360}`);
        this.update();
    }

    // --- drawing ----------------------------------------------------------
    update() {
        if (!this.mode || !this.signal) return;
        this.result = compressorRun(this.signal.x, this.p);
        this.draw();
    }

    draw() {
        const svg = this.svg;
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        this.svgEl("rect", { class: "compressor-bg", x: 0, y: 0, width: this.W, height: 640 }, svg);
        this.drawTransfer();
        if (this.mode === "static") this.drawRangeBars();
        else { this.drawMeters(); this.drawTime(); }
        this.drawPlayhead();
    }

    drawTransfer() {
        const g = this.svgEl("g", {}, this.svg);
        const { x0, y0, size } = this.tf;
        const p = this.p;

        // Grid and axes labels every 12 dB.
        for (let db = COMP_DB_MIN; db <= COMP_DB_MAX; db += 12) {
            this.svgEl("line", { class: "compressor-grid", x1: this.dbX(db), x2: this.dbX(db), y1: y0, y2: y0 + size }, g);
            this.svgEl("line", { class: "compressor-grid", x1: x0, x2: x0 + size, y1: this.dbY(db), y2: this.dbY(db) }, g);
            this.text(g, this.dbX(db), y0 + size + 18, `${db}`, "middle", "compressor-tick");
            this.text(g, x0 - 6, this.dbY(db) + 5, `${db}`, "end", "compressor-tick");
        }
        this.text(g, x0 + size / 2, y0 + size + 40, "input level (dB)", "middle", "compressor-axis");
        const yl = this.text(g, 0, 0, "output level (dB)", "middle", "compressor-axis");
        yl.setAttribute("transform", `translate(${x0 - 50}, ${y0 + size / 2}) rotate(-90)`);

        // Clip the curves to the plot.
        const clipId = `comp-clip-${Math.random().toString(36).slice(2)}`;
        const clip = this.svgEl("clipPath", { id: clipId }, g);
        this.svgEl("rect", { x: x0, y: y0, width: size, height: size }, clip);
        const inner = this.svgEl("g", { "clip-path": `url(#${clipId})` }, g);

        // Identity (no compression) and threshold.
        this.svgEl("line", { class: "compressor-identity", x1: this.dbX(COMP_DB_MIN), y1: this.dbY(COMP_DB_MIN), x2: this.dbX(0), y2: this.dbY(0) }, inner);
        this.svgEl("line", { class: "compressor-threshold", x1: this.dbX(p.threshold), x2: this.dbX(p.threshold), y1: y0, y2: y0 + size }, inner);

        // Transfer function: static curve.
        let d = "";
        for (let db = COMP_DB_MIN; db <= COMP_DB_MAX; db += 0.5) {
            d += `${d ? "L" : "M"}${this.dbX(db).toFixed(1)},${this.dbY(compressorStatic(db, p)).toFixed(1)}`;
        }
        this.svgEl("path", { class: "compressor-curve", d }, inner);
        this.svgEl("circle", { class: "compressor-knee", cx: this.dbX(p.threshold), cy: this.dbY(compressorStatic(p.threshold, p)), r: 4 }, inner);

        this.svgEl("rect", { class: "compressor-frame", x: x0, y: y0, width: size, height: size }, g);
        this.text(g, this.dbX(p.threshold) + 5, y0 + 14, "threshold", "start", "compressor-threshold-label");
        const r = Number.isFinite(p.ratio) ? `${p.ratio}:1` : "∞:1";
        const mid = Math.min(0, (p.threshold + COMP_DB_MAX) / 2);
        if (p.threshold < -3) {
            this.text(g, this.dbX(mid), this.dbY(compressorStatic(mid, p)) + 30, `ratio ${r}`, "middle", "compressor-curve-label");
        }
        if (this.mode === "full") this.dotGroup = this.svgEl("g", {}, g);
    }

    // Static mode: a quiet-to-loud range, before and after compression,
    // on the same dB scale as the transfer function's output axis.
    drawRangeBars() {
        const g = this.svgEl("g", {}, this.svg);
        const { quiet, loud } = this.signal;
        const outQ = compressorStatic(quiet, this.p), outL = compressorStatic(loud, this.p);
        const bars = [
            { x: 445, label: "input", lo: quiet, hi: loud, cls: "compressor-bar-in" },
            { x: 580, label: "output", lo: outQ, hi: outL, cls: "compressor-bar-out" },
        ];
        this.text(g, 530, this.tf.y0 - 6, "dynamic range", "middle", "compressor-axis");
        for (const b of bars) {
            const y1 = this.dbY(b.hi), y2 = this.dbY(b.lo);
            this.svgEl("line", { class: "compressor-bar-axis", x1: b.x, x2: b.x, y1: this.dbY(COMP_DB_MIN), y2: this.dbY(0) }, g);
            this.svgEl("rect", { class: b.cls, x: b.x - 26, y: y1, width: 52, height: Math.max(1, y2 - y1), rx: 3 }, g);
            this.text(g, b.x, this.tf.y0 + this.tf.size + 18, b.label, "middle", "compressor-tick");
            this.text(g, b.x + 32, y1 + 5, `${b.hi.toFixed(1)} dB`, "start", "compressor-value");
            this.text(g, b.x + 32, y2 + 5, `${b.lo.toFixed(1)} dB`, "start", "compressor-value");
            this.text(g, b.x, (y1 + y2) / 2 + 5, `${(b.hi - b.lo).toFixed(1)}`, "middle", "compressor-range");
        }
    }

    // Full mode: what the compressor sees and does at the playhead.
    drawMeters() {
        const g = this.svgEl("g", {}, this.svg);
        this.meters = g;
        this.text(g, 535, this.tf.y0 - 6, "at the playhead", "middle", "compressor-axis");
        this.meterEls = [];
        const defs = [
            { x: 440, label: "level", cls: "compressor-bar-in" },
            { x: 540, label: "gain", cls: "compressor-bar-gr" },
            { x: 640, label: "output", cls: "compressor-bar-out" },
        ];
        for (const m of defs) {
            this.svgEl("line", { class: "compressor-bar-axis", x1: m.x, x2: m.x, y1: this.dbY(COMP_DB_MIN), y2: this.dbY(0) }, g);
            const rect = this.svgEl("rect", { class: m.cls, x: m.x - 22, width: 44, rx: 3 }, g);
            const val = this.text(g, m.x, 0, "", "middle", "compressor-value");
            this.text(g, m.x, this.tf.y0 + this.tf.size + 18, m.label, "middle", "compressor-tick");
            this.meterEls.push({ rect, val });
        }
    }

    drawTime() {
        const g = this.svgEl("g", {}, this.svg);
        const { x0, x1, wy0, wy1, gy0, gy1 } = this.td;
        const { x } = this.signal;
        const { y, gain } = this.result;
        const N = x.length;

        this.svgEl("line", { class: "compressor-grid", x1: x0, x2: x1, y1: this.wY(0), y2: this.wY(0) }, g);
        const th = Math.pow(10, this.p.threshold / 20);
        for (const s of [1, -1]) {
            this.svgEl("line", { class: "compressor-threshold", x1: x0, x2: x1, y1: this.wY(s * th), y2: this.wY(s * th) }, g);
        }
        const path = (arr, fy) => {
            let d = "";
            for (let n = 0; n < N; n += 2) d += `${d ? "L" : "M"}${this.tX(n / COMP_FS).toFixed(1)},${fy(arr[n]).toFixed(1)}`;
            return d;
        };
        this.svgEl("path", { class: "compressor-wave-in", d: path(x, (v) => this.wY(v)) }, g);
        this.svgEl("path", { class: "compressor-wave-out", d: path(y, (v) => this.wY(Math.max(-1.05, Math.min(1.05, v)))) }, g);
        this.svgEl("rect", { class: "compressor-frame", x: x0, y: wy0, width: x1 - x0, height: wy1 - wy0 }, g);
        this.text(g, x0 - 6, wy0 + 4, "1", "end", "compressor-tick");
        this.text(g, x0 - 6, wy1 + 4, "-1", "end", "compressor-tick");
        this.text(g, x0 + 6, wy0 - 8, "input", "start", "compressor-legend-in");
        this.text(g, x0 + 75, wy0 - 8, "output", "start", "compressor-legend-out");
        this.text(g, x0 + 160, wy0 - 8, "± threshold", "start", "compressor-threshold-label");

        // Gain reduction strip (0 to -30 dB).
        this.svgEl("line", { class: "compressor-grid", x1: x0, x2: x1, y1: gy0, y2: gy0 }, g);
        this.svgEl("path", { class: "compressor-gr", d: path(gain, (v) => this.gY(v)) + `L${this.tX((N - 1) / COMP_FS)},${gy0}L${x0},${gy0}Z` }, g);
        this.svgEl("rect", { class: "compressor-frame", x: x0, y: gy0, width: x1 - x0, height: gy1 - gy0 }, g);
        this.text(g, x0 - 6, gy0 + 4, "0", "end", "compressor-tick");
        this.text(g, x0 - 6, gy1 + 4, "-30", "end", "compressor-tick");
        this.text(g, x0 + 6, gy1 - 6, "gain reduction (dB)", "start", "compressor-gr-label");
        this.text(g, x1, gy1 + 20, "time →", "end", "compressor-tick");

        // Click / drag on the time view to move the playhead.
        const hit = this.svgEl("rect", { class: "compressor-hit", x: x0, y: wy0, width: x1 - x0, height: gy1 - wy0 }, g);
        const seek = (ev) => {
            const pt = this.svg.createSVGPoint();
            pt.x = ev.clientX; pt.y = ev.clientY;
            const loc = pt.matrixTransform(this.svg.getScreenCTM().inverse());
            this.playPos = Math.max(0, Math.min(COMP_DURATION - 1e-6, (loc.x - x0) / (x1 - x0) * COMP_DURATION));
            this.drawPlayhead();
        };
        hit.addEventListener("pointerdown", (ev) => {
            this.playing = false; this.updatePlayButton();
            hit.setPointerCapture(ev.pointerId);
            seek(ev);
        });
        hit.addEventListener("pointermove", (ev) => { if (hit.hasPointerCapture(ev.pointerId)) seek(ev); });

        this.playhead = this.svgEl("line", { class: "compressor-playhead", y1: wy0, y2: gy1 }, g);
    }

    drawPlayhead() {
        if (this.mode !== "full" || !this.playhead) return;
        const n = Math.min(this.signal.x.length - 1, Math.floor(this.playPos * COMP_FS));
        const px = this.tX(this.playPos);
        this.playhead.setAttribute("x1", px);
        this.playhead.setAttribute("x2", px);

        // Where the compressor actually is on its transfer function: detected
        // level vs. level + applied gain. With a slow attack/release the dot
        // leaves the static curve.
        const level = this.result.level[n], gain = this.result.gain[n];
        const out = level + gain + this.p.makeup;
        const g = this.dotGroup;
        while (g.firstChild) g.removeChild(g.firstChild);
        if (level > COMP_DB_MIN) {
            this.svgEl("line", { class: "compressor-dot-guide", x1: this.dbX(level), x2: this.dbX(level), y1: this.dbY(COMP_DB_MIN), y2: this.dbY(out) }, g);
            this.svgEl("line", { class: "compressor-dot-guide", x1: this.tf.x0, x2: this.dbX(level), y1: this.dbY(out), y2: this.dbY(out) }, g);
            this.svgEl("circle", { class: "compressor-dot", cx: this.dbX(level), cy: this.dbY(out), r: 6 }, g);
        }

        const vals = [level, gain, out];
        this.meterEls.forEach(({ rect, val }, i) => {
            const v = vals[i];
            const top = i === 1 ? this.dbY(0) : this.dbY(Math.max(COMP_DB_MIN, v));
            const bottom = i === 1 ? this.dbY(Math.max(COMP_DB_MIN, v)) : this.dbY(COMP_DB_MIN);
            rect.setAttribute("y", Math.min(top, bottom));
            rect.setAttribute("height", Math.max(1, Math.abs(bottom - top)));
            val.textContent = `${v <= COMP_DB_MIN ? "-∞" : v.toFixed(1)} dB`;
            val.setAttribute("y", (i === 1 ? bottom + 18 : top - 7));
        });
    }

    text(parent, x, y, s, anchor, cls) {
        const t = this.svgEl("text", { x, y, "text-anchor": anchor, class: cls }, parent);
        t.textContent = s;
        return t;
    }

    tick(time) {
        const dt = (time - this.lastTime) / 1000;
        this.lastTime = time;
        if (this.visible && this.playing && this.mode === "full" && this.element.isConnected) {
            this.playPos = (this.playPos + dt * COMP_DURATION / COMP_LOOP_SECONDS) % COMP_DURATION;
            this.drawPlayhead();
        }
        requestAnimationFrame((t) => this.tick(t));
    }
}

function initPersistentCompressors() {
    if (!window.Reveal) return;
    Reveal.on("ready", (event) => updatePersistentCompressors(event.currentSlide));
    Reveal.on("slidechanged", (event) => updatePersistentCompressors(event.currentSlide));
    // Reveal may already be ready when this runs ("ready" fires only once).
    if (Reveal.isReady && Reveal.isReady()) updatePersistentCompressors(Reveal.getCurrentSlide());
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPersistentCompressors);
} else {
    initPersistentCompressors();
}


// ----------------------------------------------------------------------------
// Clipper (waveshaping): y = f(drive * x), memoryless, sample by sample.
// ----------------------------------------------------------------------------
//
// All shapes have slope 1 at the origin and a ceiling of ±1, so they only
// differ by how they bend (hard corner vs. smooth).

const CLIP_SHAPES = {
    hard: {
        label: "Hard clip",
        f: (x) => Math.max(-1, Math.min(1, x)),
        faust: "process = *(drive) : max(-1) : min(1);",
    },
    tanh: {
        label: "Soft clip (tanh)",
        f: (x) => Math.tanh(x),
        faust: "process = *(drive) : ma.tanh;",
    },
    cubic: {
        label: "Soft clip (cubic)",
        f: (x) => { const u = Math.max(-1, Math.min(1, x / 1.5)); return 1.5 * (u - u * u * u / 3); },
        faust: "cubic(x) = 1.5*(u - u^3/3)\n  with { u = max(-1, min(1, x/1.5)); };\nprocess = *(drive) : cubic;",
    },
};
const CLIP_HARMONICS = 15;
const CLIP_DB_FLOOR = -80;
const CLIP_RANGE = 1.2;        // plotted amplitude range: ±CLIP_RANGE
const CLIP_LOOP_SECONDS = 4;   // the animated dot covers 2 periods in 4 s
const CLIP_FREQ = 220;         // Hz, for the sound

const clipperInstances = new Map();

function getClipperInstance(placeholder) {
    const id = placeholder.dataset.clipperId;
    if (!clipperInstances.has(id)) clipperInstances.set(id, new Clipper(placeholder));
    return clipperInstances.get(id);
}

function updatePersistentClippers(slide) {
    for (const c of clipperInstances.values()) {
        c.element.remove();
        c.visible = false;
        c.stopSound();
    }
    if (!slide) return;
    for (const placeholder of slide.querySelectorAll(".clipper-placeholder")) {
        const c = getClipperInstance(placeholder);
        c.visible = true;
        placeholder.replaceChildren(c.element);
    }
}

class Clipper {
    constructor(placeholder) {
        const d = placeholder.dataset;
        this.shape = CLIP_SHAPES[d.shape] ? d.shape : "hard";
        this.driveDb = compNum(d.drive, 6);
        this.visible = true;
        this.phase = 0;              // 0..2 periods
        this.lastTime = performance.now();
        this.audio = null;

        this.W = 700; this.H = 500;
        this.tf = { x0: 70, y0: 20, size: 250 };
        this.wv = { x0: 370, x1: 690 };
        this.sp = { x0: 70, x1: 690, y0: 340, y1: 450 };

        this.element = document.createElement("div");
        this.element.className = "compressor-widget clipper-widget";
        this.svg = Compressor.prototype.svgEl("svg", {
            class: "compressor-svg", viewBox: `0 0 ${this.W} ${this.H}`,
        });
        this.element.appendChild(this.svg);
        this.createControls();
        this.update();
        requestAnimationFrame((t) => this.tick(t));
    }

    svgEl(name, attrs, parent) { return Compressor.prototype.svgEl(name, attrs, parent); }
    text(parent, x, y, s, anchor, cls) { return Compressor.prototype.text.call(this, parent, x, y, s, anchor, cls); }

    get gain() { return Math.pow(10, this.driveDb / 20); }
    out(x) { return CLIP_SHAPES[this.shape].f(this.gain * x); }

    // --- scales -----------------------------------------------------------
    ampY(v) { const { y0, size } = this.tf; return y0 + size / 2 - v / CLIP_RANGE * size / 2; }
    ampX(v) { const { x0, size } = this.tf; return x0 + size / 2 + v / CLIP_RANGE * size / 2; }
    timeX(ph) { const { x0, x1 } = this.wv; return x0 + ph / 2 * (x1 - x0); }
    harmX(k) { const { x0, x1 } = this.sp; return x0 + (k - 0.5) / CLIP_HARMONICS * (x1 - x0); }
    dbY(db) {
        const { y0, y1 } = this.sp;
        return y0 + Math.min(1, Math.max(0, db / CLIP_DB_FLOOR)) * (y1 - y0);
    }

    // --- controls ---------------------------------------------------------
    createControls() {
        const controls = document.createElement("div");
        controls.className = "compressor-controls";

        const shapeRow = document.createElement("label");
        shapeRow.className = "compressor-select-row";
        const shapeText = document.createElement("span");
        shapeText.textContent = "Shape";
        const select = document.createElement("select");
        for (const [k, s] of Object.entries(CLIP_SHAPES)) {
            const o = document.createElement("option");
            o.value = k; o.textContent = s.label;
            select.appendChild(o);
        }
        select.value = this.shape;
        select.addEventListener("change", () => { this.shape = select.value; this.update(); });
        this.soundButton = document.createElement("button");
        this.soundButton.type = "button";
        this.soundButton.className = "compressor-play";
        this.soundButton.addEventListener("click", () => (this.audio ? this.stopSound() : this.startSound()));
        this.updateSoundButton();
        shapeRow.append(shapeText, select, this.soundButton);

        const driveRow = document.createElement("label");
        driveRow.className = "compressor-slider-row clipper-drive-row";
        const driveText = document.createElement("span");
        driveText.textContent = "Drive";
        const input = document.createElement("input");
        Object.assign(input, { type: "range", min: -6, max: 24, step: 1 });
        input.value = this.driveDb;
        const outEl = document.createElement("output");
        const fmt = () => `${this.driveDb > 0 ? "+" : ""}${this.driveDb} dB (×${this.gain.toFixed(2)})`;
        outEl.value = fmt();
        input.addEventListener("input", () => {
            this.driveDb = parseFloat(input.value);
            outEl.value = fmt();
            this.update();
        });
        driveRow.append(driveText, input, outEl);

        this.code = document.createElement("pre");
        this.code.className = "clipper-code";

        controls.append(shapeRow, driveRow, this.code);
        this.element.appendChild(controls);
    }

    updateSoundButton() {
        this.soundButton.textContent = this.audio ? "■ Stop sound" : "🔊 Play sound";
        this.soundButton.setAttribute("aria-pressed", this.audio ? "true" : "false");
    }

    shaperCurve() {
        const n = 2048, curve = new Float32Array(n);
        for (let i = 0; i < n; i++) curve[i] = this.out(i / (n - 1) * 2 - 1);
        return curve;
    }

    startSound() {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        osc.frequency.value = CLIP_FREQ;
        const shaper = ctx.createWaveShaper();
        shaper.oversample = "4x";    // limits aliasing of the added harmonics
        shaper.curve = this.shaperCurve();
        const vol = ctx.createGain();
        vol.gain.setValueAtTime(0, ctx.currentTime);
        vol.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.03);
        osc.connect(shaper).connect(vol).connect(ctx.destination);
        osc.start();
        this.audio = { ctx, shaper, vol };
        this.updateSoundButton();
    }

    stopSound() {
        if (!this.audio) return;
        const { ctx, vol } = this.audio;
        vol.gain.setValueAtTime(vol.gain.value, ctx.currentTime);
        vol.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.03);
        setTimeout(() => ctx.close(), 60);
        this.audio = null;
        this.updateSoundButton();
    }

    // --- analysis ---------------------------------------------------------
    // Amplitudes of harmonics 1..CLIP_HARMONICS of f(drive * sin), by DFT
    // over exactly one period.
    harmonics() {
        const N = 1024, y = new Float64Array(N);
        for (let n = 0; n < N; n++) y[n] = this.out(Math.sin(2 * Math.PI * n / N));
        const amps = [];
        for (let k = 1; k <= CLIP_HARMONICS; k++) {
            let re = 0, im = 0;
            for (let n = 0; n < N; n++) {
                const a = 2 * Math.PI * k * n / N;
                re += y[n] * Math.cos(a);
                im -= y[n] * Math.sin(a);
            }
            amps.push(2 * Math.hypot(re, im) / N);
        }
        return amps;
    }

    // --- drawing ----------------------------------------------------------
    update() {
        this.code.textContent = CLIP_SHAPES[this.shape].faust;
        if (this.audio) this.audio.shaper.curve = this.shaperCurve();
        const svg = this.svg;
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        this.svgEl("rect", { class: "compressor-bg", x: 0, y: 0, width: this.W, height: this.H }, svg);
        this.drawTransfer();
        this.drawWave();
        this.drawSpectrum();
        this.dots = this.svgEl("g", {}, svg);
        this.drawDots();
    }

    drawTransfer() {
        const g = this.svgEl("g", {}, this.svg);
        const { x0, y0, size } = this.tf;
        for (const v of [-1, -0.5, 0, 0.5, 1]) {
            this.svgEl("line", { class: "compressor-grid", x1: this.ampX(v), x2: this.ampX(v), y1: y0, y2: y0 + size }, g);
            this.svgEl("line", { class: "compressor-grid", x1: x0, x2: x0 + size, y1: this.ampY(v), y2: this.ampY(v) }, g);
            this.text(g, this.ampX(v), y0 + size + 18, `${v}`, "middle", "compressor-tick");
            this.text(g, x0 - 6, this.ampY(v) + 5, `${v}`, "end", "compressor-tick");
        }
        this.text(g, x0 + size / 2, y0 + size + 40, "input sample x", "middle", "compressor-axis");
        const yl = this.text(g, 0, 0, "output sample y", "middle", "compressor-axis");
        yl.setAttribute("transform", `translate(${x0 - 48}, ${y0 + size / 2}) rotate(-90)`);
        this.svgEl("rect", { class: "compressor-frame", x: x0, y: y0, width: size, height: size }, g);

        // Ceiling ±1 and identity (no effect).
        for (const c of [-1, 1]) {
            this.svgEl("line", { class: "compressor-threshold", x1: x0, x2: this.wv.x1, y1: this.ampY(c), y2: this.ampY(c) }, g);
        }
        this.svgEl("line", { class: "compressor-identity",
            x1: this.ampX(-1 / this.gainClamp()), y1: this.ampY(-1 / this.gainClamp() * this.gain),
            x2: this.ampX(1 / this.gainClamp()), y2: this.ampY(1 / this.gainClamp() * this.gain) }, g);

        let d = "";
        for (let i = 0; i <= 400; i++) {
            const x = i / 400 * 2 - 1;
            d += `${d ? "L" : "M"}${this.ampX(x).toFixed(1)},${this.ampY(this.out(x)).toFixed(1)}`;
        }
        this.svgEl("path", { class: "compressor-curve", d }, g);
        this.text(g, x0 + 8, y0 + 22, `y = f(${this.gain.toFixed(2)}·x)`, "start", "compressor-curve-label");
    }

    // Keeps the dashed linear line y = drive·x inside the plot.
    gainClamp() { return Math.max(1, this.gain / CLIP_RANGE); }

    drawWave() {
        const g = this.svgEl("g", {}, this.svg);
        const { x0, x1 } = this.wv;
        const { y0, size } = this.tf;
        this.svgEl("line", { class: "compressor-grid", x1: x0, x2: x1, y1: this.ampY(0), y2: this.ampY(0) }, g);
        this.svgEl("rect", { class: "compressor-frame", x: x0, y: y0, width: x1 - x0, height: size }, g);
        let din = "", dout = "";
        for (let i = 0; i <= 400; i++) {
            const ph = i / 400 * 2, x = Math.sin(Math.PI * 2 * ph);
            const X = this.timeX(ph).toFixed(1);
            din += `${din ? "L" : "M"}${X},${this.ampY(x).toFixed(1)}`;
            dout += `${dout ? "L" : "M"}${X},${this.ampY(this.out(x)).toFixed(1)}`;
        }
        this.svgEl("path", { class: "compressor-wave-in clipper-wave-in", d: din }, g);
        this.svgEl("path", { class: "compressor-wave-out", d: dout }, g);
        this.text(g, (x0 + x1) / 2, y0 + size + 40, "time (2 periods)", "middle", "compressor-axis");
        this.text(g, x0 + 8, y0 + size - 10, "input x", "start", "compressor-legend-in");
        this.text(g, x1 - 8, y0 + size - 10, "output y", "end", "compressor-legend-out");
        this.text(g, x1 - 8, this.ampY(1) - 6, "ceiling ±1", "end", "compressor-threshold-label");
    }

    drawSpectrum() {
        const g = this.svgEl("g", {}, this.svg);
        const { x0, x1, y0, y1 } = this.sp;
        const amps = this.harmonics();
        for (const db of [0, -20, -40, -60, -80]) {
            this.svgEl("line", { class: "compressor-grid", x1: x0, x2: x1, y1: this.dbY(db), y2: this.dbY(db) }, g);
            this.text(g, x0 - 6, this.dbY(db) + 5, `${db}`, "end", "compressor-tick");
        }
        const bw = (x1 - x0) / CLIP_HARMONICS * 0.55;
        amps.forEach((a, i) => {
            const k = i + 1, X = this.harmX(k);
            const db = 20 * Math.log10(Math.max(a, 1e-12));
            if (db > CLIP_DB_FLOOR) {
                this.svgEl("rect", {
                    class: k === 1 ? "clipper-bar-fund" : "clipper-bar",
                    x: X - bw / 2, y: this.dbY(db), width: bw, height: this.dbY(CLIP_DB_FLOOR) - this.dbY(db),
                }, g);
            }
            this.text(g, X, y1 + 18, `${k}`, "middle", "compressor-tick");
        });
        this.text(g, (x0 + x1) / 2, y1 + 42, "harmonic (× 220 Hz)", "middle", "compressor-axis");
        const yl = this.text(g, 0, 0, "dB", "middle", "compressor-axis");
        yl.setAttribute("transform", `translate(${x0 - 48}, ${(y0 + y1) / 2}) rotate(-90)`);

        // Total harmonic distortion: energy of the added harmonics vs. fundamental.
        const rest = Math.sqrt(amps.slice(1).reduce((s, a) => s + a * a, 0));
        const thd = 100 * rest / amps[0];
        this.text(g, x1, y0 - 10, `THD ≈ ${thd < 0.1 ? thd.toFixed(2) : thd.toFixed(1)} %`, "end", "compressor-value");
        this.text(g, x0, y0 - 10, "Spectrum of the output", "start", "compressor-value");
    }

    drawDots() {
        const g = this.dots;
        if (!g) return;
        while (g.firstChild) g.removeChild(g.firstChild);
        const x = Math.sin(2 * Math.PI * this.phase), y = this.out(x);
        const tx = this.ampX(x), ty = this.ampY(y), wx = this.timeX(this.phase);
        // The output value is read on the curve and carried over in time.
        this.svgEl("line", { class: "compressor-dot-guide", x1: tx, x2: tx, y1: this.ampY(0), y2: ty }, g);
        this.svgEl("line", { class: "compressor-dot-guide", x1: tx, x2: wx, y1: ty, y2: ty }, g);
        this.svgEl("line", { class: "compressor-playhead", x1: wx, x2: wx, y1: this.tf.y0, y2: this.tf.y0 + this.tf.size }, g);
        this.svgEl("circle", { class: "clipper-dot-in", cx: tx, cy: this.ampY(0), r: 5 }, g);
        this.svgEl("circle", { class: "clipper-dot-in", cx: wx, cy: this.ampY(x), r: 5 }, g);
        this.svgEl("circle", { class: "compressor-dot", cx: tx, cy: ty, r: 7 }, g);
        this.svgEl("circle", { class: "compressor-dot", cx: wx, cy: ty, r: 7 }, g);
    }

    tick(time) {
        const dt = (time - this.lastTime) / 1000;
        this.lastTime = time;
        if (this.visible && this.element.isConnected) {
            this.phase = (this.phase + dt * 2 / CLIP_LOOP_SECONDS) % 2;
            this.drawDots();
        }
        requestAnimationFrame((t) => this.tick(t));
    }
}

function initPersistentClippers() {
    if (!window.Reveal) return;
    Reveal.on("ready", (event) => updatePersistentClippers(event.currentSlide));
    Reveal.on("slidechanged", (event) => updatePersistentClippers(event.currentSlide));
    if (Reveal.isReady && Reveal.isReady()) updatePersistentClippers(Reveal.getCurrentSlide());
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPersistentClippers);
} else {
    initPersistentClippers();
}
