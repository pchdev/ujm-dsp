import("stdfaust.lib");

sine = os.osci(440) * 0.25;
triangle = os.triangle(440) * 0.25;
sawtooth = os.sawtooth(440) * 0.25;
square = os.square(440) * 0.25;

process =  sine;
// process = triangle;
// process = sawtooth;
// process = square;