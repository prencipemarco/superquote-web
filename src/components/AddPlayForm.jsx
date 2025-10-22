import React, { useState, useEffect } from 'react';
import './AddPlayForm.css';

const AddPlayForm = ({ 
  onAddPlay, 
  onUpdatePlay, 
  editingPlay, 
  onCancelEdit,
  onAnalysis, // Prop rinominato
  predictionResult 
}) => {
  const initialState = {
    data: new Date().toISOString().split('T')[0],
    risultato: '',
    quota: '',
    importo: '',
    vincita: 0,
    esito: 'In attesa'
  };
  const [formData, setFormData] = useState(initialState);

  useEffect(() => {
    if (editingPlay) {
      setFormData({
        ...editingPlay,
        data: new Date(editingPlay.data).toISOString().split('T')[0]
      });
    } else {
      setFormData(initialState);
    }
    onAnalysis(initialState); // Pulisce la previsione al cambio
  }, [editingPlay]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

    // Calcolo automatico vincita
    if (name === 'quota' || name === 'importo') {
      const quota = parseFloat(name === 'quota' ? value : formData.quota) || 0;
      const importo = parseFloat(name === 'importo' ? value : formData.importo) || 0;
      newFormData.vincita = (quota > 0 && importo > 0) ? (quota * importo) : 0;
    }
    
    // Aggiorna vincita se cambia esito
    if (name === 'esito') {
        const quota = parseFloat(newFormData.quota) || 0;
        const importo = parseFloat(newFormData.importo) || 0;
        newFormData.vincita = (value === 'Vinta' && quota > 0 && importo > 0) ? (quota * importo) : 0;
    }

    setFormData(newFormData);

    // --- ATTIVA L'ANALISI COMPLETA ---
    onAnalysis(newFormData);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.risultato || formData.quota <= 0 || formData.importo <= 0) {
      alert("Per favore, compila Risultato, Quota e Importo.");
      return;
    }
    
    const playData = {
      ...formData,
      quota: parseFloat(formData.quota),
      importo: parseFloat(formData.importo),
      vincita: parseFloat(formData.vincita),
    };

    if (editingPlay) {
      onUpdatePlay(playData);
    } else {
      onAddPlay(playData);
    }
    setFormData(initialState);
  };

  const handleCancel = () => {
    setFormData(initialState);
    onCancelEdit();
  };

  return (
    <div className="add-play-form-container">
      <h3>{editingPlay ? 'Modifica Giocata' : 'Aggiungi Nuova Giocata'}</h3>
      <form onSubmit={handleSubmit} className="add-play-form">
        <div className="form-group span-2">
          <label htmlFor="risultato">Risultato (es. Barcellona MG 1-3)</label>
          <input type="text" id="risultato" name="risultato" value={formData.risultato} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label htmlFor="data">Data</label>
          <input type="date" id="data" name="data" value={formData.data} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label htmlFor="quota">Quota</label>
          <input type="number" step="0.01" min="1" id="quota" name="quota" value={formData.quota} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label htmlFor="importo">Importo (€)</label>
          <input type="number" step="0.01" min="0" id="importo" name="importo" value={formData.importo} onChange={handleChange} required />
        </div>
         <div className="form-group">
          <label htmlFor="esito">Esito</label>
          <select id="esito" name="esito" value={formData.esito} onChange={handleChange}>
            <option value="In attesa">In attesa</option>
            <option value="Vinta">Vinta</option>
            <option value="Persa">Persa</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="vincita">Vincita Potenziale (€)</label>
          <input type="number" id="vincita" name="vincita" value={formData.vincita.toFixed(2)} readOnly />
        </div>
       
        <div className="form-actions span-2">
          <button type="submit" className="button-primary">{editingPlay ? 'Salva Modifiche' : 'Aggiungi Giocata'}</button>
          {editingPlay && (
            <button type="button" onClick={handleCancel} className="button-secondary">Annulla</button>
          )}
        </div>
      </form>
      
      {/* --- BOX DI PREVISIONE (ORA MOSTRA PIÙ RIGHE) --- */}
      {predictionResult && predictionResult.length > 0 && (
        <div className="prediction-box">
          {predictionResult.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddPlayForm;

