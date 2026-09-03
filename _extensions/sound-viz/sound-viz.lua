local function default(value, fallback)
    if type(value) == "table" then
        return fallback
    end
    return value
end

local function debug_arg(name, value)
    io.stderr:write(
        "[sound-viz] " ..
        name ..
        ": type=" ..
        type(value) ..
        ", value=" ..
        tostring(value) ..
        "\n"
    )
end

-- debug_arg("waveform", kwargs.waveform)
-- debug_arg("sample-rate", kwargs["sample-rate"])

function ripple(args, kwargs, meta)
  -- debug_arg("amplitude", kwargs["amplitude"])
  local amplitude = default(kwargs["amplitude"], "0.75")
  local frequency = default(kwargs["frequency"], "1")
  local speed = default(kwargs["speed"], "100")
  local id = "ripple-" .. tostring(math.random(100000, 999999))
  local html = string.format([[
<div
  class="ripple"
  id="%s"
  data-amplitude="%s"
  data-frequency="%s"
  data-speed="%s">
</div>
]], id, amplitude, frequency, speed)
  return pandoc.RawBlock("html", html)
end

function particles(args, kwargs, meta)
  local amplitude = default(kwargs["amplitude"], "15")
  local frequency = default(kwargs["frequency"], "1")
  local speed = default(kwargs["speed"], "80")
  local id = "particles-" .. tostring(math.random(100000, 999999))
  return pandoc.RawBlock("html", string.format([[
<div
  class="particles"
  id="%s"
  data-amplitude="%s"
  data-frequency="%s"
  data-speed="%s">
</div>
]], id, amplitude, frequency, speed))
end

function waveform(args, kwargs, meta)
  local amplitude = default(kwargs["amplitude"], "25")
  local frequency = default(kwargs["frequency"], "1")
  local waveform = default(kwargs["waveform"], "sine")
  local rate = default(kwargs["srate"], "5")
  local id = "waveform-" .. tostring(math.random(100000, 999999))
  return pandoc.RawBlock("html", string.format([[
<div
  class="waveform"
  id="%s"
  data-amplitude="%s"
  data-frequency="%s"
  data-srate="%s"
  data-waveform="%s">
</div>
]], id, amplitude, frequency, rate, waveform))

end
