import("stdfaust.lib");

sine(freq) = os.osci(freq);
triangle(freq) = os.triangle(freq);
sawtooth(freq) = os.sawtooth(freq);
square(freq) = os.square(freq);

synth(osc, freq, gain) = osc(freq) * gain : fi.lowpass(1, freq);

// Declare some controls:
freq_gui = nentry("frequency[unit:Hz]", 440, 20, 1000, 1);
gain_gui = hslider("gain[style:knob][unit:dB]", -16, -32, 0, 1) : ba.db2linear;

// We can pass GUI elements to a function:
process =  synth(square, freq_gui, gain_gui);