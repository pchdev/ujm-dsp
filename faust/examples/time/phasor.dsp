counter(i, n) = ((_ + i) % n) ~ _;

// We can put a decimal as increment value, 
// and wrap it around 0.0 and 1.0:
process = counter(0.00195, 1.0);

// But it would be much better to 
// use the frequency unit in Hertz,
// We know one second of time is the sample rate,
// so to get the increment value, we can use:
frequency = 440/ma.SR;

process = counter(frequency, 1.0);



