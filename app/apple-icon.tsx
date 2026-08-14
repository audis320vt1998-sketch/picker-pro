import { createPickerProAppIcon } from '@/lib/mobile-install/app-icon'

export const size = {
  height: 180,
  width: 180,
}

export const contentType = 'image/png'

export default function AppleIcon() {
  return createPickerProAppIcon(size.width)
}
