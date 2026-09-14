#include <cmath>
#include <cstdio>


struct Phasor {
    float phase;
    float frequency;

    void init(float freq) {
        phase = 0;
        frequency = freq;
    }

    float process() {
        phase += frequency/48000.f;
        if (phase >= 1.f) {
            phase -= 1.f;
        }
        return phase;
    }
};

struct Sinewave {
    Phasor phasor;

    void init(float freq) {
        phasor.init(freq);
    }

    float process() {
        float phase = phasor.process();
        float sine = sin(phase * M_PI * 2.f);
        return sine;
    }
};

struct Square {
    Phasor phasor;

    void init(float freq) {
        phasor.init(freq);
    }

    float process() {
        float phase = phasor.process();
        float square = phase < 0.5f ? -1.f : 1.f;
        return square;
    }
};

struct Sawtooth {
    Phasor phasor;
    void init(float freq) {
        phasor.init(freq);
    }

    float process() {
        float phase = phasor.process();
        float saw = phase * 2.f - 1.f;
        return saw;
    }
};

struct Triangle {
    Phasor phasor;
    void init(float freq) {
        phasor.init(freq);
    }

    float process() {
        float phase = phasor.process();
        float tri;
        if (phase < 0.5) {
            tri = phase;
        } else {
            tri = 1.f - phase;
        }
        tri -= 0.25;
        tri *= 4.0;
        return tri ;
    }
};

int main() {
    Triangle sine;
    sine.init(440.f);

    for (int i = 0; i < 48000; i++) {
        float sample = sine.process();
        int n = sample * 40 + 40;
        for (int s = 0; s < 100; ++s) {
            if (s == n) {
                printf("%f", sample);
            } else {
                printf(" ");
            }
        }
        printf("\n");
    }

    return 0;
}
