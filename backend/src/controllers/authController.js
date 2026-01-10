const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const authController = {
    register: async (req, res) => {
        const { email, password, name } = req.body;
        if (!email || !password) return res.status(400).json({ erro: "Dados incompletos." });

        try {
            const { data, error } = await supabase.auth.signUp({
                email, password, options: { data: { name: name || 'Estudante' } }
            });
            if (error) throw error;

            // Cria perfil
            if (data.user) {
                await supabase.from('profiles').insert({
                    id: data.user.id, xp: 0, streak: 0, last_login: new Date().toISOString().split('T')[0]
                });
            }
            res.json({ sucesso: true, user: data.user });
        } catch (error) {
            res.status(400).json({ erro: error.message });
        }
    },

    login: async (req, res) => {
        const { email, password } = req.body;
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            res.json({
                sucesso: true,
                token: data.session.access_token,
                userId: data.user.id,
                name: data.user.user_metadata.name,
                email: data.user.email
            });
        } catch (error) {
            res.status(401).json({ erro: "Email ou senha inválidos." });
        }
    }
};

module.exports = authController;
