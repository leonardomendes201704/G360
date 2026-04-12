import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowBack, Edit, Delete, Person, Engineering, LocalFireDepartment, CalendarToday, AttachMoney, TrendingDown } from '@mui/icons-material';

const ProjectHeader = ({ project, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const formatDate = (date) => date ? format(new Date(date), 'dd/MM/yyyy') : '--';

  const getStatusClass = (status) => {
    const map = { IN_PROGRESS: 'in-progress', COMPLETED: 'done', PLANNING: 'planning', ON_HOLD: 'paused', CANCELLED: 'late' };
    return map[status] || 'planning';
  };

  return (
    <div className="project-header-section">
      <div className="header-top">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate('/projects')}>
            <ArrowBack />
          </button>
          <div style={{ marginLeft: '16px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', margin: 0 }}>{project.name}</h1>
            <div style={{ fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }}>{project.code}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className={`status-badge ${getStatusClass(project.status)}`}>
            <span className="status-dot"></span>
            {project.status}
          </span>
          <button style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={onEdit}>
            <Edit style={{ fontSize: 16 }} /> Editar
          </button>
          <button style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #fecaca', background: 'white', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={onDelete}>
            <Delete style={{ fontSize: 16 }} /> Excluir
          </button>
        </div>
      </div>

      <div className="header-meta">
        <MetaItem icon={<Person fontSize="small" />} className="manager" label="Gerente" value={project.manager?.name || 'N/A'} />
        <MetaItem icon={<Engineering fontSize="small" />} className="tech" label="Técnico" value={project.members?.find(m => m.role === 'TECH_LEAD')?.user?.name || 'N/A'} />
        <MetaItem icon={<LocalFireDepartment fontSize="small" />} className="priority" label="Prioridade" value={project.priority} />
        <MetaItem icon={<AttachMoney fontSize="small" />} className="budget" label="Orçamento" value={formatCurrency(project.budget)} />
        <MetaItem icon={<TrendingDown fontSize="small" />} className="cost" label="Custo Real" value={formatCurrency(project.actualCost)} />
        <MetaItem icon={<CalendarToday fontSize="small" />} className="date" label="Prazo" value={formatDate(project.endDate)} />
      </div>
    </div>
  );
};

const MetaItem = ({ icon, className, label, value }) => (
  <div className="meta-item">
    <div className={`meta-icon ${className}`}>
      {icon}
    </div>
    <div>
      <div className="meta-label">{label}</div>
      <div className="meta-value">{value}</div>
    </div>
  </div>
);

export default ProjectHeader;