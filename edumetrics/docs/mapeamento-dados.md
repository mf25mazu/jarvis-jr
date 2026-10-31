# Mapeamento de Entidades — EduMetrics

Este documento relaciona as entidades do sistema atual (JavaScript + LocalStorage) com as tabelas do schema relacional definido em `schema.sql`.

## Entidades atuais no frontend

| Objeto JS (`DB.*`) | Tabela SQL | Observações |
| --- | --- | --- |
| `DB.escolas` | `schools` | Uma escola por tenant. |
| `DB.usuarios` | `users` | `tipo` atual vira `role` (`SCHOOL`, `TEACHER`, `STUDENT`). |
| `DB.turmas` | `classes` | Inclui `grade_year_id` para agrupar séries/anos. |
| *(novo)* | `grade_years` | Representa os anos/séries (ex: 9º Ano, 1º EM). |
| *(novo)* | `subjects` | Disciplinas normalizadas por escola. |
| `DB.questoes` | `questions` | `disciplina` vira `subject_id`. |
| `DB.listas` | `assignments` | `turmaIds` vira `class_id` e questões em `assignment_questions`. |
| *(novo)* | `assignment_questions` | Ordem das questões em cada lista. |
| `DB.submissoes` | `assignment_sessions` + `submissions` | O frontend guarda a lista toda; no SQL, cada questão vira um `submissions` e a sessão fica em `assignment_sessions`. |

## Campos da resposta (`respostas[*]`)

Cada item do array `respostas` dentro de uma submissão do frontend deve ser normalizado para `submissions`:

| Campo JS | Coluna SQL | Regra |
| --- | --- | --- |
| `questaoId` | `question_id` | FK para `questions`. |
| `tipoConclusao` (`fiz` / `nao_fiz`) | `completion_status` (`FIZ` / `NAO_FIZ`) | Normalização de caixa. |
| `statusAutodeclarado` (`acerto` / `erro`) | `is_correct` (boolean) | `acerto` → `TRUE`, `erro` → `FALSE`. |
| `categoriaErro` | `error_category` | `falta_teoria` → `TEORIA`, `erro_conta` → `CONTA`, `interpretacao` → `INTERPRETACAO`, `falta_atencao` → `ATENCAO`. |
| `dificuldadePercebida` (1–5) | `perceived_difficulty` | Direto. |
| `tempoResposta` (segundos) | `time_spent_seconds` | Direto. |
| `naoFinalizada` | `completion_status = 'NAO_FIZ'` | Quando `TRUE`, ignora acerto/erro. |

## Cálculo de ΔD no SQL

```sql
SELECT
  q.id AS question_id,
  q.expected_difficulty,
  AVG(s.perceived_difficulty) AS avg_perceived_difficulty,
  AVG(s.perceived_difficulty) - q.expected_difficulty AS delta_d
FROM questions q
JOIN submissions s ON s.question_id = q.id
GROUP BY q.id, q.expected_difficulty;
```

## Janelas acumuladas (Rolling Window)

A view `rolling_window_metrics` já calcula:
- Taxa de acertos (`acerto_rate_pct`).
- Taxa de "Não Fiz" (`nao_fiz_rate_pct`).
- Dificuldade percebida média.
- Rótulo de janela (`J3`, `J5`, `J10`).

Para consumir os mesmos dados que o frontend gera hoje em `utils.js`, uma API backend pode:

```sql
SELECT * FROM rolling_window_metrics
WHERE student_id = $1
  AND rn <= 10
ORDER BY rn;
```

## RBAC — Controle de Acesso

A coluna `users.role` define o perfil:

- `SCHOOL` → acesso a tudo dentro da `school_id`.
- `TEACHER` → acesso às turmas vinculadas em `class_teachers`.
- `STUDENT` → acesso apenas aos próprios dados e às listas da turma em `class_students`.

Toda query do backend deve filtrar por `school_id` para garantir isolamento entre escolas.

## Próximos passos sugeridos

1. Criar backend Node.js/Express com endpoints REST mapeando as views atuais.
2. Implementar autenticação JWT + middleware de RBAC.
3. Substituir `DB` no frontend por uma camada de API (`api-client.js`).
4. Migrar dados do LocalStorage para PostgreSQL via script de importação.
