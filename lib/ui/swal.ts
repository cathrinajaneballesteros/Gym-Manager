'use client';

import Swal, { SweetAlertOptions, SweetAlertIcon } from 'sweetalert2';

/**
 * Customized SweetAlert2 instance aligned with the Smart Gym Design System
 */
const AppSwal = Swal.mixin({
  customClass: {
    popup: 'sgfm-swal-popup',
    title: 'sgfm-swal-title',
    htmlContainer: 'sgfm-swal-content',
    confirmButton: 'sgfm-swal-confirm-btn',
    cancelButton: 'sgfm-swal-cancel-btn',
  },
  buttonsStyling: false,
});

export const showAlert = (options: SweetAlertOptions) => {
  return AppSwal.fire({
    background: '#ffffff',
    color: '#1d1d1f',
    confirmButtonColor: '#059669',
    ...options,
  });
};

export const showSuccess = (title: string, text?: string) => {
  return AppSwal.fire({
    icon: 'success',
    titleText: title,
    text,
    confirmButtonText: 'Done',
    confirmButtonColor: '#059669',
  });
};

export const showError = (title: string, text?: string) => {
  return AppSwal.fire({
    icon: 'error',
    titleText: title,
    text,
    confirmButtonText: 'OK',
    confirmButtonColor: '#ef4444',
  });
};

export const showInfo = (title: string, text?: string) => {
  return AppSwal.fire({
    icon: 'info',
    titleText: title,
    text,
    confirmButtonText: 'Understood',
    confirmButtonColor: '#059669',
  });
};

export const showWarning = (title: string, text?: string) => {
  return AppSwal.fire({
    icon: 'warning',
    titleText: title,
    text,
    confirmButtonText: 'OK',
    confirmButtonColor: '#d97706',
  });
};

export const showConfirm = async (
  title: string,
  text?: string,
  confirmButtonText: string = 'Yes, continue',
  confirmButtonColor: string = '#ef4444'
): Promise<boolean> => {
  const result = await AppSwal.fire({
    titleText: title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: 'Cancel',
    confirmButtonColor,
    reverseButtons: true,
  });

  return result.isConfirmed;
};

export const showToast = (title: string, icon: SweetAlertIcon = 'success') => {
  return AppSwal.fire({
    toast: true,
    position: 'top-end',
    icon,
    titleText: title,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });
};

export default AppSwal;
