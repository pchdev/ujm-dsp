// Function definitions in Faust have the following syntax:
// function(argument1, argument2, ...) = expression;
// Here, we define the function 'add', which takes 2 arguments (or parameters)
// that we call 'a' and 'b'.
// 'a' and 'b' are arbitrary names, we could have used any name we wanted.
add(a, b) = a + b;

// If we want to call (execute) that function, we need to replace a & b by the parameters
// we want to pass to the function. Here, we also store the result into a variable called "addition_result".
addition_result = add(1, 2);

// Under the hood, 'a' and 'b' are replaced by '1' and '2':
add(1, 2) = 1 + 2;

// 'a' and 'b' are only valid inside of the function definition,
// we say that they are local to the scope of the function.
// This also means that they take precedence over any other variable 
// or expression that have the same name in the code:
a = 31;
b = 47;

add(a, b) = a + b;
addition_result = add(1, 2); // result will be 3, not 78!

// On the other hand, if we were to change the name of the arguments of the 'add' function, like so:
a = 31;
b = 47;

// We change the argument names to 'c' and 'd':
add(c, d) = a + b; 
// The result would be 78 this time, 
// because 'a' and 'b' are still the two variables that are added together.

// We can pass anything as a function argument in Faust:
add(a, b) = a + b;

// We call 'add' on two sinewave oscillators with different frequencies,
// this will sum the two signals together:
add(os.osci(440), os.osci(880));

// It also works for GUI elements, like sliders:
slider_a = hslider("slider_a", 5, 0, 10, 1);
slider_b = hslider("slider_b", 5, 0, 5, 1);

add(slider_a, slider_b);

// And... other functions!
// Here we declare the function 'osc_a', that takes on argument called 'freq',
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







