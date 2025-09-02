#!/bin/bash

# Ensure the ui directory exists
mkdir -p src/components/ui

# List of UI component files
files=(
  accordion.jsx
  alert-dialog.jsx
  alert.jsx
  aspect-ratio.jsx
  avatar.jsx
  badge.jsx
  breadcrumb.jsx
  button.jsx
  calendar.jsx
  card.jsx
  carousel.jsx
  checkbox.jsx
  collapsible.jsx
  command.jsx
  context-menu.jsx
  dialog.jsx
  drawer.jsx
  dropdown-menu.jsx
  form.jsx
  hover-card.jsx
  input-otp.jsx
  input.jsx
  label.jsx
  menubar.jsx
  navigation-menu.jsx
  pagination.jsx
  popover.jsx
  progress.jsx
  radio-group.jsx
  resizable.jsx
  scroll-area.jsx
  select.jsx
  separator.jsx
  sheet.jsx
  skeleton.jsx
  slider.jsx
  sonner.jsx
  switch.jsx
  table.jsx
  tabs.jsx
  textarea.jsx
  toast.jsx
  toaster.jsx
  toggle-group.jsx
  toggle.jsx
  tooltip.jsx
)

# Create each file
for file in "${files[@]}"; do
  touch "src/components/ui/$file"
done

echo "UI component files created successfully under src/components/ui"
