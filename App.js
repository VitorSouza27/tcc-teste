const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const ejs = require('ejs');
const path = require('path');
const session = require('express-session');
const app = express();
const port = 3000;

// CRIA CONEXÃO COM O BANCO DE DADOS
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aapm'
});

// VERIFICA SE A CONEXÃO FOI REALIZADA COM SUCESSO
db.connect((error) => {
    if (error) {
        console.error('Erro ao conectar ao MySQL:', error);
    } else {
        console.log("Conectado ao MySQL!");
    }
});

// CONFIGURA A SESSÃO DO USUÁRIO
app.use(session({
    secret: 'aapm', // CHAVE SECRETA PARA ASSINAR A SESSÃO
    resave: false, // NÃO REGRAVA A SESSÃO SE NÃO HOUVER MUDANÇAS
    saveUninitialized: true // SALVA UMA NOVA SESSÃO MESMO SE NÃO MODIFICADA
}));

app.use((req, res, next) => {
    res.locals.nome = req.session.nome || 'Usuário'; // Substitua 'Usuário' por um valor padrão ou deixe em branco
    next();
});


// CONFIGURA O BODY-PARSER PARA PROCESSAR FORMULÁRIOS
app.use(bodyParser.urlencoded({ extended: true }));

// DEFINE DIRETÓRIOS DE ARQUIVOS ESTÁTICOS
app.use(express.static('public'));
app.use(express.static('src'));

// CONFIGURA O EJS COMO TEMPLATE ENGINE
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// EXIBE A TELA DE LOGIN
app.get('/', (req, res) => {
    res.render('login');
});
// ROTA PARA EXIBIR A PÁGINA INICIAL
app.get('/pagInicial', (req, res) => {
    if (!req.session.cod_usuario) {
        return res.redirect('/'); // Redireciona para a página de login se não estiver autenticado
    }
    res.render('pagInicial');
});

// ROTA PARA EXIBIR A PÁGINA INICIAL ADMINISTRADOR
app.get('/pagInicialAdm', (req, res) => {
    if (!req.session.cod_usuario) {
        return res.redirect('/'); // Redireciona para a página de login se não estiver autenticado
    }
    res.render('pagInicialAdm'); // Renderiza a página inicial do administrador
});

// ROTA DE LOGIN
app.post("/login", (req, res) => {
    const email = req.body.email;
    const senha = req.body.senha;

    // CONSULTA O BANCO DE DADOS PARA VERIFICAR SE O EMAIL, SENHA E CARGO EXISTEM
    db.query('SELECT cod_usuario, nome, senha, cod_cargo FROM usuario WHERE email = ?', [email], (error, results) => {
        if (error) {
            console.error('Erro ao consultar o banco de dados:', error);
            return res.render('login', { errorMessage: 'Erro ao consultar o banco de dados.' });
        }

        // SE O USUÁRIO FOR ENCONTRADO, VERIFICA A SENHA
        if (results.length > 0) {
            const senhaBD = results[0].senha;
            const cod_usuario = results[0].cod_usuario; // PEGA O cod_usuario DO BANCO
            const nome = results[0].nome; // PEGA O NOME DO USUÁRIO
            const cod_cargo = results[0].cod_cargo; // PEGA O CARGO DO USUÁRIO

            // COMPARA A SENHA DO BANCO COM A ENVIADA PELO USUÁRIO
            if (senhaBD === senha) {
                // ARMAZENA O cod_usuario E O NOME NA SESSÃO
                req.session.cod_usuario = cod_usuario;
                req.session.nome = nome;

                console.log('Senha correta!');

                // REDIRECIONA PARA A PÁGINA DE ALUNO OU ADMINISTRADOR BASEADO NO cod_cargo
                if (cod_cargo === 1) { // SE O CARGO FOR ALUNO (EX: cod_cargo = 1)
                    res.redirect('pagInicial'); // REDIRECIONA PARA A PÁGINA DO ALUNO
                } else if (cod_cargo === 2) { // SE O CARGO FOR ADMINISTRADOR (EX: cod_cargo = 2)
                    res.redirect('pagInicialAdm'); // REDIRECIONA PARA A PÁGINA DO ADMINISTRADOR
                } else {
                    res.render('login', { errorMessage: 'Tipo de usuário inválido!' });
                }
            } else {
                console.log('Senha incorreta!');
                res.render('login', { errorMessage: 'Email ou senha incorretos!' });
            }
        } else {
            console.log('Email não cadastrado!');
            res.render('login', { errorMessage: 'Email ou senha incorretos!' });
        }
    });
});


