// src/controllers/authController.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const authController = {

    // --- CADASTRO (Sign Up) ---
    register: async (req, res) => {
        const { email, password, name } = req.body;

        if (!email || !password) {
            return res.status(400).json({ erro: "E-mail e senha são obrigatórios." });
        }

        try {
            // 1. Cria o usuário no Auth do Supabase
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { name: name || 'Estudante' } // Salva o nome nos metadados
                }
            });

            if (error) throw error;

            // 2. (Opcional) Cria a entrada na tabela 'profiles' para gamificação
            if (data.user) {
                await supabase.from('profiles').insert({
                    id: data.user.id,
                    xp: 0,
                    streak: 0,
                    last_login: new Date().toISOString().split('T')[0]
                });
            }

            res.json({ 
                sucesso: true, 
                msg: "Usuário criado com sucesso! Verifique seu e-mail (se ativado) ou faça login.",
                user: data.user 
            });

        } catch (error) {
            console.error("Erro no cadastro:", error.message);
            res.status(400).json({ erro: error.message });
        }
    },

    // --- LOGIN (Sign In) ---
    login: async (req, res) => {
        const { email, password } = req.body;

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // Retorna o Token e os dados do usuário para o Frontend salvar
            res.json({
                sucesso: true,
                token: data.session.access_token,
                userId: data.user.id,
                name: data.user.user_metadata.name || "Estudante",
                email: data.user.email
            });

        } catch (error) {
            console.error("Erro no login:", error.message);
            res.status(401).json({ erro: "E-mail ou senha incorretos." });
        }
    }
};

module.exports = authController;
