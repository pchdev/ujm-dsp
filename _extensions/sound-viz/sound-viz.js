class Ripple {
    constructor(element) {
        this.element = element;

        // Physical-ish parameters
        this.amplitude = 0.7;
        this.frequency = 2.0;
        this.speed = 100;

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
        const NS =
            "http://www.w3.org/2000/svg";

        this.svg =
            document.createElementNS(
                NS,
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

        this.source =
            document.createElementNS(
                NS,
                "circle"
            );

        this.source.setAttribute(
            "cx",
            200
        );

        this.source.setAttribute(
            "cy",
            200
        );

        this.source.setAttribute(
            "r",
            6
        );

        this.source.classList.add(
            "ripple-source"
        );

        this.svg.appendChild(
            this.source
        );
    }


    createControls() {
        this.controls =
            document.createElement(
                "div"
            );

        this.controls.className =
            "ripple-controls";


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


        this.amplitudeInput =
            this.controls.querySelector(
                ".ripple-amplitude"
            );

        this.frequencyInput =
            this.controls.querySelector(
                ".ripple-frequency"
            );

        this.speedInput =
            this.controls.querySelector(
                ".ripple-speed"
            );


        this.amplitudeInput
            .addEventListener(
                "input",
                () => {

                    this.amplitude =
                        parseFloat(
                            this.amplitudeInput.value
                        );

                    this.amplitudeInput
                        .nextElementSibling
                        .value =
                        this.amplitude.toFixed(2);
                }
            );


        this.frequencyInput
            .addEventListener(
                "input",
                () => {

                    this.frequency =
                        parseFloat(
                            this.frequencyInput.value
                        );

                    this.frequencyInput
                        .nextElementSibling
                        .value =
                        this.frequency.toFixed(1);
                }
            );


        this.speedInput
            .addEventListener(
                "input",
                () => {

                    this.speed =
                        parseFloat(
                            this.speedInput.value
                        );

                    this.speedInput
                        .nextElementSibling
                        .value =
                        this.speed;
                }
            );
        this.info =
            document.createElement("div");

        this.info.className =
            "ripple-info";

        this.element.appendChild(
            this.info
        );
    }


    emit(time) {
        const NS =
            "http://www.w3.org/2000/svg";


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

        const period =
            1000 / this.frequency;

        const index =
            Math.floor(
                time / (period / 2)
            );


        const circle =
            document.createElementNS(
                NS,
                "circle"
            );

        circle.setAttribute(
            "cx",
            200
        );

        circle.setAttribute(
            "cy",
            200
        );

        circle.setAttribute(
            "r",
            0
        );


        circle.classList.add(
            index % 2 === 0
                ? "ripple-compression"
                : "ripple-rarefaction"
        );


        this.svg.appendChild(
            circle
        );


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

        if (
            time - this.lastEmission >=
            halfPeriod
        ) {

            this.emit(time);

            this.lastEmission = time;
        }


        for (
            let i = this.waves.length - 1;
            i >= 0;
            i--
        ) {

            const wave =
                this.waves[i];


            const age =
                (time - wave.birth) / 1000;


            const radius =
                age * this.speed;


            const normalized =
                radius / this.maxRadius;


            if (normalized >= 1) {

                wave.element.remove();

                this.waves.splice(
                    i,
                    1
                );

                continue;
            }


            wave.element.setAttribute(
                "r",
                radius
            );


            /*
             * Amplitude determines
             * the strength of the
             * pressure variation.
             */

            const opacity =
                this.amplitude *
                (1 - normalized);


            wave.element.setAttribute(
                "opacity",
                opacity
            );
        }
        const wavelength =
    this.speed / this.frequency;
    this.info.innerHTML = `
        <span>c = ${this.speed.toFixed(0)}</span>
        <span>f = ${this.frequency.toFixed(1)}</span>
        <span>λ = ${wavelength.toFixed(1)}</span>
    `;
    }


    tick(time) {

        this.update(time);

        requestAnimationFrame(
            (t) => this.tick(t)
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


if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initRipples
    );

} else {
    initRipples();
}

class Particles {
    constructor(element) {
        this.element = element;

        this.amplitude =
            parseFloat(
                element.dataset.amplitude ?? "15"
            );

        this.frequency =
            parseFloat(
                element.dataset.frequency ?? "1"
            );

        this.speed =
            parseFloat(
                element.dataset.speed ?? "80"
            );


        this.spacing = 25;

        this.rows = 8;
        this.cols = 10;

        this.width = 400;
        this.height = 300;

        this.particles = [];

        this.startTime =
            performance.now();


        this.createSVG();
        this.createControls();

        requestAnimationFrame(
            time => this.tick(time)
        );
    }


    createSVG() {

        const NS =
            "http://www.w3.org/2000/svg";


        this.svg =
            document.createElementNS(
                NS,
                "svg"
            );

        this.svg.setAttribute(
            "viewBox",
            "0 0 400 300"
        );

        this.element.appendChild(
            this.svg
        );


        /*
         * Create the particles.
         */

        for (
            let y = 0;
            y < this.rows;
            y++
        ) {

            for (
                let x = 0;
                x < this.cols;
                x++
            ) {

                const particle =
                    document.createElementNS(
                        NS,
                        "circle"
                    );

                particle.setAttribute(
                    "r",
                    3
                );

                particle.classList.add(
                    "particle"
                );

                this.svg.appendChild(
                    particle
                );


                this.particles.push({
                    element: particle,
                    x,
                    y
                });
            }
        }
    }


    createControls() {

        this.controls =
            document.createElement(
                "div"
            );

        this.controls.className =
            "particles-controls";


        this.controls.innerHTML = `
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


        this.element.appendChild(
            this.controls
        );


        const inputs =
            this.controls.querySelectorAll(
                "input"
            );


        this.amplitudeInput =
            inputs[0];

        this.frequencyInput =
            inputs[1];

        this.speedInput =
            inputs[2];


        this.amplitudeInput
            .addEventListener(
                "input",
                () => {

                    this.amplitude =
                        parseFloat(
                            this.amplitudeInput.value
                        );

                    this.amplitudeInput
                        .nextElementSibling
                        .value =
                        this.amplitude;
                }
            );


        this.frequencyInput
            .addEventListener(
                "input",
                () => {

                    this.frequency =
                        parseFloat(
                            this.frequencyInput.value
                        );

                    this.frequencyInput
                        .nextElementSibling
                        .value =
                        this.frequency.toFixed(1);
                }
            );


        this.speedInput
            .addEventListener(
                "input",
                () => {

                    this.speed =
                        parseFloat(
                            this.speedInput.value
                        );

                    this.speedInput
                        .nextElementSibling
                        .value =
                        this.speed;
                }
            );
    }


    update(time) {

        /*
         * Time in seconds.
         */

        const t =
            (time - this.startTime) / 1000;


        /*
         * Angular frequency:
         *
         *     ω = 2πf
         */

        const omega =
            2 * Math.PI * this.frequency;


        /*
         * Wavenumber:
         *
         *     k = ω / c
         *
         * which is equivalent to:
         *
         *     k = 2π / λ
         */

        const k =
            omega / this.speed;


        for (const particle of this.particles) {

            const baseX =
                100 +
                particle.x *
                this.spacing;


            const baseY =
                50 +
                particle.y *
                this.spacing;


            /*
             * Longitudinal displacement:
             *
             * x(t) = A sin(ωt - kx)
             */

            const displacement =
                this.amplitude *
                Math.sin(
                    omega * t -
                    k * baseX
                );


            particle.element.setAttribute(
                "cx",
                baseX + displacement
            );

            particle.element.setAttribute(
                "cy",
                baseY
            );
        }
    }


    tick(time) {

        this.update(time);

        requestAnimationFrame(
            t => this.tick(t)
        );
    }
}