// MOSTRA OS MATERIAIS DISPONÍVEIS PARA O ALUNO - ALUNO
app.get('/materiaisAluno', (req, res) => {

    // CONSULTA OS MATERIAIS NO BANCO DE DADOS
    db.query('SELECT cod_material, nome_material, descricao_material FROM material', (error, results) => {
        if (error) {
            console.log('Houve um erro ao recuperar os materiais', error);
            res.status(500).send('Erro interno do servidor');
        } else {
            console.log('Materiais recuperados:', results);
            // RENDERIZA A PÁGINA DE MATERIAIS
            res.render('materiaisAluno', { materiais: results });
        }
    });
});

// PESQUISA MATERIAIS NO BANCO DE DADOS - ALUNO
app.get('/pesquisarMaterial', (req, res) => {
    const pesquisa = req.query.pesquisarMaterial;

    // EXECUTA A CONSULTA COM BASE NO TERMO DE PESQUISA
    db.query('SELECT nome_material, cod_material as "cod" FROM material WHERE nome_material LIKE ?', [`%${pesquisa}%`], (error, results) => {
        if (error) {
            console.log('Ocorreu um erro ao realizar o filtro', error);
            res.status(500).send('Erro interno do servidor');
        } else {
            res.render('materiaisAluno', { materiais: results });
        }
    });
});

// MOSTRA OS DETALHES DE UM MATERIAL SELECIONADO - ALUNO
app.get('/verMateriaisAluno', (req, res) => {
    const nomeMaterial = req.query.nomeMaterial; // OBTÉM O NOME DO MATERIAL DA QUERY STRING

    if (!nomeMaterial) {
        return res.status(400).send('Título do Material não fornecido');
    }

    // CONSULTA O BANCO PARA RECUPERAR OS DETALHES DO MATERIAL - ALUNO
    db.query('SELECT * FROM material WHERE nome_material = ?', [nomeMaterial], (error, results) => {
        if (error) {
            console.error('Erro ao consultar o banco de dados:', error);
            return res.status(500).send('Erro interno do servidor');
        }

        if (results.length > 0) {
            res.render('verMateriaisAluno', { material: results[0] });
        } else {
            res.status(404).send('Material não encontrado');
        }
    });
});

// MOSTRA A LISTA DE LIVROS DISPONÍVEIS - ALUNO
app.get('/livrosAluno', (req, res) => {
    // CONSULTA TODOS OS LIVROS NO BANCO DE DADOS
    db.query('SELECT * FROM livro', (error, results) => {
        if (error) {
            console.log('Houve um erro ao recuperar os livros', error);
            res.status(500).send('Erro interno do servidor');
        } else {
            console.log('Página de livros foi acessada');
            res.render('livrosAluno', { livros: results });
        }
    });
});

// PESQUISA LIVROS NO BANCO DE DADOS - ALUNO
app.get('/pesquisarLivro', (req, res) => {
    const pesquisa = req.query.pesquisarLivro;

    // EXECUTA A CONSULTA COM BASE NO TERMO DE PESQUISA
    db.query('SELECT titulo, autor FROM livro WHERE titulo LIKE ?', [`%${pesquisa}%`], (error, results) => {
        if (error) {
            console.log('Ocorreu um erro ao realizar a pesquisa', error);
            res.status(500).send('Erro interno do servidor');
        } else {
            res.render('livrosAluno', { livros: results });
        }
    });
});

