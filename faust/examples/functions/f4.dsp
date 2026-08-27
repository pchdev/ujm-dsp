// We can pass anything as a function argument in Faust:
add(a, b) = a + b;

// We call 'add' on two sinewave oscillators 
// with different frequencies.
// This will sum the two signals together:
process = add(os.osci(440), os.osci(880));

// It also works for GUI elements, like sliders:
slider_a = hslider("slider_a", 5, 0, 10, 1);
slider_b = hslider("slider_b", 5, 0, 5, 1);

process = add(slider_a, slider_b);