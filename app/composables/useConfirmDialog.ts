import { AppConfirmDialog } from '#components';

export interface ConfirmDialogOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmColor?: 'error' | 'success' | 'primary' | 'secondary' | 'info' | 'warning' | 'neutral';
}

export function useConfirmDialog() {
  const overlay = useOverlay();

  return (options: ConfirmDialogOptions): Promise<boolean> => {
    const modal = overlay.create(AppConfirmDialog, {
      destroyOnClose: true,
      props: options,
    });

    return modal.open();
  };
}
