import React, { useState, useEffect } from 'react';
import './AddPlayForm.css';

function AddPlayForm({ onAddPlay, onUpdatePlay, editingPlay, setEditingPlay }) {
    const initialState = {
        data: new Date().toISOString().split('T')[0],
        risultato: '',
        quota: '',
        importo: '',
        esito: 'In attesa',
    };

    const [play, setPlay] = useState(initialState);
    const isEditing = editingPlay !== null;

    useEffect(() => {
        if (isEditing) {
            setPlay({
                ...editingPlay,
                // Assicurati che il formato della data sia yyyy-mm-dd
                data: new Date(editingPlay.data).toISOString().split('T')[0]
            });
        } else {
            setPlay(initialState);
        }
    }, [editingPlay]);


    const handleChange = (e) => {
        const { name, value } = e.target;
        setPlay({ ...play, [name]: value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Calcolo vincita potenziale
        const vincitaPotenziale = parseFloat(play.quota) * parseFloat(play.importo);
        const finalPlay = { 
            ...play,
            quota: parseFloat(play.quota),
            importo: parseFloat(play.importo),
            // La vincita è 0 se persa o in attesa, altrimenti è il calcolo
            vincita: play.esito === 'Vinta' ? vincitaPotenziale : 0
        };

        if (isEditing) {
            onUpdatePlay(finalPlay);
        } else {
            onAddPlay(finalPlay);
        }
        setPlay(initialState); // Resetta il form
    };

    const handleCancel = () => {
        setEditingPlay(null);
        setPlay(initialState);
    }

    return (
        <div className="add-play-form-container">
            <h2>{isEditing ? 'Modifica Giocata' : 'Aggiungi Nuova Giocata'}</h2>
            <form onSubmit={handleSubmit} className="add-play-form">
                <div className="form-grid">
                    <div className="form-group">
                        <label htmlFor="data">Data</label>
                        <input type="date" id="data" name="data" value={play.data} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="risultato">Risultato</label>
                        <input type="text" id="risultato" name="risultato" placeholder="Es. Inter - Milan 1" value={play.risultato} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="quota">Quota</label>
                        <input type="number" step="0.01" min="1" id="quota" name="quota" placeholder="Es. 2.50" value={play.quota} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="importo">Importo (€)</label>
                        <input type="number" step="0.01" min="0" id="importo" name="importo" placeholder="Es. 10" value={play.importo} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="esito">Esito</label>
                        <select id="esito" name="esito" value={play.esito} onChange={handleChange}>
                            <option value="In attesa">In attesa</option>
                            <option value="Vinta">Vinta</option>
                            <option value="Persa">Persa</option>
                            <option value="Rimborsata">Rimborsata</option>
                        </select>
                    </div>
                </div>
                <div className="form-actions">
                    <button type="submit" className="btn-primary">{isEditing ? 'Salva Modifiche' : 'Aggiungi Giocata'}</button>
                    {isEditing && (
                        <button type="button" className="btn-secondary" onClick={handleCancel}>Annulla</button>
                    )}
                </div>
            </form>
        </div>
    );
}

export default AddPlayForm;
