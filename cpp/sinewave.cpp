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

const int TABLE_SIZE = 16384;

struct Sinewave {
    Phasor phasor;
    float table[TABLE_SIZE];

    void init(float freq) {
        phasor.init(freq);
        for (int i = 0; i < TABLE_SIZE; i++) {
             float p = float(i) / TABLE_SIZE;
             table[i] = sin(p * M_PI * 2.f);
        }
    }
    float process() {
        float phase = phasor.process();
        float sine = table[int(phase * TABLE_SIZE)];
        return sine;
    }
};

int main() {
    Sinewave sine;
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
