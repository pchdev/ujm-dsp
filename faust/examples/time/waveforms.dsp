import("stdfaust.lib");

counter(i, n) = ((_ + i) % n) ~ _;
phasor(f) = counter(f/ma.SR, 1.0);

// For sawtooth, we re-scale the signal to [-1, 1]
sawtooth(f) = phasor(f) * 2.0 - 1.0;

// Sine function has an input range 
// of [0, 2*PI]:
sine(f) = sin(phasor(f) * 2.0 * ma.PI);

// For square, we can use a simple 'if' expression
// output -1.0 when phase is below 0.5
// and 1.0 when it's above:
square(f) = ba.if(
    phasor(f) > 0.5, // condition
    1.0, // then
   -1.0  // else
);

// Triangle is a little more complicated,
// we need to invert the signal when it 
// reaches half of its max amplitude,
// and then rescale it to [-1, 1]:
triangle(f) = 
    (
        ba.if(
            phasor(f) < 0.5, 
            phasor(f), 
            1.0-phasor(f)
        ) 
        - 0.25
    ) 
    * 4.0;

process = phasor(440) * 0.25;



