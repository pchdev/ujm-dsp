import("stdfaust.lib");

// Connect A : B
// A must have the same number of outputs as 
// the number of inputs of B
saw_filter = os.sawtooth(440) : fi.lowpass(1, 440);

// Connect A <: B
// The number of inputs of B must be a multiple 
// of the number of outputs of A.
process =  saw_filter <: _,_;