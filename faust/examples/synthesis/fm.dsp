import("stdfaust.lib");

// We modulate the frequency of an oscillator by another:
minimal_fm(f,m) = os.osci(
    f + f * os.osci(m)
);

process = minimal_fm(440, 20);

// But it's better to use the one in the library:
process = sy.fm((440, 500, 800), (500, 400)) * 0.25 <: _,_;