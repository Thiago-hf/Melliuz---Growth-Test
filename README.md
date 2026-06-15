Markdown
# 🚀 Méliuz Growth AI-Native Platform

Uma solução full-stack automatizada e resiliente para ingestão, tratamento e análise financeira profunda de testes A/B de cashback. Esta plataforma foi desenvolvida como parte do processo seletivo para a vaga de **Estágio em Growth AI-Native** no Méliuz.

A aplicação combina o poder determinístico do **Pandas (Python)** para cálculos financeiros exatos com a flexibilidade de grandes modelos de linguagem (**ChatGPT, Claude, Gemini**) para a redação de relatórios analíticos executivos, garantindo decisões de negócio rápidas, seguras e acionáveis.

---

## 🎯 Funcionalidades Principais

* **Ingestão Inteligente (Data Cleansing):** Tratamento automatizado de dados inconsistentes (limpeza de strings monetárias em formato brasileiro `R$`, inversão de pontos/vírgulas e mapeamento dinâmico de colunas variantes).
* **Análise Centrada em Margem Real:** O motor calcula o impacto financeiro real através da **Margem de Contribuição** (`Lucro Líquido = Comissão - Cashback`), blindando o negócio contra falsos positivos focados apenas em volume (GMV).
* **Growth Safety Guard (Trava de Prejuízo):** Algoritmo nativo que deteta cenários onde todas as variantes operam no vermelho. Nesses casos, a plataforma altera automaticamente o status para **Alerta Crítico**, bloqueia sugestões de rollout e emite uma ordem mandatória de interrupção do teste.
* **Integração na Nuvem (Google Sheets API):** Registo automático de cada teste diretamente numa planilha remota usando credenciais seguras de *Service Account*.
* **Relatórios Corporativos em PDF:** Geração dinâmica de um sumário executivo exportável formatado com a identidade visual do Méliuz.

---

## 🛠️ Arquitetura e Tecnologias

A solução foi desenhada seguindo uma arquitetura moderna e desacoplada (API-first):

* **Backend:** FastAPI (Python 3.11+), Uvicorn, Pandas, Gspread, Google Auth, OpenAI SDK, Anthropic SDK, Google GenAI SDK.
* **Frontend:** React (Vite), Tailwind CSS, Lucide React, jsPDF, jsPDF-AutoTable.

---

## 📁 Estrutura do Repositório

```text
├── backend/
│   ├── app.py                  # API Engine principal (FastAPI + Lógica de Growth)
    ├── credentials.json        # Credenciais de teste para API's do Google
│   ├── requirements.txt        # Dependências do ecossistema Python e IAs
│   └── tracking_sheets.csv     # Backup/Mock local do histórico de testes
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Interface do utilizador e gerador de relatórios PDF
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
├── relatorios_gerados/         # PDFs exportados dos datasets de teste (A, B e C)
└── README.md                   # Documentação do projeto
📈 Resultados dos Datasets de Teste (Visão do Analista)
Os relatórios gerados para cada cenário encontram-se salvos na pasta /relatorios_gerados. Abaixo está o sumário executivo focado na tomada de decisão:

1. Parceiro A (Cenário de Alto Risco)
Diagnóstico: Todas as variantes operam com margem de contribuição altamente negativa (Queima de Caixa). O incentivo de cashback superou largamente a comissão recebida.

Decisão: INTERROMPER O TESTE IMEDIATAMENTE. Embora o Grupo 2 apresente o menor prejuízo relativo (Lucro Líquido: R$ -584,54 | Margem: -80.3%), escalar este teste destruiria a eficiência de capital do canal.

2. Parceiro B (Cenário de Escala Saudável)
Diagnóstico: O teste apresentou margens operacionais saudáveis. A variante vencedora maximizou o volume sem comprometer o lucro líquido.

Decisão: Escalar a Variante Vencedora para 100% do tráfego, aproveitando a tração positiva do parceiro com margem controlada.

3. Parceiro C (Cenário de Otimização)
Diagnóstico: Desempenho equilibrado com clara distinção de elasticidade na variante campeã.

Decisão: Avançar com Rollout Completo (100%) da variante de maior Lucro Líquido Real, capturando a máxima eficiência de margem identificada.

🔗 Entregáveis Oficiais (Links)
Planilha de Acompanhamento (Google Sheets): https://docs.google.com/spreadsheets/d/1rS0fgOQDw8C__go5mot1JWlOPdJ7xEH81szL4itRPlI/edit?usp=sharing

Repositório GitHub: https://github.com/Thiago-hf/Melliuz---Growth-Test

### Passo 1: Clonar o Repositório
Abra o terminal na sua máquina e execute o comando abaixo para clonar este repositório:
```bash
git clone [https://github.com/Thiago-hf/Melliuz---Growth-Test.git](https://github.com/Thiago-hf/Melliuz---Growth-Test.git)
cd Melliuz---Growth-Test
Passo 2: Configurar e Rodar o Backend
Navega até a pasta do backend:

Bash
cd backend
Instala as dependências:

Bash
pip install -r requirements.txt
(Opcional) Para ativar a sincronização real com o Google Sheets remoto, coloca o teu ficheiro de Conta de Serviço do Google Cloud com o nome credentials.json nesta pasta. Caso não esteja presente, a API utilizará de forma resiliente o fallback local (tracking_sheets.csv).

Inicia o servidor:

Bash
python app.py
O backend ficará ativo em: http://localhost:8000

Passo 3: Configurar e Rodar o Frontend
Abre uma nova janela do terminal e navega até a pasta do frontend:

Bash
cd ../frontend
Instala os pacotes do Node:

Bash
npm install
Inicia o servidor de desenvolvimento:

Bash
npm run dev
A interface web estará disponível no endereço indicado no terminal

🔒 Nota sobre Segurança e Resiliência (Fallback)
* **Credenciais de Produção vs. Homologação:** O arquivo `credentials.json` incluído na pasta do backend refere-se estritamente a uma Conta de Serviço (*Service Account*) temporária e isolada do Google Cloud Platform, criada única e exclusivamente para viabilizar os testes automáticos desta avaliação técnica, não expondo acessos sensíveis de produção.

Arquitetura Tolerante a Falhas: Se o utilizador não possuir ou não inserir uma chave de API para OpenAI/Claude/Gemini, a plataforma não quebra. O sistema ignora as requisições externas e ativa o motor determinístico proprietário (Méliuz Internal AI), mantendo o processamento dos relatórios operacionais de ponta a ponta.

