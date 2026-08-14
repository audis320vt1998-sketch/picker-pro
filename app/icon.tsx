import { createPickerProAppIcon } from '@/lib/mobile-install/app-icon'

export const size = {
  height: 512,
  width: 512,
}

export const contentType = 'image/png'

export default function Icon() {
  return createPickerProAppIcon(size.width)
}
