import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Typography,
    Box,
    CircularProgress,
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Info as InfoIcon,
    Error as ErrorIcon,
    DoneAll as DoneAllIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import notificationService from '../../services/notification.service';
import { ThemeContext } from '../../contexts/ThemeContext';
import StandardModal from '../common/StandardModal';

const NotificationsModal = ({ open, onClose, onMarkAllRead }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';
    const navigate = useNavigate();

    useEffect(() => {
        if (open) {
            fetchNotifications();
        }
    }, [open]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const { notifications: list } = await notificationService.getAll();
            setNotifications(list);
        } catch (error) {
            console.error("Failed to load notifications", error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error(error);
        }
    };

    const handleNotificationClick = async (notif) => {
        if (!notif) return;
        try {
            if (!notif.isRead) {
                await notificationService.markAsRead(notif.id);
                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
            }
        } catch (error) {
            console.error(error);
        } finally {
            onClose();
            if (notif.link) {
                navigate(notif.link);
            }
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'SUCCESS': return <CheckCircleIcon color="success" />;
            case 'WARNING': return <WarningIcon color="warning" />;
            case 'ERROR': return <ErrorIcon color="error" />;
            default: return <InfoIcon color="info" />;
        }
    };

    return (
        <StandardModal
            open={open}
            onClose={onClose}
            title="Todas as Notificações"
            subtitle="Histórico e leituras"
            icon="notifications"
            size="form"
            loading={loading}
            contentSx={{
                p: 0,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
            }}
            footer={
                <>
                    <Button
                        type="button"
                        startIcon={<DoneAllIcon />}
                        onClick={() => {
                            onMarkAllRead();
                            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                        }}
                        disabled={notifications.every(n => n.isRead)}
                        sx={{ mr: 'auto', textTransform: 'none' }}
                    >
                        Marcar tudo como lido
                    </Button>
                    <Button
                        type="button"
                        onClick={onClose}
                        variant="contained"
                        color="primary"
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        Fechar
                    </Button>
                </>
            }
        >
            <Box
                sx={{
                    height: '60vh',
                    minHeight: 200,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'auto',
                }}
            >
                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
                        <CircularProgress />
                    </Box>
                ) : notifications.length === 0 ? (
                    <Box display="flex" justifyContent="center" alignItems="center" flex={1} flexDirection="column" gap={2} p={4} textAlign="center">
                        <NotificationsIcon sx={{ fontSize: 60, color: 'var(--modal-text-soft)' }} />
                        <Typography color="text.secondary">
                            Nenhuma notificação encontrada.
                        </Typography>
                    </Box>
                ) : (
                    <List sx={{ pt: 0, pb: 0 }}>
                        {notifications.map((notif) => (
                            <ListItem
                                key={notif.id}
                                button
                                onClick={() => handleNotificationClick(notif)}
                                sx={{
                                    bgcolor: notif.isRead ? 'transparent' : (isDark ? 'rgba(59, 130, 246, 0.15)' : '#f0f9ff'),
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    '&:hover': { bgcolor: 'var(--modal-surface-subtle)' }
                                }}
                                secondaryAction={
                                    !notif.isRead && (
                                        <Box width={10} height={10} borderRadius="50%" bgcolor="#3b82f6" />
                                    )
                                }
                            >
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: 'transparent' }}>
                                        {getIcon(notif.type)}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Typography variant="subtitle2" fontWeight={notif.isRead ? 400 : 700}>
                                            {notif.title}
                                        </Typography>
                                    }
                                    secondary={
                                        <Box display="flex" flexDirection="column" gap={0.5}>
                                            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                                                {notif.message}
                                            </Typography>
                                            <Typography variant="caption" color="text.disabled">
                                                {format(new Date(notif.createdAt), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                                            </Typography>
                                        </Box>
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </Box>
        </StandardModal>
    );
};

export default NotificationsModal;
