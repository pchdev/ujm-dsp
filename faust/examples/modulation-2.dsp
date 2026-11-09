import("stdfaust.lib");

// Envelopes are available with the 'en' prefix:
gate = button("Trigger!");

process = os.osci(440)
        * en.ar(0.5, 0.5, gate)
        * 0.25
       <: _,_;
