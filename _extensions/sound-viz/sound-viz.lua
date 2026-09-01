function ripple(args, kwargs, meta)
  local amplitude = kwargs["amplitude"] or "1.0"
  local frequency = kwargs["frequency"] or "2.0"
  local id = "ripple-" .. tostring(math.random(100000, 999999))
  local html = string.format([[
<div
  class="ripple"
  id="%s"
  data-amplitude="%s"
  data-frequency="%s">
</div>
]], id, amplitude, frequency)
  return pandoc.RawBlock("html", html)
end

function particles(args, kwargs, meta)
  local amplitude = kwargs["amplitude"] or "15"
  local frequency = kwargs["frequency"] or "1"
  local speed = kwargs["speed"] or "80"
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
