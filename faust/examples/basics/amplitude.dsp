import("stdfaust.lib");

// We run the oscillators at 440Hz (A440),
// we multiply its amplitude by 0.25,
// which means we divide its volume by 4:
process = os.oscrc(440) * 0.25;

// Which would be the same as:
process = os.oscrc(440) / 4;