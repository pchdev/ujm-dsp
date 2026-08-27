// And... other functions!
// Here we declare the function 'osc_a', 
// that takes on argument called 'freq',
// which we are going to pass through to the os.osci function.
// And yes 'os.osci' is also a function, which takes one argument (frequency) 
// and produces a sinewave at that frequency. 
osc_a(freq) = os.osci(freq);

// Same here with a sawtooth, the name 'freq' doesn't conflict with the one 
// from osc_a because they're only valid within their own scope:
osc_b(freq) = os.sawtooth(freq);

// We can call them like this:
process = osc_a(440) + osc_b(880);

// And what happens under the hood, if we unroll the function calls, will be this:
osc_a(440) = os.osci(440);
osc_b(880) = os.sawtooth(880);

// We can also do the same thing in function calls:
add(a, b) = a + b;
osc_a(freq) = os.osci(freq);
osc_b(freq) = os.sawtooth(freq);

process = add(osc_a(440), osc_b(880));

// If we unroll the calls, we get this:
osc_a(440) = os.osci(440);
osc_b(880) = os.sawtooth(880);
add(osc_a(440), osc_b(880)) = osc_a(440) + osc_b(880);