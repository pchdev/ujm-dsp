class Ripple {
    constructor(element) {
        this.element = element;
        this.amplitude = parseFloat(
            element.dataset.amplitude ?? "1"
        );
        this.frequency = parseFloat(
            element.dataset.frequency ?? "2"
        );
        this.maxRadius = 180;
        this.waves = [];
        this.lastTime = performance.now();
        this.lastEmission = 0;

        this.createSVG();
        this.createControls();
        this.running = true;

        requestAnimationFrame(
            time => this.tick(time)
        );
    }

    createSVG() {
        this.svg = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
        );
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
            "http://www.w3.org/2000/svg",
            "circle"
        );
        this.source.setAttribute("cx", 200);
        this.source.setAttribute("cy", 200);
        this.source.setAttribute("r", 5);
        this.source.classList.add("ripple-source");
        this.svg.appendChild(this.source);
    }

    createControls() {
        this.controls =
            document.createElement("div");

        this.controls.className =
            "ripple-controls";

        this.controls.innerHTML = `
            <label>
                Amplitude
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value="${this.amplitude}">
                <output>${this.amplitude.toFixed(2)}</output>
            </label>

            <label>
                Frequency
                <input
                    type="range"
                    min="0.5"
                    max="8"
                    step="0.1"
                    value="${this.frequency}">
                <output>${this.frequency.toFixed(1)}</output>
            </label>
        `;

        this.element.appendChild(this.controls);

        const inputs =
            this.controls.querySelectorAll("input");

        this.amplitudeInput = inputs[0];
        this.frequencyInput = inputs[1];
        this.amplitudeOutput =
            this.amplitudeInput.nextElementSibling;
        this.frequencyOutput =
            this.frequencyInput.nextElementSibling;
        this.amplitudeInput.addEventListener(
            "input",
            () => {
                this.amplitude =
                    parseFloat(
                        this.amplitudeInput.value
                    );

                this.amplitudeOutput.value =
                    this.amplitude.toFixed(2);
            }
        );
        this.frequencyInput.addEventListener(
            "input",
            () => {
                this.frequency =
                    parseFloat(
                        this.frequencyInput.value
                    );

                this.frequencyOutput.value =
                    this.frequency.toFixed(1);
            }
        );
    }
    emit(time) {
        const circle =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "circle"
            );

        circle.setAttribute("cx", 200);
        circle.setAttribute("cy", 200);
        circle.setAttribute("r", 0);
        circle.classList.add("ripple-wave");
        this.svg.appendChild(circle);
        this.waves.push({
            element: circle,
            birth: time
        });
    }
    update(time) {
        // Frequency controls how often
        // new wavefronts are emitted.
        const emissionInterval =
            1000 / this.frequency;
        if (
            time - this.lastEmission >
            emissionInterval
        ) {
            this.emit(time);
            this.lastEmission = time;
        }
        // Propagation speed.
        //
        // This is deliberately independent
        // from frequency and amplitude.
        const speed = 100;
        for (let i = this.waves.length - 1;
             i >= 0;
             i--) {
            const wave = this.waves[i];
            const age =
                (time - wave.birth) / 1000;

            const radius =
                age * speed;

            const normalized =
                radius / this.maxRadius;

            if (normalized >= 1) {
                wave.element.remove();
                this.waves.splice(i, 1);
                continue;
            }
            wave.element.setAttribute(
                "r",
                radius
            );
            // Amplitude controls visibility.
            const opacity =
                this.amplitude *
                (1 - normalized);

            wave.element.setAttribute(
                "opacity",
                opacity
            );
        }
    }
    tick(time) {
        if (!this.running) {
            return;
        }
        this.update(time);
        requestAnimationFrame(
            t => this.tick(t)
        );
    }

    pause() {
        this.running = false;
    }

    resume() {
        if (this.running) {
            return;
        }
        this.running = true;
        requestAnimationFrame(
            t => this.tick(t)
        );
    }
}


function initRipples() {
    document
        .querySelectorAll(".ripple")
        .forEach(element => {
            if (element.dataset.initialized) {
                return;
            }
            element.dataset.initialized = "true";
            new Ripple(element);
        });
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initRipples
    );
} else {
    initRipples();
}
