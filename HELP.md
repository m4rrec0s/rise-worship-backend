# Esquema de Tabelas Atualizado para Rise Worship

## Visão Geral
A aplicação **Rise Worship** organiza músicas e setlists dentro de **grupos**, com permissões específicas para os usuários. Cada grupo tem um administrador (admin) que gerencia permissões e conteúdo. Na HomePage, o usuário vê apenas os grupos que faz parte, com uma busca por nome de grupo.

## Coleções no Firestore

### 1. Coleção: `grupos`
- **Documento**: ID único do grupo.
- **Campos**:
  ```json
  {
    "nome": string, // Ex.: "Grupo de Louvor Asaph"
    "descricao": string, // Descrição do grupo
    "imagem": string | null, // URL da imagem do grupo
    "criadoPor": string, // UID do usuário que criou o grupo (admin inicial)
    "criadoEm": timestamp, // Data de criação
    "usuarios": [
      {
        "uid": string, // UID do usuário
        "permissao": "visualizar" | "editar" | "admin" // Permissões no grupo
      }
    ]
  }
  ```

### 2. Coleção: `musicas`
- **Documento**: ID único da música.
- **Campos**:
  ```json
  {
    "grupoId": string, // ID do grupo ao qual a música pertence
    "titulo": string, // Título da música
    "letra": string, // Letra da música
    "tom": string, // Tom da música
    "cifra": string | null, // Cifra da música (opcional)
    "autor": string, // Autor da música
    "links": {
      "youtube": string | null,
      "spotify": string | null,
      "outros": string[]
    },
    "thumbnail": string | null, // URL da miniatura
    "categoria": string, // Categoria da música
    "tags": string[], // Tags para busca
    "bpm": number | null, // Batidas por minuto (opcional)
    "criadoPor": string, // UID do usuário que adicionou
    "criadoEm": timestamp, // Data de criação
    "atualizadoEm": timestamp // Data da última atualização
  }
  ```

### 3. Coleção: `setlists`
- **Documento**: ID único da setlist.
- **Campos**:
  ```json
  {
    "grupoId": string, // ID do grupo ao qual a setlist pertence
    "titulo": string, // Ex.: "Culto 10/05/2025"
    "data": timestamp, // Data do culto ou evento
    "musicas": string[], // IDs das músicas na setlist
    "criadoPor": string, // UID do usuário que criou
    "criadoEm": timestamp // Data de criação
  }
  ```

### 4. Coleção: `usuarios`
- **Documento**: UID do usuário (do Firebase Authentication).
- **Campos**:
  ```json
  {
    "nome": string, // Nome do usuário
    "email": string, // Email do usuário
    "grupos": string[], // IDs dos grupos que o usuário faz parte
    "ultimoLogin": timestamp // Data do último login
  }
  ```

### 5. Coleção: `categorias`
- **Documento**: ID único da categoria.
- **Campos**:
  ```json
  {
    "grupoId": string, // ID do grupo ao qual a categoria pertence
    "nome": string, // Nome da categoria
    "descricao": string | null // Descrição da categoria (opcional)
  }
  ```

## Fluxo na Aplicação

### HomePage
- **O que o usuário vê**: Após o login, aparecem os grupos que ele faz parte, exibidos com nome, descrição e imagem. Uma barra de busca permite procurar grupos pelo nome.
- **Como funciona**: 
  - Consulta o documento do usuário na coleção `usuarios` para obter os IDs em `grupos`.
  - Busca os detalhes dos grupos na coleção `grupos` usando esses IDs.
  - A busca por nome usa uma query como `where("nome", ">=", termo)`.

### Dentro de um Grupo
- **O que o usuário vê**: 
  - Músicas e setlists do grupo selecionado.
  - Usuários com permissão "visualizar" só podem ver o conteúdo.
  - Usuários com permissão "editar" podem adicionar, editar ou excluir músicas e setlists.
  - Admins podem gerenciar permissões e adicionar/remover usuários.
- **Como funciona**: 
  - Carrega músicas com `where("grupoId", "==", idDoGrupo)`.
  - Verifica permissões no array `usuarios` do documento do grupo.

### Adicionar Músicas ou Setlists
- **O que o usuário faz**: Usuários com permissão "editar" adicionam músicas ou setlists dentro do grupo.
- **Como funciona**: O `grupoId` é incluído ao salvar o documento na coleção `musicas` ou `setlists`.

### Gerenciar Permissões
- **O que o admin faz**: Altera permissões (visualizar, editar, admin) ou adiciona/remove usuários do grupo.
- **Como funciona**: Atualiza o array `usuarios` no documento do grupo na coleção `grupos`.

## Benefícios
- **Organização**: Músicas e setlists ficam dentro de grupos, evitando desordem na HomePage.
- **Segurança**: Apenas usuários autorizados acessam o conteúdo, com permissões definidas pelo admin.
- **Flexibilidade**: Cada grupo tem suas próprias músicas, setlists e categorias.