// MOSTRA OS DETALHES DE UM LIVRO SELECIONADO - ALUNO
app.get('/verLivroAluno', (req, res) => {
    const tituloLivro = req.query.tituloLivro; // OBTÉM O TÍTULO DO LIVRO DA QUERY STRING

    if (!tituloLivro) {
        return res.status(400).send('Título do livro não fornecido');
    }

    // CONSULTA O BANCO PARA RECUPERAR OS DETALHES DO LIVRO 
    db.query('SELECT * FROM livro WHERE titulo = ?', [tituloLivro], (error, results) => {
        if (error) {
            console.error('Erro ao consultar o banco de dados:', error);
            return res.status(500).send('Erro interno do servidor');
        }

        if (results.length > 0) {
            res.render('verLivroAluno', { livro: results[0] });
        } else {
            res.status(404).send('Livro não encontrado');
        }
    });
});

// MOSTRA A LISTA DE OCORRÊNCIAS PARA O ALUNO
app.get('/ocorrenciasAluno', (req, res) => {
    // CONSULTA AS OCORRÊNCIAS NO BANCO DE DADOS
    db.query('SELECT o.cod_ocorrencia, o.data_ocorrencia, o.detalhes_ocorrencia, e.nome_eletrodomestico FROM ocorrencia o JOIN eletrodomestico e ON o.cod_eletrodomestico = e.cod_eletrodomestico',
        (error, results) => {
            if (error) {
                console.error('Erro ao consultar o banco de dados:', error);
                return res.status(500).send('Erro interno do servidor');
            } else {
                console.log('Página de Ocorrências foi acessada');
                return res.render('ocorrenciasAluno', { ocorrencias: results });
            }
        });
});

// PESQUISA OCORRÊNCIAS NO BANCO DE DADOS - ALUNO
app.get('/pesquisarOcorrencia', (req, res) => {
    const pesquisa = req.query.pesquisarOcorrencia;

    // EXECUTA A CONSULTA COM BASE NO TERMO DE PESQUISA
    db.query('SELECT e.nome_eletrodomestico, DATE_FORMAT(o.data_ocorrencia, "%d/%m/%Y") as data_ocorrencia, o.detalhes_ocorrencia, o.cod_usuario FROM ocorrencia o JOIN eletrodomestico e ON o.cod_eletrodomestico = e.cod_eletrodomestico WHERE e.nome_eletrodomestico LIKE ?', [`%${pesquisa}%`], (error, results) => {
        if (error) {
            console.log('Ocorreu um erro ao realizar a pesquisa', error);
            res.status(500).send('Erro interno do servidor');
        } else {
            res.render('ocorrenciasAluno', { ocorrencias: results });
        }
    });
});

// MOSTRA OS DETALHES DE UMA OCORRÊNCIA SELECIONADA - ALUNO
app.get('/verOcorrenciaAluno', (req, res) => {
    const descricao = req.query.descricao;

    // CONSULTA DETALHADA DA OCORRÊNCIA E SEUS RELACIONAMENTOS
    const query = `
    SELECT
        o.cod_ocorrencia,
        e.nome_eletrodomestico,
        o.cod_usuario,
        u.nome as nome_usuario,
        o.data_ocorrencia,
        o.detalhes_ocorrencia,
        o.status_ocorrencia
    FROM
        ocorrencia o
    INNER JOIN
        eletrodomestico e ON o.cod_eletrodomestico = e.cod_eletrodomestico
    INNER JOIN
        usuario u ON o.cod_usuario = u.cod_usuario
    WHERE
        o.detalhes_ocorrencia LIKE ?`;

    db.query(query, [`%${descricao}%`], (error, results) => {
        if (error) {
            console.error('Erro ao recuperar os detalhes da ocorrência:', error);
            res.status(500).send('Erro interno do servidor');
        } else if (results.length > 0) {
            res.render('verOcorrenciaAluno', { ocorrencia: results[0] });
        } else {
            res.status(404).send('Ocorrência não encontrada');
        }
    });
});

// RENDERIZA O FORMULÁRIO PARA ADICIONAR OCORRÊNCIA - ALUNO
app.get('/adicionarOcorrenciaAluno', (req, res) => {
    console.log('Código do Usuário na Sessão:', req.session.cod_usuario);

    // CONSULTA OS ELETRODOMÉSTICOS DISPONÍVEIS PARA ADICIONAR NA OCORRÊNCIA
    db.query('SELECT cod_eletrodomestico, nome_eletrodomestico FROM eletrodomestico', (error, results) => {
        if (error) {
            console.error('Erro ao buscar eletrodomésticos:', error);
            res.status(500).send('Erro interno do servidor');
        } else {
            res.render('adicionarOcorrenciaAluno', {
                cod_usuario: req.session.cod_usuario, // PASSA O cod_usuario PARA O TEMPLATE
                eletrodomesticos: results
            });
        }
    });
});

