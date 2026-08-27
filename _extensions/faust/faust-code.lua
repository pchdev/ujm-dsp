function CodeBlock(block)

  local filename = block.attributes["file"]

  -- Ignore ordinary code blocks
  if not filename then
    return nil
  end

  local file = io.open(filename, "r")

  if not file then
    error("Could not open Faust file: " .. filename)
  end

  local source = file:read("*all")
  file:close()

  -- Remove our custom "file" attribute.
  local attributes = {}

  for key, value in pairs(block.attributes) do
    if key ~= "file" then
      attributes[key] = value
    end
  end

  -- Reconstruct the CodeBlock with the actual source.
  return pandoc.CodeBlock(
    source,
    pandoc.Attr(
      block.identifier,
      block.classes,
      attributes
    )
  )
end
