import("stdfaust.lib");

// Mixing two signals means adding them together,
// which can be done by using the '+' operator
process = (os.oscrc(440) + os.oscrc(880)) * 0.25;

// Here, we used parentheses because of 
// operator precedence.
// Multiplications are always evaluated before 
// additions or substractions.