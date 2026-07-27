import Dialog, { type DialogProps } from './Dialog'

type BottomSheetProps = Omit<
  DialogProps,
  'placement'
>

function BottomSheet(props: BottomSheetProps) {
  return <Dialog {...props} placement="bottom" />
}

export default BottomSheet
