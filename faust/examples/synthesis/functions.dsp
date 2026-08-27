import("stdfaust.lib");

// Declaring functions, with variable parameters:
sine(freq) = os.osci(freq);
triangle(freq) = os.triangle(freq);
sawtooth(freq) = os.sawtooth(freq);
square(freq) = os.square(freq);

// Passing arguments from function to function:
synth(osc, freq, gain) = osc(freq) * gain;

// This way, we can modify everything here:
process =  synth(sine, 440, ba.db2linear(-16));