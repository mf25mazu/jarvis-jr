// views/login.js

import { Auth } from '../auth.js';
import { Router } from '../router.js';
import { toast } from '../utils.js';

export function renderLogin(container) {
  container.innerHTML = `
  <div class="auth-page">
    <div class="auth-left">
      <div class="auth-logo">EduMetrics</div>
      <p class="auth-tagline">
        Plataforma inteligente de<br>análise educacional por IA.<br><br>
        Metacognição • Lacunas de Aprendizado<br>
        Diagnóstico Automático • Relatórios Avançados
      </p>
      <div style="margin-top:40px;opacity:.7;font-size:.85rem;">
        <p style="margin-bottom:8px;font-weight:700;">Contas Demo:</p>
        <p>🏫 escola@demo.com / 123456</p>
        <p>👩‍🏫 ana@demo.com / 123456</p>
        <p>👩‍🎓 maria@demo.com / 123456</p>
        <p>👨‍🎓 joao@demo.com / 123456</p>
      </div>
    </div>
    <div class="auth-right">
      <div class="auth-form">
        <h2 style="margin-bottom:6px;">Bem-vindo(a) de volta!</h2>
        <p class="text-sm text-2" style="margin-bottom:28px;">Faça login para acessar sua conta.</p>
        <form id="loginForm">
          <div class="form-group">
            <label class="form-label">E-mail</label>
            <input type="email" id="email" class="form-control" placeholder="seu@email.com" required>
          </div>
          <div class="form-group">
            <label class="form-label">Senha</label>
            <div style="position:relative;">
              <input type="password" id="senha" class="form-control" placeholder="••••••••" required style="padding-right:44px;">
              <button type="button" id="toggleSenha" class="btn-ghost" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);padding:4px;">
                <i data-lucide="eye" style="width:16px;height:16px;"></i>
              </button>
            </div>
          </div>
          <div id="loginError" class="alert alert-danger" style="display:none;"></div>
          <button type="submit" class="btn btn-primary btn-full btn-lg" style="margin-top:8px;">
            <i data-lucide="log-in" style="width:16px;height:16px;"></i>
            Entrar
          </button>
        </form>
        <p class="text-sm text-center" style="margin-top:20px;color:var(--text-2);">
          Não tem conta? 
          <a href="#/cadastro" style="color:var(--primary);font-weight:600;">Cadastre-se</a>
        </p>
      </div>
    </div>
  </div>
  `;

  // Liga handlers ANTES de criar ícones, para que falha de CDN/lucide nunca quebre a página
  document.getElementById('toggleSenha').onclick = function () {
    const inp = document.getElementById('senha');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  };

  window.lucide?.createIcons?.();

  document.getElementById('loginForm').onsubmit = async function (e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const errEl = document.getElementById('loginError');

    const res = await Auth.login(email, senha);
    if (!res.ok) {
      errEl.textContent = res.erro;
      errEl.style.display = 'flex';
      return;
    }
    errEl.style.display = 'none';
    toast(`Bem-vindo(a), ${res.usuario.nome.split(' ')[0]}!`, 'success');
    redirecionarUsuario(res.usuario);
  };
}

function redirecionarUsuario(u) {
  const rotas = { escola: '/escola', professor: '/professor', estudante: '/estudante' };
  Router.navigate(rotas[u.tipo] || '/login');
}

