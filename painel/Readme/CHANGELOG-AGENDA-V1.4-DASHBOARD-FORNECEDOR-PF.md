# Agenda v1.4 · Dashboard e Fornecedor PF

## Agenda
- Remove o texto auxiliar abaixo do campo de data.
- Substitui "Gerenciar responsáveis" por um botão central de **Configurações**.
- Configurações agora concentram:
  - cadastro/remoção de responsáveis e cor;
  - cadastro de tipos personalizados da agenda;
  - definição se o tipo exige data ou permite data opcional;
  - análise por responsável quando existe histórico suficiente.
- "Lembrete" deixa de significar obrigatoriamente "sem data":
  - pode ter data e entrar em Hoje/Próximas/Vencidas;
  - pode ficar sem data e entrar em **Sem data**.
- Tipos personalizados também podem ser configurados com data obrigatória ou opcional.
- Validação de data permanece limitada entre 2000 e 2100 no navegador e no serviço.

## Análise por responsável
- Só aparece com no mínimo 6 compromissos concluídos com prazo e pelo menos 14 dias de histórico.
- Itens sem prazo não entram na análise.
- Exibe base avaliada, percentual no prazo, atraso médio e antecedência média.
- A observação é calculada a partir desses dados; responsáveis recém-cadastrados ou sem amostra suficiente não recebem análise.

## Dashboard
- A Agenda ganhou um painel próprio, separado de "Atenção necessária".
- O painel tem o mesmo peso visual do bloco de atenção e mostra até 3 compromissos por página.
- Exibe responsável, cor cadastrada, tempo restante/tempo de atraso, tipo e título.
- Prioriza vencidas, hoje, próximas até 2 dias, itens sem data e depois demais próximas.

## Fornecedor pessoa física
- Corrige a regra visual que estava sendo sobrescrita pelas configurações gerais.
- Pessoa física não exibe/solicita campos empresariais:
  - Nome fantasia;
  - Inscrição estadual/RG;
  - Inscrição municipal;
  - Pessoa de contato;
  - Website;
  - consulta de CNPJ.
- O documento passa a ser identificado somente como **CPF**, com máscara/limite de CPF e validação exclusiva de CPF.
- O backend também limpa campos empresariais em cadastros PF para evitar dados indevidos mesmo fora da interface.
