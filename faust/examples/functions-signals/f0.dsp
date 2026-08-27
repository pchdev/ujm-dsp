// Example of a constant function,
// it will produce the same output no matter
// how many times it is called:
my_constant_function = 440;

// We define a function 'oscillator'
// which itself calls the 'os.osci' function.
// os.osci computes for each new sample in time
// a new sinewave value.
oscillator = os.osci(440);

// Here, we sum the values of the two 'os.osci'
// functions, sample-by-sample:
mix = os.osci(440) + os.osci(880);