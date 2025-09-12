#!/bin/bash

# Processes icons to ensure they meet the following requirements:
# 1. Each SVG has a viewBox of 16x16
# 2. Each SVG has a <g> element with the icon name as id
# 3. All fill colors are set to currentColor

# Directory containing SVG icons
ICONS_DIR="$(dirname "$0")/../icons"

# Function to standardize an SVG file
standardize_svg() {
  local file="$1"
  local icon_name=$(basename "$file" .svg)
  
  # Create temporary file
  local temp_file=$(mktemp)
  
  # Read SVG content and:
  # 1. Ensure viewBox is 16x16
  # 2. Add <g> with icon name if missing
  # 3. Replace fill colors with currentColor
  # 4. Remove any fill="none" as it should inherit from parent
  # 5. Remove rect elements with white fill that are just backgrounds
  sed -E '
    # Replace or add viewBox
    s/viewBox="[^"]*"/viewBox="0 0 16 16"/g
    # Replace specific color fills with currentColor
    s/fill="#[A-Fa-f0-9]{6}"/fill="currentColor"/g
    s/fill="#[A-Fa-f0-9]{3}"/fill="currentColor"/g
    s/fill="black"/fill="currentColor"/g
    s/fill="white"/fill="currentColor"/g
    s/fill="rgb\([^)]+\)"/fill="currentColor"/g
    # Remove fill="none"
    s/fill="none"//g
    # Remove background rect elements
    /<rect width="16" height="16" fill="white"\/>/d
  ' "$file" > "$temp_file"

  # Check if <g> tag exists
  if ! grep -q "<g.*>" "$temp_file"; then
    # Extract the path/content between <svg> and </svg>
    content=$(sed -n "/<svg/,/<\/svg>/p" "$temp_file" | grep -v "<svg" | grep -v "</svg>")
    
    # Create new SVG with proper grouping
    cat > "$temp_file" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <g id="$icon_name">
    $content
  </g>
</svg>
EOF
  fi

  # Move temporary file back to original
  mv "$temp_file" "$file"
}

# Process all SVG files
for svg in "$ICONS_DIR"/*.svg; do
  # Skip if there's a corresponding -dark.svg file
  if [[ "$svg" =~ -dark\.svg$ || -f "${svg%.svg}-dark.svg" ]]; then
    continue
  fi
  echo "Processing $svg..."
  standardize_svg "$svg"
done

echo "Done standardizing icons!"