export function renderCadastro(container) {
  container.innerHTML = `
  <div class="auth-page">
    <div class="auth-left">
      <div class="auth-logo">EduMetrics</div>
      <p class="auth-tagline">
        Crie sua conta e comece a transformar dados em aprendizado real.
      </p>
    </div>
    <div class="auth-right" style="overflow-y:auto;align-items:flex-start;padding-top:40px;">
      <div class="auth-form">
        <a href="#/login" class="btn btn-ghost btn-sm" style="margin-bottom:16px;">
          <i data-lucide="arrow-left" style="width:14px;height:14px;"></i> Voltar
        </a>
        <h2 style="margin-bottom:6px;">Criar conta</h2>
        <p class="text-sm text-2" style="margin-bottom:24px;">Selecione seu perfil e preencha os dados.</p>

        <div class="tabs" style="margin-bottom:24px;">
          <button class="tab active" data-tipo="escola">🏫 Escola</button>
          <button class="tab" data-tipo="professor">👩‍🏫 Professor</button>
          <button class="tab" data-tipo="estudante">👩‍🎓 Estudante</button>
        </div>

        <form id="cadastroForm">
          <div class="form-group">
            <label class="form-label">Nome completo / Escola</label>
            <input type="text" id="c-nome" class="form-control" placeholder="Nome completo" required>
          </div>
          <div class="form-group">
            <label class="form-label">E-mail</label>
            <input type="email" id="c-email" class="form-control" placeholder="seu@email.com" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Senha</label>
              <input type="password" id="c-senha" class="form-control" placeholder="••••••••" required minlength="6">
            </div>
            <div class="form-group">
              <label class="form-label">Confirmar senha</label>
              <input type="password" id="c-senha2" class="form-control" placeholder="••••••••" required>
            </div>
          </div>
          <div id="campo-cnpj" class="form-group">
            <label class="form-label">CNPJ (opcional)</label>
            <input type="text" id="c-cnpj" class="form-control" placeholder="00.000.000/0001-00">
          </div>
          <div id="campo-escola" class="form-group hidden">
            <label class="form-label">Código da escola</label>
            <input type="text" id="c-escolaId" class="form-control" placeholder="ID fornecido pela escola">
            <span class="form-hint">Solicite à secretaria escolar.</span>
          </div>
          <div id="campo-turma" class="form-group hidden">
            <label class="form-label">Código da turma (opcional)</label>
            <input type="text" id="c-turmaId" class="form-control" placeholder="ID da turma">
          </div>
          <div id="cadastroError" class="alert alert-danger" style="display:none;"></div>
          <button type="submit" class="btn btn-primary btn-full btn-lg" style="margin-top:8px;">
            <i data-lucide="user-plus" style="width:16px;height:16px;"></i>
            Criar conta
          </button>
        </form>
        <p class="text-sm text-center" style="margin-top:16px;color:var(--text-2);">
          Já tem conta? <a href="#/login" style="color:var(--primary);font-weight:600;">Entrar</a>
        </p>
      </div>
    </div>
  </div>
  `;

  let tipoAtual = 'escola';
  document.querySelectorAll('.tab[data-tipo]').forEach(tab => {
    tab.onclick = function () {
      document.querySelectorAll('.tab[data-tipo]').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      tipoAtual = this.dataset.tipo;
      document.getElementById('campo-cnpj').classList.toggle('hidden', tipoAtual !== 'escola');
      document.getElementById('campo-escola').classList.toggle('hidden', tipoAtual === 'escola');
      document.getElementById('campo-turma').classList.toggle('hidden', tipoAtual === 'escola');
    };
  });

  window.lucide?.createIcons?.();

  document.getElementById('cadastroForm').onsubmit = async function (e) {
    e.preventDefault();
    const errEl = document.getElementById('cadastroError');
    const nome = document.getElementById('c-nome').value.trim();
    const email = document.getElementById('c-email').value.trim();
    const senha = document.getElementById('c-senha').value;
    const senha2 = document.getElementById('c-senha2').value;

    if (senha !== senha2) {
      errEl.textContent = 'As senhas não coincidem.';
      errEl.style.display = 'flex';
      return;
    }

    const escolaId = document.getElementById('c-escolaId')?.value?.trim() || null;
    const turmaId = document.getElementById('c-turmaId')?.value?.trim() || null;
    const cnpj = document.getElementById('c-cnpj')?.value?.trim() || '';

    const res = Auth.registrar({
      nome, email, senha, tipo: tipoAtual,
      escolaId, cnpj,
      turmaIds: turmaId ? [turmaId] : [],
    });

    if (!res.ok) {
      errEl.textContent = res.erro;
      errEl.style.display = 'flex';
      return;
    }

    await Auth.login(email, senha);
    toast('Conta criada com sucesso!', 'success');
    Router.navigate(`/${tipoAtual}`);
  };
}
