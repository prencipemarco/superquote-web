# Documentazione Tecnica - SuperQuote Website

Questa documentazione fornisce una panoramica tecnica dettagliata dei file `.jsx` presenti nel progetto "superquote-website-main". Ogni sezione descrive un componente, le sue responsabilità, lo stato interno, le proprietà (props) e le funzioni principali.

---

## 1. File Principali

### `src/App.jsx`
Questo è il componente principale dell'applicazione (Root Component). Gestisce lo stato globale, il recupero dei dati da Supabase, e l'orchestrazione di tutti i componenti figli.

**Descrizione:**
Funziona da layout principale e gestore della logica di business. Contiene le referenze per la connessione al database, la logica di calcolo per i grafici e le funzioni per le operazioni CRUD sulle giocate.

**Stato (State):**
- `plays`: Array contenente la lista delle giocate recuperate dal DB.
- `totalPlaysCount`: Numero totale delle giocate presenti nel DB.
- `editingPlay`: Oggetto che rappresenta la giocata attualmente in fase di modifica (null se nessuna).
- `filters`: Oggetto contenente i filtri attivi (`count`, `month`, `esito`).
- `lineChartData`: Dati formattati per il grafico a linee dell'andamento.
- `trendColor`: Colore dinamico per la linea del trend (verde per positivo, rosso per negativo).
- `pieChartData`: Dati aggregati per il grafico a torta degli esiti.
- `barChartData`: Dati aggregati per il grafico a barre mensile.

**Funzioni Core:**
- `processDataForCharts(currentPlays)`: Elabora i dati grezzi delle giocate per generare le strutture dati necessarie ai grafici. Calcola il saldo cumulativo, la media mobile esponenziale (EMA) per il trend e aggrega i dati per esito e mese.
- `getTotalPlaysCount()`: Recupera il conteggio totale delle giocate da Supabase.
- `getPlays()`: Recupera le giocate da Supabase applicando i filtri attivi (mese, esito, limite). Richiama `processDataForCharts` dopo il fetch.
- `handleArchiveAndClear()`: Gestisce l'esportazione di tutte le giocate in CSV e la successiva cancellazione dal database (funzione di reset totale).
- `handleAddPlay(play)`: Inserisce una nuova giocata nel DB.
- `handleUpdatePlay(play)`: Aggiorna una giocata esistente nel DB.
- `handleDeletePlay(id)`: Elimina una giocata dal DB.
- `handleImportPlays()`: Gestisce l'importazione massiva di giocate da un file CSV. Include il parsing del file e la validazione dei dati.
- `handleFilterChange(newFilters)`: Aggiorna lo stato dei filtri quando l'utente li modifica.
- `handleEditClick(play)`: Imposta una giocata in modalità modifica e scrolla la pagina al form.

### `src/main.jsx`
Entry point dell'applicazione React.

**Descrizione:**
Si occupa di montare il componente `App` all'interno del DOM (elemento con id `root`). Utilizza `StrictMode` per evidenziare potenziali problemi nel codice.

---

## 2. Componenti (src/components)

### `src/components/Header.jsx`
Barra di navigazione superiore dell'applicazione.

**Descrizione:**
Mostra il titolo dell'app e contiene i pulsanti per le azioni globali: link a Bet365, link al Google Sheet, importazione CSV e archiviazione dati.

**Props:**
- `onImport`: Funzione callback attivata al click su "Importa CSV".
- `onArchive`: Funzione callback attivata al click su "Archivia e Svuota".

### `src/components/StatsDashboard.jsx`
Cruscotto riassuntivo delle statistiche principali.

**Descrizione:**
Visualizza in alto le metriche chiave calcolate in tempo reale basandosi sulle giocate visualizzate.

**Props:**
- `plays`: Array delle giocate attuali.

**Stato/Calcoli (useMemo):**
- Calcola: `totalPlays` (totale giocate), `wins` (vinte), `losses` (perse), `winRate` (percentuale di vittoria), `netProfit` (profitto netto).
- `profitClass`: Determina se il profitto è positivo o negativo per applicare lo stile CSS corrispondente.

### `src/components/PlaysChart.jsx`
Grafico a linee per l'andamento del saldo.