// INSERE UMA NOVA OCORRÊNCIA NO BANCO DE DADOS - ALUNO
app.post('/inserirOcorrenciasAluno', (req, res) => {
    const cod_eletrodomestico = req.body.cod_eletrodomestico;
    const data_ocorrencia = req.body.data_ocorrencia;
    const detalhes_ocorrencia = req.body.detalhes_ocorrencia;
    const status_ocorrencia = req.body.status_ocorrencia;
    const cod_usuario = req.session.cod_usuario;

    // VERIFICA SE O USUÁRIO ESTÁ AUTENTICADO
    if (!cod_usuario) {
        return res.status(400).send('Usuário não autenticado');
    }


    // INSERE A OCORRÊNCIA NO BANCO DE DADOS - ALUNO
    db.query('INSERT INTO ocorrencia (cod_eletrodomestico, data_ocorrencia, detalhes_ocorrencia, status_ocorrencia, cod_usuario) VALUES (?, ?, ?, ?, ?)',
        [cod_eletrodomestico, data_ocorrencia, detalhes_ocorrencia, status_ocorrencia, cod_usuario], (error, results) => {
            if (error) {
                console.error('Erro ao inserir ocorrência:', error);
                return res.status(500).send('Erro interno do servidor');
            }

            // REDIRECIONA DE VOLTA PARA A PÁGINA DE OCORRÊNCIAS
            res.redirect('/ocorrenciasAluno');
        });
});


// ROTA PARA EXIBIR O FORMULÁRIO DE INDICAÇÃO - ALUNO
app.get('/indicarLivroAluno', (req, res) => {
    console.log('Código do Usuário na Sessão:', req.session.cod_usuario);

    // VERIFICA SE O USUÁRIO ESTÁ LOGADO
    if (!req.session.cod_usuario) {
        return res.redirect('/login'); // REDIRECIONA PARA O LOGIN SE NÃO ESTIVER AUTENTICADO
    }

    res.render('indicarLivroAluno', {
        cod_usuario: req.session.cod_usuario // PASSA O COD_USUARIO PARA A VISUALIZAÇÃO
    });
});

// ROTA PARA INSERIR UMA NOVA INDICAÇÃO - ALUNO
app.post('/inserirIndicacaoAluno', (req, res) => {
    const { titulo, autor, genero, descricao, status_indicacao } = req.body;
    const cod_usuario = req.session.cod_usuario;

    // VERIFICA SE O USUÁRIO ESTÁ AUTENTICADO
    if (!cod_usuario) {
        return res.status(400).send('Usuário não autenticado');
    }

    // INSERE A NOVA INDICAÇÃO NO BANCO DE DADOS
    const query = 'INSERT INTO livro (cod_usuario, titulo, autor, genero, descricao, status_indicacao) VALUES (?, ?, ?, ?, ?, 0)';
    const values = [cod_usuario, titulo, autor, genero, descricao, status_indicacao];

    db.query(query, values, (error, results) => {
        if (error) {
            console.error('Erro ao inserir indicação:', error);
            return res.status(500).send('Erro interno do servidor');
        }

        console.log('Indicação adicionada com sucesso!');
        res.redirect('/livrosAluno'); // REDIRECIONA PARA A PÁGINA DE LIVROS APÓS INSERIR
    });
});



// ADM //////////////////////////////////////

// MOSTRA OS USUARIOS - ADM
app.get('/usuariosAdm', (req, res) => {
    db.query('SELECT * FROM usuario', (error, results) => {
        if (error) {
            console.log('Houve um erro ao recuperar os usuarios', error);
            res.status(500).send('Erro interno do servidor');
        } else {
            console.log('Usuarios recuperados:', results);
            res.render('usuariosAdm', { usuario: results });
        }
    });
});

