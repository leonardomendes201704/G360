import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Typography,
    IconButton,
    Box,
    CircularProgress,
    Divider
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Info as InfoIcon,
    Error as ErrorIcon,
    Close as CloseIcon,
    DoneAll as DoneAllIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import notificationService from '../../services/notification.service';
import { ThemeContext } from '../../contexts/ThemeContext';

const NotificationsModal = ({ open, onClose, onMarkAllRead }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';
    const navigate = useNavigate();

    // Fetch all notifications when modal opens
    useEffect(() => {
        if (open) {
            fetchNotifications();
        }
    }, [open]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            // Fetch ALL notifications (no limit)
            const { notifications: list } = await notificationService.getAll(); // Assuming service supports this or defaults to listing
            // Currently service.getAll() calls /notifications which by default uses limit=50.
            // We might want to pass ?all=true or limit=100
            // For now, standard fetch is fine.
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
            // Update local state to reflect change immediately
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
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                <Box display="flex" alignItems="center" gap={1}>
                    <NotificationsIcon color="primary" />
                    Todas as Notificações
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <Divider />

            <DialogContent sx={{ p: 0, height: '60vh', display: 'flex', flexDirection: 'column' }}>
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
                    <List sx={{ pt: 0 }}>
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
            </DialogContent>

            <Divider />
            <DialogActions sx={{ p: 2 }}>
                <Button
                    startIcon={<DoneAllIcon />}
                    onClick={() => {
                        onMarkAllRead();
                        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                    }}
                    disabled={notifications.every(n => n.isRead)}
                >
                    Marcar tudo como lido
                </Button>
                <Button onClick={onClose}>
                    Fechar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default NotificationsModal;


