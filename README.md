# 🎓 Agendador de Bancas

Sistema inteligente de agendamento de defesas acadêmicas com Firebase Firestore em tempo real.

## 🚀 Como rodar localmente

```bash
npm install
npm run dev
```

Acesse: http://localhost:5173

## ☁️ Deploy no Vercel (recomendado)

1. Suba este repositório no GitHub
2. Acesse [vercel.com](https://vercel.com) → login com GitHub
3. Clique em **"Add New Project"** → selecione o repositório
4. Clique em **"Deploy"** ✅

## 🔥 Configurar Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Crie um novo projeto
3. Ative o **Firestore Database** (modo de teste por ora)
4. Vá em **Configurações do projeto → Seus apps → Web App**
5. Copie as credenciais e cole no app ao clicar em "Configurar Firebase"

## 📧 Configurar EmailJS

1. Crie conta em [emailjs.com](https://emailjs.com)
2. Adicione um serviço de e-mail (Gmail, Outlook etc.)
3. Crie um template com as variáveis:
   - `{{to_name}}`, `{{to_email}}`, `{{student_name}}`, `{{banca_title}}`, `{{availability_link}}`, `{{role}}`
4. Cole Service ID, Template ID e Public Key no app

## 🔗 Fluxo de uso

1. **Orientador cria a banca** → preenche dados e membros
2. **Cada membro recebe um link** por e-mail (ex: `https://seu-app.vercel.app?banca=ID&member=ID`)
3. **Membro acessa o link** → preenche disponibilidade → salva no Firebase
4. **Orientador abre a aba Consenso** → vê o heatmap em tempo real
5. **Seleciona o melhor horário** → gera a reunião no Teams

## 🛠️ Tecnologias

- React 18 + Vite 5
- Firebase Firestore (persistência em tempo real)
- EmailJS (envio de e-mails sem backend)