// PESQUISA DOS USUARIOS
app.get('/pesquisarUsuario', (req, res) => {
    const pesquisa = req.query.pesquisarusuario; // Verifique se o nome do campo no HTML é "pesquisarusuario"

    // EXECUTA A CONSULTA COM BASE NO TERMO DE PESQUISA
    db.query('SELECT cpf, nome, email, data_inscricao FROM usuario WHERE nome LIKE ? OR cpf LIKE ? OR email LIKE ?',
        [`%${pesquisa}%`, `%${pesquisa}%`, `%${pesquisa}%`], (error, results) => {
            if (error) {
                console.log('Ocorreu um erro ao realizar a pesquisa', error);
                res.status(500).send('Erro interno do servidor');
            } else {
                res.render('usuariosAdm', { usuario: results });
            }
        });
});


// MOSTRA OS DETALHES DE UM MATERIAL SELECIONADO - ALUNO
app.get('/verUsuariosAdm', (req, res) => {
    const usuarioCpf = req.query.usuarioCpf; // OBTÉM O NOME DO MATERIAL DA QUERY STRING

    if (!usuarioCpf) {
        return res.status(400).send('Usuario não fornecido');
    }

    // CONSULTA O BANCO PARA RECUPERAR OS DETALHES DO USUÁRIO E O NOME DO CARGO
    db.query(`
    SELECT
        u.*,
        c.nome_cargo
    FROM
        usuario u
    INNER JOIN
        cargo c ON u.cod_cargo = c.cod_cargo
    WHERE
        u.cpf = ?`, [usuarioCpf], (error, results) => {
        if (error) {
            console.error('Erro ao consultar o banco de dados:', error);
            return res.status(500).send('Erro interno do servidor');
        }

        if (results.length > 0) {
            res.render('verUsuariosAdm', { usuario: results[0] });
        } else {
            res.status(404).send('Usuário não encontrado');
        }
    });
});




app.get('/eventosAdm', (req, res) => {
    db.query('SELECT * FROM evento', (error, results) => {
        if (error) {
            console.log('Houve um erro ao recuperar os eventos', error);
            res.status(500).send('Erro interno do servidor');
        } else {
            console.log('Eventos recuperados:', results);
            res.render('eventosAdm', { evento: results });
        }
    });
});


app.get('/eventosAluno', (req, res) => {
    db.query('SELECT * FROM evento', (error, results) => {
        if (error) {
            console.log('Houve um erro ao recuperar os eventos', error);
            res.status(500).send('Erro interno do servidor');
        } else {
            console.log('Eventos recuperados:', results);
            res.render('eventosAluno', { evento: results });
        }
    });
});


// MOSTRA A PÁGINA PARA ADICIONAR EVENTOS - ADM
app.get('/adicionarEventosAdm', (req, res) => {
    // RENDERIZA O FORMULÁRIO PARA ADICIONAR UM NOVO EVENTO
    res.render('adicionarEventosAdm'); 
});



// MOSTRA OS USUARIOS - ADM
app.get('/armariosAdm', (req, res) => {
    db.query('SELECT * FROM armario', (error, results) => {
        if (error) {
            console.log('Houve um erro ao recuperar os usuarios', error);
            res.status(500).send('Erro interno do servidor');
        } else {
            console.log('Armários recuperados:', results);
            res.render('armariosAdm', { armario: results });
        }
    });
});

app.get('/pesquisarArmariosAdm', (req, res) => {
    const numeroArmario = req.query.numeroArmario || '';
    const statusArmario = req.query.statusArmario || '';

    let query = `
    SELECT
        a.cod_armario,
        a.status_armario,
        u.nome AS nome_usuario,
        t.nome_turma,
        p.periodo,
        c.nome_cargo
    FROM
        armario a
    LEFT JOIN
        usuario u ON a.cod_usuario = u.cod_usuario
    LEFT JOIN
        turma t ON u.cod_turma = t.cod_turma
    LEFT JOIN
        periodo p ON t.cod_periodo = p.cod_periodo
    LEFT JOIN
        cargo c ON u.cod_cargo = c.cod_cargo
    WHERE
        a.cod_armario LIKE ? AND a.status_armario LIKE ?`;

    let params = [`%${numeroArmario}%`, `%${statusArmario}%`];

    db.query(query, params, (error, results) => {
        if (error) {
            console.error('Erro ao consultar o banco de dados:', error);
            return res.status(500).send('Erro interno do servidor');
        }

        res.render('armariosAdm', { armario: results });
    });
});

