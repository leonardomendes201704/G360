import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

/** `/changes/new` — abre a lista com modal de criação */
export function GmudNewRouteRedirect() {
    const navigate = useNavigate();
    useEffect(() => {
        navigate('/changes', { replace: true, state: { openGmudCreate: true } });
    }, [navigate]);
    return null;
}

/** `/changes/:id/edit` — abre a lista com modal de edição (GMUD completa) */
export function GmudEditRouteRedirect() {
    const { id } = useParams();
    const navigate = useNavigate();
    useEffect(() => {
        if (!id) {
            navigate('/changes', { replace: true });
            return;
        }
        navigate('/changes', { replace: true, state: { openGmudEditId: id } });
    }, [navigate, id]);
    return null;
}
