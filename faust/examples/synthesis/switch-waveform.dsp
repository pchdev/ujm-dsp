import("stdfaust.lib");

sine(freq) = os.osci(freq);
triangle(freq) = os.triangle(freq);
sawtooth(freq) = os.sawtooth(freq);
square(freq) = os.square(freq);

oscillator(freq) = sine(freq), triangle(freq), sawtooth(freq), square(freq);

switch_gui  = nentry(
    "waveform[style:menu{'Sine':0; 'Triangle':1; 'Sawtooth':2; 'Square':3}]",
    0, 0, 3, 1
);

switch(freq) = oscillator(freq) : ba.selectn(4, switch_gui);
 
freq_gui = nentry("frequency[unit:Hz]", 440, 20, 1000, 1);
gain_gui = hslider("gain[style:knob][unit:dB]", -16, -32, 0, 1) : ba.db2linear;

synth(freq, gain) = switch(freq) * gain : fi.lowpass(1, freq);

process =  synth(freq_gui, gain_gui);