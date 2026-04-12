import { useState, useEffect, useCallback, useRef } from 'react';
import { startTaskTimer, stopTaskTimer, getActiveTimer } from '../services/task-time.service';

const STORAGE_KEY = 'g360_active_timer';

const useTaskTimer = () => {
    const [activeTimer, setActiveTimer] = useState(null); // { id, taskId, taskTitle, startedAt }
    const [elapsed, setElapsed] = useState(0); // seconds
    const [isRunning, setIsRunning] = useState(false);
    const intervalRef = useRef(null);

    // Calculate elapsed from startedAt
    const calcElapsed = useCallback((startedAt) => {
        return Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    }, []);

    // Start the interval counter
    const startInterval = useCallback((startedAt) => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setElapsed(calcElapsed(startedAt));
        intervalRef.current = setInterval(() => {
            setElapsed(calcElapsed(startedAt));
        }, 1000);
    }, [calcElapsed]);

    // Restore active timer on mount
    useEffect(() => {
        const restore = async () => {
            try {
                const active = await getActiveTimer();
                if (active) {
                    const timerData = {
                        id: active.id,
                        taskId: active.taskId,
                        taskTitle: active.task?.title || 'Tarefa',
                        startedAt: active.startedAt,
                    };
                    setActiveTimer(timerData);
                    setIsRunning(true);
                    startInterval(active.startedAt);
                    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(timerData));
                } else {
                    sessionStorage.removeItem(STORAGE_KEY);
                    setActiveTimer(null);
                    setIsRunning(false);
                }
            } catch (err) {
                console.error('[useTaskTimer] restore error:', err);
            }
        };
        restore();

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [startInterval]);

    // Start timer for a task
    const start = useCallback(async (task) => {
        try {
            const log = await startTaskTimer(task.id);
            const timerData = {
                id: log.id,
                taskId: task.id,
                taskTitle: task.title || log.task?.title || 'Tarefa',
                startedAt: log.startedAt,
            };
            setActiveTimer(timerData);
            setIsRunning(true);
            startInterval(log.startedAt);
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(timerData));
            return log;
        } catch (err) {
            throw err;
        }
    }, [startInterval]);

    // Stop timer
    const stop = useCallback(async (notes = '') => {
        if (!activeTimer) return null;
        try {
            const result = await stopTaskTimer(activeTimer.taskId, notes);
            if (intervalRef.current) clearInterval(intervalRef.current);
            setActiveTimer(null);
            setIsRunning(false);
            setElapsed(0);
            sessionStorage.removeItem(STORAGE_KEY);
            return result;
        } catch (err) {
            throw err;
        }
    }, [activeTimer]);

    // Format elapsed as HH:MM:SS
    const formatElapsed = useCallback((secs = elapsed) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }, [elapsed]);

    return {
        activeTimer,
        elapsed,
        isRunning,
        start,
        stop,
        formatElapsed,
    };
};

export default useTaskTimer;
