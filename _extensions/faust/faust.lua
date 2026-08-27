local function escape_html(s)
  s = s:gsub("&", "&amp;")
  s = s:gsub("<", "&lt;")
  s = s:gsub(">", "&gt;")
  return s
end

function faust(args, kwargs, meta)
  local file = pandoc.utils.stringify(args[1])
  local source = io.open(file, "r")

  if not source then
    error("Could not open Faust file: " .. file)
  end

  local code = source:read("*all")
  source:close()
  local filename = file:match("([^/]+)$")
  local escaped = escape_html(code)
  local html = string.format([[
<div class="faust-example">

<details>
<summary><strong>run</strong></summary>

<div style="font-size: 40%%;">

<faust-editor>
<!--
%s
-->
</faust-editor>

</div>
</details>

</div>
]], escaped)

  return pandoc.RawBlock("html", html)
end
