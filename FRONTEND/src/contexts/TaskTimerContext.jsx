import { createContext, useContext } from 'react';
import useTaskTimer from '../hooks/useTaskTimer';

const TaskTimerContext = createContext(null);

export const TaskTimerProvider = ({ children }) => {
    const timer = useTaskTimer();
    return (
        <TaskTimerContext.Provider value={timer}>
            {children}
        </TaskTimerContext.Provider>
    );
};

export const useTaskTimerContext = () => {
    const ctx = useContext(TaskTimerContext);
    if (!ctx) throw new Error('useTaskTimerContext must be used within TaskTimerProvider');
    return ctx;
};

export default TaskTimerContext;
