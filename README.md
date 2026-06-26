# RuneBoard — Simulador e Organizador de Protoboard MB-102

> Desenvolvido por **Rune Projects** 🚀

O **RuneBoard** é uma plataforma interativa e visual projetada para simplificar a prototipagem, o planejamento e a documentação de circuitos eletrônicos baseados na clássica **Protoboard MB-102** e em microcontroladores como o **Arduino Uno R3**.

---

## 🎯 Por que o RuneBoard existe?

No desenvolvimento de hardware DIY, projetos escolares ou prototipagem rápida de IoT, um dos maiores desafios enfrentados por makers, estudantes e engenheiros é a **organização física dos componentes**. À medida que os circuitos ganham complexidade:
1. **O caos de cabos ("ninho de rato")** dificulta o diagnóstico de erros.
2. **Erros de conexão simples** podem causar curto-circuitos e danificar componentes caros permanentemente (como chips e microcontroladores).
3. **Falta de documentação clara** impede que um circuito montado hoje seja replicado com facilidade amanhã.

O **RuneBoard** foi criado pela **Rune Projects** para ser a ponte ideal entre a concepção teórica e a montagem física do seu circuito. Ele funciona como um organizador interativo onde você planeja cada conexão, valida caminhos elétricos e evita curto-circuitos — tudo antes de encostar em um único cabo físico.

---

## 🛠️ Como Funciona?

O funcionamento do RuneBoard é intuitivo e visualmente guiado:

### 1. A Protoboard MB-102 Interativa
O coração do simulador é uma representação vetorizada e dinâmica da protoboard MB-102. 
- Ao interagir com qualquer furo, o sistema destaca visualmente toda a trilha conectada (buses de alimentação positivo/negativo e as colunas verticais de 5 furos).
- Para criar uma conexão (cabo/jumper), basta clicar no furo de origem e, em seguida, no furo de destino.

### 2. Mapeamento Inteligente do Arduino Uno R3
Abaixo da protoboard, o aplicativo apresenta um esquema vetorizado ultra-detalhado do **Arduino Uno R3** com suporte completo a **Zoom** e **Pan**:
- **Zoom & Pan**: Arraste a placa e controle o nível de zoom para focar nas portas que você está configurando no momento.
- **Conexão Direta**: Clique em qualquer socket de pino do Arduino (ex: `5V`, `GND`, `A0`, `13`) e clique em um furo da protoboard para mapeá-lo instantaneamente.
- **Paleta de Cores de Cabos**: Altere a cor do fio diretamente no mapa do Arduino para seguir os padrões clássicos de cores (Preto para GND, Vermelho para VCC, etc.).

### 3. Gerenciador de Cabos e Componentes
O painel lateral direito organiza todo o estado do seu projeto atual:
- **Componentes**: Visualize as conexões ativas de cada pino e mude suas respectivas cores de cabo com rapidez.
- **Cabos**: Veja a listagem detalhada de todos os jumpers esticados na protoboard, com opções de edição e remoção rápida.
- **Detector de Curto-Circuito**: Um algoritmo dedicado analisa as suas conexões em tempo real para alertar sobre ligações perigosas (como ligar VCC diretamente ao GND no mesmo barramento sem carga).

---

## ✨ Principais Recursos

- 🖥️ **Interface Futurista & Clean**: Projetada com um tema dark moderno de alto contraste, otimizando a legibilidade dos pinos e componentes.
- 🔍 **Controle de Zoom e Pan**: Tanto o visualizador da protoboard quanto o esquema do Arduino possuem ferramentas de zoom e arraste para fácil navegação em telas de qualquer tamanho.
- 🎨 **Fios Coloridos Personalizados**: Suporte total a paleta de cores para categorizar cabos de alimentação, sinais analógicos e digitais.
- 💾 **Persistência Completa de Projetos**: Os projetos são salvos automaticamente no navegador (`localStorage`) para que você nunca perca seu trabalho.
- 📤 **Exportação e Importação**: Baixe seus projetos como arquivos JSON locais para compartilhar com seus colegas ou importe esquemas prontos na plataforma.

---

## 💻 Estrutura Técnica

O projeto utiliza um conjunto de tecnologias modernas focadas em alto desempenho visual e reatividade:

- **React 18+ & Vite**: Inicialização rápida e gerenciamento de estado declarativo.
- **TypeScript**: Garante a integridade dos dados de portas, pinos, conexões e circuitos.
- **Tailwind CSS**: Estilização moderna, responsiva e altamente customizável.
- **Motion (framer-motion)**: Animações fluidas de transição entre painéis e interações nos cartões.

---

## 🚀 Como Executar o Projeto Localmente

Siga os passos abaixo para rodar o ambiente de desenvolvimento local do RuneBoard:

1. **Instale as dependências**:
   ```bash
   npm install
   ```

2. **Inicie o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```
   Acesse o aplicativo através do endereço fornecido no seu terminal (geralmente `http://localhost:3000`).

3. **Gere a build de produção**:
   ```bash
   npm run build
   ```

---

## 📄 Licença

Este software é um projeto proprietário concebido e refinado pela **Rune Projects**. Sinta-se à vontade para planejar, aprender e construir coisas incríveis com ele! Só não fale que é seu rsrs.

---

*Criado com carinho por **Rune Projects** — Empoderando o aprendizado prático e a organização de hardware e eletrônica DIY.*