app.get('/verArmariosAdm', (req, res) => {
    const numeroArmario = req.query.numeroArmario; // OBTÉM O NÚMERO DO ARMÁRIO DA QUERY STRING

    if (!numeroArmario) {
        return res.status(400).send('Número do armário não fornecido');
    }

    // CONSULTA O BANCO PARA RECUPERAR OS DETALHES DO ARMÁRIO E DO USUÁRIO, SE OCUPADO
    db.query(`
    SELECT
        a.cod_armario,
        a.status_armario,
        u.nome AS nome_usuario,
        u.cpf AS cpf_usuario,
        t.nome_turma,
        p.periodo,
        c.nome_cargo
    FROM
        armario a
    LEFT JOIN
        usuario u ON a.cod_usuario = u.cod_usuario
    LEFT JOIN
        turma t ON u.cod_turma = t.cod_turma
    LEFT JOIN
        periodo p ON t.cod_periodo = p.cod_periodo
    LEFT JOIN
        cargo c ON u.cod_cargo = c.cod_cargo
    WHERE
        a.cod_armario = ?`, [numeroArmario], (error, results) => {
        if (error) {
            console.error('Erro ao consultar o banco de dados:', error);
            return res.status(500).send('Erro interno do servidor');
        }

        if (results.length > 0) {
            res.render('verArmariosAdm', { armario: results[0] });
        } else {
            res.status(404).send('Armário não encontrado');
        }
    });
});

// MOSTRA OS DETALHES DE UMA INDICAÇÃO DE LIVRO - ADMINISTRADOR
app.get('/verIndicacaoLivroAdm', (req, res) => {
    const codIndicacaoLivro = req.query.tituloLivroIndicacao; // OBTÉM O CODIGO DA INDICAÇÃO DA QUERY STRING

    if (!codIndicacaoLivro) {
        return res.status(400).send('Código da indicação não fornecido');
    }

    // CONSULTA O BANCO PARA RECUPERAR OS DETALHES DA INDICAÇÃO DO LIVRO E O NOME DO USUÁRIO
    const query = `
        SELECT
            il.*,
            u.nome as nome_usuario
        FROM
            indicacao_livro il
        INNER JOIN
            usuario u ON il.cod_usuario = u.cod_usuario
        WHERE
            il.cod_indicacao_livro = ?`;

    db.query(query, [codIndicacaoLivro], (error, results) => {
        if (error) {
            console.error('Erro ao consultar o banco de dados:', error);
            return res.status(500).send('Erro interno do servidor');
        }

        if (results.length > 0) {
            res.render('verIndicacaoLivroAdm', { indicacao_livro: results[0] });
        } else {
            res.status(404).send('Indicação do livro não encontrada');
        }
    });
});
// ROTA DE SAÍDA
app.get('/sair', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Erro ao destruir a sessão:', err);
            res.status(500).send('Erro interno do servidor');
        } else {
            res.redirect('/');
        }
    });
});

app.get('/adicionarEventosAdm', (req, res) => {
    // RENDERIZA O FORMULÁRIO PARA ADICIONAR UM NOVO EVENTO
    res.render('adicionarEventosAdm'); 
});

// MOSTRA A PÁGINA PARA ADICIONAR EVENTOS - ADM
app.get('/indicacoesAdm', (req, res) => {
    // RENDERIZA O FORMULÁRIO PARA ADICIONAR UM NOVO EVENTO
    res.render('indicacoesAdm'); 
});


// MOSTRA OS USUARIOS - ADM
app.get('/indicacoesLivroAdm', (req, res) => {
    db.query('SELECT * FROM indicacao_livro', (error, results) => {
        if (error) {
            console.log('Houve um erro ao recuperar os usuarios', error);
            res.status(500).send('Erro interno do servidor');
        } else {
            console.log('Indicações recuperadas:', results);
            res.render('indicacoesLivrosAdm', { indicacao_livro: results });
        }
    });
});
// INICIALIZA O SERVIDOR NODE.JS
app.listen(port, () => {
    console.log(`Servidor iniciado em http://localhost:${port}`);
});