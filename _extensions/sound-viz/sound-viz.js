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

class Waveform {
    constructor(element) {
        this.element = element;
        this.amplitude = parseFloat(
            element.dataset.amplitude ?? "25"
        );
        this.frequency = parseFloat(
            element.dataset.frequency ?? "1.0"
        );
        this.waveform = element.dataset.waveform ?? "sine";
        this.sampleRate = parseFloat(
            element.dataset.srate ?? "5.0"  
        );
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

        // Continuous waveform.
        this.path = document.createElementNS(NS, "path");
        this.path.classList.add("waveform-line");
        this.svg.appendChild(this.path);

        // Interpolation line:
        this.interpolationPath = document.createElementNS(NS, "path");
        this.interpolationPath.classList.add("waveform-interpolation");
        this.svg.appendChild(this.interpolationPath);

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

    quantize(value, bits) {
        const max = Math.pow(2, bits-1) -1;
        return Math.round(value * max) / max;
    }

    showSampleInfo(point) {
        this.hideSampleInfo();
        const NS = "http://www.w3.org/2000/svg";
        const group = document.createElementNS(NS, "g");
        group.classList.add("waveform-sample-info");
        const hasQuantization = point.qvalue !== undefined;
        const boxWidth = 125;
        const boxHeight = hasQuantization ? 66 : 38;
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

        const lines = [
            `t: ${point.time.toFixed(3)}s`,
            `x: ${point.value.toFixed(3)}`
        ];
        if (hasQuantization) {
            lines.push(
                `${point.bits}-bit: ` +
                `${point.qvalue.toFixed(3)}`
            );
            lines.push(
                `error: ` +
                `${(point.qvalue - point.value).toFixed(4)}`
            );
        }
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
                    <option value="8">8 bits</option>
                    <option value="16" selected>16 bits</option>
                    <option value="24">24 bits</option>
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
        /*
         * Draw discrete samples.
         */
        this.sampleGroup.replaceChildren();

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
                const bits = parseInt(this.bitDepthSelect.value, 10);
                for (const point of samples) {
                     const qvalue = this.quantize(point.value, bits);
                     const qy = 150 - qvalue * this.amplitude * 2;
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
                     circle.setAttribute("cy", point.y);
                     circle.setAttribute("r", 4);
                     circle.classList.add("waveform-quantized-sample");
                     circle.addEventListener("mouseenter", () => {
                         circle.classList.add("waveform-sample-active");
                         this.showSampleInfo({
                             ...point,
                             qvalue,
                             qy,
                             bits
                         });
                     });
                     circle.addEventListener("mouseleave", () => {
                         circle.classList.remove("waveform-sample-active");
                         this.hideSampleInfo();
                     });
                     this.quantizationGroup.appendChild(circle);
                }
            }
        }
    }

    tick(time) {
        const dt = (time - this.lastTime) / 1000;
        this.lastTime = time;

        if (this.running) {
            this.simulationTime += dt;
            this.draw();
        }
        requestAnimationFrame(
            t => this.tick(t)
        );
    }
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
    document
        .querySelectorAll(".waveform")
        .forEach(element => {
            if (element.dataset.initialized) {
                return;
            }
            element.dataset.initialized = "true";
            new Waveform(element);
        }
    );
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initSoundViz
    );
} else {
    initSoundViz();
}

