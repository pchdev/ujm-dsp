import("stdfaust.lib");

// Connect A : B
// A must have the same number of outputs as 
// the number of inputs of B.
process = os.sawtooth(440) : fi.lowpass(1, 440);