**Descrizione:**
Utilizza la libreria `recharts` per visualizzare l'evoluzione del saldo nel tempo e la linea di tendenza futura.

**Props:**
- `data`: Array di oggetti contenente data, saldo e valore del trend per ogni punto.
- `trendColor`: Stringa colore CSS per la linea del trend.

**Note Tecniche:**
- Se non ci sono dati, mostra un messaggio di placeholder.
- La linea del trend è tratteggiata (`strokeDasharray="5 5"`).

### `src/components/Filters.jsx`
Barra dei filtri per la lista delle giocate.

**Descrizione:**
Permette all'utente di filtrare le giocate per numero (ultime N), per mese e per esito.

**Props:**
- `onFilterChange`: Callback invocata ogni volta che un filtro cambia valore.

**Funzioni Core:**
- `getMonthOptions()`: Genera dinamicamente la lista degli ultimi 12 mesi per il dropdown di selezione mese.
- `useEffect`: Notifica al componente padre (`App`) i cambiamenti dei filtri ogni volta che uno stato locale cambia.

### `src/components/PlaysList.jsx`
Contenitore della lista delle giocate.

**Descrizione:**
Renderizza la tabella (o lista di card su mobile) delle giocate.

**Props:**
- `plays`: Array delle giocate da mostrare.
- `onEdit`: Callback per la modifica di una giocata.
- `onDelete`: Callback per l'eliminazione di una giocata.

**Struttura:**
Itera sull'array `plays` e renderizza un componente `PlayItem` per ogni giocata.

### `src/components/PlayItem.jsx`
Componente che rappresenta la singola giocata nella lista.

**Descrizione:**
Gestisce la visualizzazione dei dettagli della giocata (data, risultato, quota, importo, ecc.) e le interazioni per modifica ed eliminazione. Supporta lo "swipe" su mobile per mostrare le azioni.

**Props:**
- `play`: Oggetto giocata.
- `onEdit`: Callback modifica.
- `onDelete`: Callback eliminazione.

**Funzioni Core:**
- `handleTouchStart`, `handleTouchMove`, `handleTouchEnd`: Gestiscono la logica dello swipe (trascinamento laterale) per dispositivi touch, permettendo di rivelare i pulsanti modifica/elimina.
- `handleCardClick`: Chiude lo swipe se la card viene cliccata mentre è aperta.

### `src/components/AddPlayForm.jsx`
Modulo per l'inserimento e la modifica delle giocate.

**Descrizione:**
Un form controllato che gestisce sia la creazione di nuove giocate che l'aggiornamento di quelle esistenti.

**Props:**
- `onAddPlay`: Callback per salvare una nuova giocata.
- `onUpdatePlay`: Callback per salvare le modifiche a una giocata esistente.
- `editingPlay`: Oggetto giocata se in modalità modifica, altrimenti null.
- `setEditingPlay`: Funzione per resettare la modalità modifica.

**Stato:**
- `play`: Oggetto stato locale che rispecchia i campi del form (data, risultato, quota, importo, esito).

**Funzioni Core:**
- `handleSubmit(e)`: Gestisce l'invio del form. Calcola automaticamente la vincita se l'esito è "Vinta" prima di passare i dati al padre.
- `useEffect`: Popola il form con i dati della giocata se `editingPlay` è presente (modalità modifica).

### `src/components/OutcomePieChart.jsx`
Grafico a torta per la distribuzione degli esiti.

**Descrizione:**
Visualizza la percentuale di giocate Vinte, Perse e In attesa.

**Props:**
- `data`: Array di oggetti con nome esito e valore.

**Configurazione:**
- Utilizza colori specifici definiti nella costante `COLORS`: Verde (Vinta), Rosso (Persa), Arancione (In attesa).

### `src/components/MonthlyBarChart.jsx`
Grafico a barre per l'analisi mensile.

**Descrizione:**
Confronta l'importo scommesso e l'importo vinto per ogni mese.

**Props:**
- `data`: Array di dati aggregati per mese.

**Dettagli:**
- Mostra due barre per ogni mese: una per l'importo giocato (colore rosso/loss) e una per la vincita (colore verde/win).
