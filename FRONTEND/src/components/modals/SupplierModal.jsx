import { useEffect, useState } from 'react';
import { Dialog } from '@mui/material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { maskCPF, maskCNPJ, maskPhone, unmask } from '../../utils/masks';
import { validatecpf, validatecnpj } from '../../utils/validators';

// Helper for optional fields
const optionalString = yup.string().transform(value => (value === '' ? null : value)).nullable();

const schema = yup.object({
  name: yup.string().required('Razão Social é obrigatória'),
  tradeName: optionalString,
  documentType: yup.string().oneOf(['CNPJ', 'CPF', 'FOREIGN']).required(),
  document: yup.string().required('Documento é obrigatório')
    .test('is-valid-document', 'Documento inválido', function (value) {
      const { documentType } = this.parent;
      if (documentType === 'FOREIGN') return true;
      if (!value) return false;
      const clean = value.replace(/\D/g, '');
      if (documentType === 'CPF') return validatecpf(clean);
      if (documentType === 'CNPJ') return validatecnpj(clean);
      return true;
    }),
  email: optionalString.email('Email inválido'),
  phone: optionalString,
  contactName: optionalString,
  category: yup.string(),
  status: yup.string().default('ATIVO'),
  rating: yup.number().min(1).max(5).default(5),
  classification: yup.string().default('OUTROS'),
  country: yup.string().default('Brasil'),
  state: optionalString,
  city: optionalString,
  address: optionalString,
  zipCode: optionalString,
  bankName: optionalString,
  bankAgency: optionalString,
  bankAccount: optionalString,
  bankAccountType: optionalString,
  notes: optionalString
}).required();

const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const CATEGORIAS = [
  { value: 'TECNOLOGIA', label: 'Tecnologia' },
  { value: 'SERVICOS', label: 'Serviços' },
  { value: 'INFRAESTRUTURA', label: 'Infraestrutura' },
  { value: 'CONSULTORIA', label: 'Consultoria' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'LOGISTICA', label: 'Logística' },
  { value: 'ERP_NEGOCIOS', label: 'ERP & Negócios' },
  { value: 'INFRA_SEGURANCA', label: 'Infraestrutura e Segurança' },
  { value: 'INFRA_CLOUD', label: 'Infraestrutura e Cloud' },
  { value: 'TELECOM', label: 'Telecom' },
  { value: 'OUTSOURCING', label: 'Outsourcing' }
];

const BANCOS = [
  { code: '001', name: 'Banco do Brasil' },
  { code: '104', name: 'Caixa Econômica Federal' },
  { code: '237', name: 'Bradesco' },
  { code: '341', name: 'Itaú' },
  { code: '033', name: 'Santander' },
  { code: 'OUTROS', name: 'Outro Banco' }
];

