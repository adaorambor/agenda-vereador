require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Configurações básicas
if (!process.env.MONGODB_URI || !process.env.SECRET_KEY) {
  console.error('Erro: Variáveis de ambiente não configuradas corretamente');
  process.exit(1);
}

// Middlewares
app.use(express.static('public'));
app.use(express.json());
app.use(express.static('public'));

// Conexão com MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Conectado ao MongoDB Atlas'))
.catch(err => console.error('Erro na conexão:', err));

// Modelo de Evento
const eventSchema = new mongoose.Schema({
  date: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  type: { 
    type: String, 
    required: true,
    enum: ['task', 'visit', 'inspection'],
    default: 'task'
  },
  createdAt: { type: Date, default: Date.now }
});

const Event = mongoose.model('Event', eventSchema);

// Middleware de autenticação básica
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.SECRET_KEY}`) {
    return res.status(403).json({ error: 'Acesso não autorizado' });
  }
  next();
};

// Rotas da API
app.get('/api/events', authenticate, async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ error: 'Parâmetros month e year são obrigatórios' });
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    const events = await Event.find({
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });
    
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events', authenticate, async (req, res) => {
  try {
    const { date, title, description, type } = req.body;
    
    if (!date || !title || !type) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    const newEvent = new Event({
      date,
      title,
      description: description || '',
      type
    });
    
    await newEvent.save();
    res.status(201).json(newEvent);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/events/:id', authenticate, async (req, res) => {
  try {
    const deletedEvent = await Event.findByIdAndDelete(req.params.id);
    
    if (!deletedEvent) {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }
    
    res.json({ message: 'Evento removido com sucesso', deletedEvent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota para o frontend
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Iniciar servidor
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
