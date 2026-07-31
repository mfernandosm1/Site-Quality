// Painel Quality ERP v0.12.3 — consulta reutilizável de CNPJ
// Fonte primária: BrasilAPI. O painel consulta pelo servidor para evitar
// dependência direta do navegador e facilitar o reuso em Clientes/Fornecedores.

const ONLY_DIGITS = /\D/g;

function onlyDigits(value = '') {
  return String(value || '').replace(ONLY_DIGITS, '');
}

function clean(value = '') {
  return String(value ?? '').trim();
}

function formatDate(value = '') {
  const text = clean(value);
  if (!text) return '';
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
  if (iso) return iso;
  const br = text.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  return br ? `${br[3]}-${br[2]}-${br[1]}` : '';
}

function joinPhone(ddd = '', number = '') {
  const value = `${onlyDigits(ddd)}${onlyDigits(number)}`;
  return value.length >= 10 ? value : '';
}

export default class CompanyLookupService {
  constructor({ timeoutMs = 10000 } = {}) {
    this.timeoutMs = Math.max(3000, Number(timeoutMs) || 10000);
  }

  async lookupCnpj(cnpjValue = '') {
    const cnpj = onlyDigits(cnpjValue);
    if (cnpj.length !== 14) {
      const error = new Error('Informe um CNPJ com 14 números.');
      error.code = 'INVALID_CNPJ_LENGTH';
      throw error;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Painel-Quality-ERP/0.12.3'
        },
        signal: controller.signal
      });

      let data = {};
      try { data = await response.json(); } catch (_) {}

      if (response.status === 404) {
        const error = new Error('CNPJ não encontrado na base consultada.');
        error.code = 'CNPJ_NOT_FOUND';
        throw error;
      }

      if (!response.ok) {
        const error = new Error(
          clean(data?.message) ||
          clean(data?.name) ||
          'O serviço de consulta de CNPJ está indisponível no momento.'
        );
        error.code = 'CNPJ_LOOKUP_FAILED';
        throw error;
      }

      const primaryCnae = Array.isArray(data?.cnaes_secundarios) ? data.cnaes_secundarios : [];
      const dddPhones = Array.isArray(data?.ddd_telefone_1)
        ? data.ddd_telefone_1
        : [data?.ddd_telefone_1, data?.ddd_telefone_2].filter(Boolean);

      const phone =
        onlyDigits(dddPhones[0] || '') ||
        joinPhone(data?.ddd, data?.telefone) ||
        onlyDigits(data?.telefone);

      return {
        provider: 'BrasilAPI',
        cnpj,
        name: clean(data?.razao_social),
        tradeName: clean(data?.nome_fantasia),
        companyStatus: clean(data?.descricao_situacao_cadastral),
        openingDate: formatDate(data?.data_inicio_atividade),
        legalNature: clean(data?.natureza_juridica),
        companySize: clean(data?.porte),
        primaryCnae: clean(data?.cnae_fiscal_descricao),
        primaryCnaeCode: clean(data?.cnae_fiscal),
        secondaryCnaes: primaryCnae.map(item => ({
          code: clean(item?.codigo),
          description: clean(item?.descricao)
        })).filter(item => item.code || item.description),
        stateRegistration: '',
        email: clean(data?.email).toLowerCase(),
        phone,
        mobile: '',
        zipCode: onlyDigits(data?.cep),
        street: clean([data?.descricao_tipo_de_logradouro, data?.logradouro].filter(Boolean).join(' ')),
        number: clean(data?.numero),
        complement: clean(data?.complemento),
        district: clean(data?.bairro),
        city: clean(data?.municipio),
        state: clean(data?.uf).toUpperCase().slice(0, 2)
      };
    } catch (error) {
      if (error?.name === 'AbortError') {
        const timeoutError = new Error('A consulta de CNPJ demorou demais. Tente novamente.');
        timeoutError.code = 'CNPJ_LOOKUP_TIMEOUT';
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