const SupplierModal = ({ open, onClose, onSave, supplier = null, loading = false, isViewMode = false }) => {
  const [mounted, setMounted] = useState(false);
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      documentType: 'CNPJ',
      classification: 'OUTROS',
      country: 'Brasil',
      category: 'TECNOLOGIA',
      status: 'ATIVO',
      rating: 5,
      bankName: ''
    }
  });

  const selectedBank = watch('bankName');
  const [customBank, setCustomBank] = useState('');

  const documentType = watch('documentType');
  const selectedCountry = watch('country');
  const selectedState = watch('state');
  const isForeign = documentType === 'FOREIGN';

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (open) {
      if (supplier) {
        let formattedDoc = supplier.document;
        if (supplier.documentType === 'CPF') formattedDoc = maskCPF(supplier.document);
        else if (supplier.documentType === 'CNPJ') formattedDoc = maskCNPJ(supplier.document);

        reset({
          ...supplier,
          country: supplier.country || 'Brasil',
          document: formattedDoc,
          phone: maskPhone(supplier.phone),
          category: supplier.category || 'TECNOLOGIA',
          status: supplier.status || 'ATIVO',
          rating: supplier.rating || 5
        });
      } else {
        reset({
          name: '', tradeName: '', document: '', documentType: 'CNPJ',
          email: '', phone: '', classification: 'OUTROS', contactName: '',
          country: 'Brasil', state: '', city: '', address: '', zipCode: '',
          category: 'TECNOLOGIA', status: 'ATIVO', rating: 5,
          bankName: '', bankAgency: '', bankAccount: '', bankAccountType: '', notes: ''
        });
        setCustomBank('');
        setCities([]);
      }
    }
  }, [open, supplier, reset]);

  // Handle custom bank detection
  useEffect(() => {
    if (open && supplier && supplier.bankName) {
      const isStandardBank = BANCOS.some(b => b.code === supplier.bankName);
      if (!isStandardBank) {
        setValue('bankName', 'OUTROS');
        setCustomBank(supplier.bankName);
      }
    }
  }, [open, supplier, setValue]);

  useEffect(() => {
    if (selectedCountry === 'Brasil' && selectedState) {
      setLoadingCities(true);
      fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedState}/municipios`)
        .then(res => res.json())
        .then(data => {
          const sortedCities = data.sort((a, b) => a.nome.localeCompare(b.nome));
          setCities(sortedCities);
        })
        .catch(err => console.error("Erro ao buscar cidades IBGE:", err))
        .finally(() => setLoadingCities(false));
    } else {
      setCities([]);
    }
  }, [selectedState, selectedCountry]);

  const handleDocumentChange = (e) => {
    if (isForeign) return;
    const { value } = e.target;
    const maskedValue = documentType === 'CPF' ? maskCPF(value) : maskCNPJ(value);
    setValue('document', maskedValue);
  };

  const handlePhoneChange = (e) => {
    const { value } = e.target;
    setValue('phone', maskPhone(value));
  };

  const onSubmit = (data) => {
    if (isViewMode) return;

    const cleanData = {
      ...data,
      document: isForeign ? data.document : unmask(data.document),
      phone: unmask(data.phone),
      rating: parseInt(data.rating) || 5,
      bankName: data.bankName === 'OUTROS' ? customBank : data.bankName
    };
    onSave(cleanData);
  };

  if (!open || !mounted) return null;

  // Dark theme styles
  const inputStyle = {
    background: 'var(--modal-surface)',
    border: '1px solid var(--modal-border)',
    borderRadius: '12px',
    padding: '14px 16px',
    color: 'var(--modal-text)',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    transition: 'all 0.2s ease'
  };

  const labelStyle = {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--modal-text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px'
  };

  const sectionStyle = {
    marginBottom: '32px'
  };

  const sectionTitleStyle = {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--modal-text)',
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--modal-border)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '16px'
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          background: 'var(--modal-gradient)',
          border: '1px solid var(--modal-border)',
          borderRadius: '24px',
          width: '90%',
          maxWidth: '900px',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
      BackdropProps={{
        sx: {
          backdropFilter: 'blur(4px)',
          backgroundColor: 'rgba(0, 0, 0, 0.7)'
        }
      }}
    >
      {/* Header */}
      <div style={{
        padding: '28px 32px',
        borderBottom: '1px solid var(--modal-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px', height: '48px',
            background: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#06b6d4'
          }}>
            <span className="material-icons-round" style={{ fontSize: '24px' }}>store</span>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--modal-text)' }}>
              {isViewMode ? 'Detalhes do Fornecedor' : (supplier ? 'Editar Fornecedor' : 'Novo Fornecedor')}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--modal-text-muted)', marginTop: '4px' }}>
              {isViewMode ? 'Visualização dos dados cadastrais' : 'Cadastre fornecedores e parceiros comerciais'}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: '40px', height: '40px',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            color: 'var(--modal-text-muted)',
            border: '1px solid transparent',
            background: 'transparent'
          }}
        >
          <span className="material-icons-round" style={{ fontSize: '24px' }}>close</span>
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '32px', overflowY: 'auto', maxHeight: 'calc(90vh - 200px)' }}>
        <form id="supplierForm" onSubmit={handleSubmit(onSubmit)}>

          {/* Dados Empresariais */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <span className="material-icons-round" style={{ fontSize: '20px', color: '#06b6d4' }}>business</span>
              Dados Empresariais
            </div>

            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>CNPJ / CPF <span style={{ color: '#f43f5e' }}>*</span></label>
                <input
                  {...register('document')}
                  style={inputStyle}
                  placeholder={documentType === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
                  onChange={isForeign ? undefined : handleDocumentChange}
                  disabled={isViewMode}
                />
                {errors.document && <span style={{ color: '#f43f5e', fontSize: '12px' }}>{errors.document.message}</span>}
              </div>
              <div>
                <label style={labelStyle}>Tipo de Pessoa</label>
                <select {...register('documentType')} style={inputStyle} disabled={isViewMode}
                  onChange={(e) => { register('documentType').onChange(e); setValue('document', ''); }}>
                  <option value="CNPJ">Pessoa Jurídica</option>
                  <option value="CPF">Pessoa Física</option>
                </select>
              </div>
            </div>

            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Razão Social <span style={{ color: '#f43f5e' }}>*</span></label>
                <input {...register('name')} style={inputStyle} placeholder="Razão social completa" disabled={isViewMode} />
                {errors.name && <span style={{ color: '#f43f5e', fontSize: '12px' }}>{errors.name.message}</span>}
              </div>
              <div>
                <label style={labelStyle}>Nome Fantasia</label>
                <input {...register('tradeName')} style={inputStyle} placeholder="Nome comercial" disabled={isViewMode} />
              </div>
            </div>

            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Categoria <span style={{ color: '#f43f5e' }}>*</span></label>
                <select {...register('category')} style={inputStyle} disabled={isViewMode}>
                  <option value="">Selecione a categoria</option>
                  {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Classificação</label>
                <select {...register('classification')} style={inputStyle} disabled={isViewMode}>
                  <option value="OUTROS">Outros</option>
                  <option value="OPERACIONAL">Operacional</option>
                  <option value="ESTRATEGICO">Estratégico</option>
                  <option value="CRITICO">Crítico</option>
                </select>
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <span className="material-icons-round" style={{ fontSize: '20px', color: '#3b82f6' }}>location_on</span>
              Endereço
            </div>

            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>CEP</label>
                <input {...register('zipCode')} style={inputStyle} placeholder="00000-000" disabled={isViewMode} />
              </div>
              <div>
                <label style={labelStyle}>Logradouro</label>
                <input {...register('address')} style={inputStyle} placeholder="Rua, Avenida..." disabled={isViewMode} />
              </div>
            </div>

            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Estado (UF)</label>
                {selectedCountry === 'Brasil' ? (
                  <select {...register('state')} style={inputStyle} disabled={isViewMode}>
                    <option value="">Selecione...</option>
                    {ESTADOS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                ) : (
                  <input {...register('state')} style={inputStyle} disabled={isViewMode} />
                )}
              </div>
              <div>
                <label style={labelStyle}>Cidade {loadingCities && <span style={{ fontSize: '10px', color: '#06b6d4' }}>(Carregando...)</span>}</label>
                {selectedCountry === 'Brasil' ? (
                  <select {...register('city')} style={inputStyle} disabled={isViewMode || !selectedState}>
                    <option value="">Selecione...</option>
                    {cities.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                  </select>
                ) : (
                  <input {...register('city')} style={inputStyle} disabled={isViewMode} />
                )}
              </div>
            </div>
          </div>

          {/* Contato Principal */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <span className="material-icons-round" style={{ fontSize: '20px', color: '#10b981' }}>person</span>
              Contato Principal
            </div>

            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Nome do Contato</label>
                <input {...register('contactName')} style={inputStyle} placeholder="Nome completo" disabled={isViewMode} />
              </div>
              <div>
                <label style={labelStyle}>E-mail</label>
                <input {...register('email')} type="email" style={inputStyle} placeholder="contato@empresa.com.br" disabled={isViewMode} />
                {errors.email && <span style={{ color: '#f43f5e', fontSize: '12px' }}>{errors.email.message}</span>}
              </div>
            </div>

            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Telefone</label>
                <input {...register('phone')} style={inputStyle} placeholder="(00) 00000-0000" onChange={handlePhoneChange} disabled={isViewMode} />
              </div>
              <div>
                <label style={labelStyle}>País</label>
                <select {...register('country')} style={inputStyle} disabled={isViewMode}>
                  <option value="Brasil">Brasil</option>
                  <option value="Outro">Outro / Exterior</option>
                </select>
              </div>
            </div>
          </div>

          {/* Dados Bancários */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <span className="material-icons-round" style={{ fontSize: '20px', color: '#f59e0b' }}>account_balance</span>
              Dados Bancários
            </div>

            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Banco</label>
                <select {...register('bankName')} style={inputStyle} disabled={isViewMode}>
                  <option value="">Selecione o banco</option>
                  {BANCOS.map(b => <option key={b.code} value={b.code}>{b.code === 'OUTROS' ? b.name : `${b.code} - ${b.name}`}</option>)}
                </select>
                {selectedBank === 'OUTROS' && (
                  <input
                    type="text"
                    placeholder="Nome do Banco"
                    value={customBank}
                    onChange={(e) => setCustomBank(e.target.value)}
                    style={{ ...inputStyle, marginTop: '8px' }}
                    disabled={isViewMode}
                  />
                )}
              </div>
              <div>
                <label style={labelStyle}>Tipo de Conta</label>
                <select {...register('bankAccountType')} style={inputStyle} disabled={isViewMode}>
                  <option value="">Selecione o tipo</option>
                  <option value="CORRENTE">Conta Corrente</option>
                  <option value="POUPANCA">Conta Poupança</option>
                </select>
              </div>
            </div>

            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Agência</label>
                <input {...register('bankAgency')} style={inputStyle} placeholder="0000" disabled={isViewMode} />
              </div>
              <div>
                <label style={labelStyle}>Número da Conta</label>
                <input {...register('bankAccount')} style={inputStyle} placeholder="00000-0" disabled={isViewMode} />
              </div>
            </div>
          </div>

          {/* Configurações e Avaliação */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <span className="material-icons-round" style={{ fontSize: '20px', color: '#f43f5e' }}>settings</span>
              Configurações e Avaliação
            </div>

            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Status <span style={{ color: '#f43f5e' }}>*</span></label>
                <select {...register('status')} style={inputStyle} disabled={isViewMode}>
                  <option value="ATIVO">Ativo</option>
                  <option value="PENDENTE">Pendente de Aprovação</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Avaliação</label>
                <select {...register('rating')} style={inputStyle} disabled={isViewMode}>
                  <option value="5">⭐⭐⭐⭐⭐ Excelente</option>
                  <option value="4">⭐⭐⭐⭐ Muito Bom</option>
                  <option value="3">⭐⭐⭐ Bom</option>
                  <option value="2">⭐⭐ Regular</option>
                  <option value="1">⭐ Ruim</option>
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Observações</label>
              <textarea
                {...register('notes')}
                style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
                placeholder="Adicione informações complementares sobre o fornecedor, histórico de parcerias, certificações, etc..."
                disabled={isViewMode}
              />
            </div>
          </div>

        </form>
      </div>

      {/* Footer */}
      <div style={{
        padding: '24px 32px',
        borderTop: '1px solid var(--modal-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div style={{ fontSize: '13px', color: 'var(--modal-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="material-icons-round" style={{ fontSize: '16px' }}>info</span>
          Os campos marcados com * são obrigatórios
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: 'transparent',
              color: 'var(--modal-text-secondary)',
              border: '1px solid var(--modal-border)'
            }}
          >
            {isViewMode ? 'Fechar' : 'Cancelar'}
          </button>
          {!isViewMode && (
            <button
              type="submit"
              form="supplierForm"
              disabled={loading}
              style={{
                padding: '12px 20px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: 'linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)',
                color: 'var(--modal-text)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '18px' }}>save</span>
              {supplier ? 'Salvar Alterações' : 'Salvar Fornecedor'}
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
};

export default SupplierModal;
