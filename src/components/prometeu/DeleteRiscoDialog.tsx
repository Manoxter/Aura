'use client'

// Story 13.2 — DeleteRiscoDialog: confirmação antes de deletar risco
// AC-5: diálogo de confirmação

import { Modal } from '@/components/ui/Modal'

interface DeleteRiscoDialogProps {
    open: boolean
    titulo: string
    onConfirm: () => void
    onCancel: () => void
    isDeleting?: boolean
}

export function DeleteRiscoDialog({
    open,
    titulo,
    onConfirm,
    onCancel,
    isDeleting = false,
}: DeleteRiscoDialogProps) {
    return (
        <Modal
            isOpen={open}
            onClose={onCancel}
            title="Excluir risco"
            maxWidth="max-w-md"
        >
            <p className="text-sm text-slate-300 mb-6">
                Tem certeza que deseja excluir o risco{' '}
                <span className="font-semibold text-slate-100">&ldquo;{titulo}&rdquo;</span>?
                Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
                <button
                    onClick={onCancel}
                    disabled={isDeleting}
                    className="px-4 py-2 text-sm rounded-lg bg-surface-overlay text-slate-300 hover:text-slate-100 hover:bg-surface-raised transition-colors disabled:opacity-50"
                >
                    Cancelar
                </button>
                <button
                    onClick={onConfirm}
                    disabled={isDeleting}
                    className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50"
                >
                    {isDeleting ? 'Excluindo…' : 'Excluir'}
                </button>
            </div>
        </Modal>
    )
}
