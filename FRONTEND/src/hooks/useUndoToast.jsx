import { useSnackbar } from 'notistack';
import { useCallback, useRef } from 'react';

/**
 * Hook for delete actions with 5-second undo window.
 *
 * Usage:
 *   const { deleteWithUndo } = useUndoToast();
 *
 *   deleteWithUndo({
 *     message: 'Incidente excluído',
 *     onConfirm: () => apiDeleteIncident(id),
 *     onRefresh: fetchData,
 *   });
 */
export const useUndoToast = () => {
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();
    const timerRef = useRef(null);

    const deleteWithUndo = useCallback(({
        message = 'Item excluído',
        onConfirm,       // async fn — called after 5s if not undone
        onRefresh,       // fn — called after confirm OR undo to refresh UI
        undoMessage = 'Desfeito!',
    }) => {
        // Cancel any pending operation
        if (timerRef.current) clearTimeout(timerRef.current);

        let undone = false;

        const snackKey = enqueueSnackbar(message, {
            variant: 'default',
            autoHideDuration: 5000,
            action: (key) => (
                <button
                    onClick={() => {
                        undone = true;
                        clearTimeout(timerRef.current);
                        closeSnackbar(key);
                        if (onRefresh) onRefresh();
                        enqueueSnackbar(undoMessage, { variant: 'info', autoHideDuration: 2000 });
                    }}
                    style={{
                        background: 'rgba(255,255,255,0.15)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        color: '#fff',
                        padding: '4px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                        marginRight: '8px',
                    }}
                >
                    ↩ Desfazer
                </button>
            ),
        });

        timerRef.current = setTimeout(async () => {
            if (!undone) {
                try {
                    await onConfirm();
                    if (onRefresh) onRefresh();
                } catch (err) {
                    enqueueSnackbar('Erro ao excluir item.', { variant: 'error' });
                    if (onRefresh) onRefresh();
                }
            }
        }, 5000);
    }, [enqueueSnackbar, closeSnackbar]);

    return { deleteWithUndo };
};
